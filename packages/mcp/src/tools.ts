import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import {
  classifyInput,
  RECIPES,
  recipeForPackage,
  resurrect,
  scan as engineScan,
  ScanError,
  type ScanInput,
  type ScanOptions,
  type ScanResult,
  type Tombstone,
} from "@revenant/engine";
import { confineDir, confineNew, packageSlug, ToolError, truncate, validPackageName, workspaceRoot } from "./safe.js";
import { readWorkspaceSources } from "./sources.js";

export type ScanFn = (input: ScanInput, options?: ScanOptions) => Promise<ScanResult>;

export interface ToolDeps {
  /** Every file operation stays inside this directory. */
  root: string;
  scan: ScanFn;
  githubToken?: string | undefined;
  now?: () => Date;
}

export const MAX_LISTED = 20;
export const MAX_PATCH_CHARS = 60_000;
export const MAX_TEST_CHARS = 20_000;
const MAX_TRANSITIVE = 20;

export type Failure = { ok: false; error: { code: ToolError["code"]; message: string; retryable: boolean } };

export function toFailure(e: unknown): Failure {
  if (e instanceof ToolError) return { ok: false, error: { code: e.code, message: e.message, retryable: e.retryable } };
  if (e instanceof ScanError) return { ok: false, error: { code: "scan-failed", message: e.message, retryable: e.code === "rate-limited" || e.code === "unreachable" } };
  return { ok: false, error: { code: "internal", message: e instanceof Error ? e.message : String(e), retryable: false } };
}

const shortCause = (t: Tombstone) => t.causeOfDeath?.text ?? t.epitaphs[0]?.text ?? "";

/** Holds the most recent scans so explain_tombstone and plan_resurrection can cite them. */
export function createTools(deps: ToolDeps) {
  const scans = new Map<string, ScanResult>();
  let latest: ScanResult | null = null;
  const now = deps.now ?? (() => new Date());

  const remember = (key: string, r: ScanResult) => {
    scans.set(key, r);
    latest = r;
  };

  async function runScan(target: string, opts: { transitive?: number; includeDev?: boolean }): Promise<ScanResult> {
    const input = classifyInput(target);
    if (input.kind === "package-json") throw new ToolError("invalid-input", "Pass a GitHub URL or a workspace directory, not raw JSON.");
    const resolved: ScanInput = input.kind === "path" ? { kind: "path", path: confineDir(deps.root, input.path) } : input;
    const key = resolved.kind === "path" ? resolved.path : resolved.url;
    const result = await deps.scan(resolved, {
      githubToken: deps.githubToken,
      maxTransitive: Math.min(Math.max(opts.transitive ?? 0, 0), MAX_TRANSITIVE),
      includeDev: opts.includeDev ?? false,
      now: now(),
    });
    remember(key, result);
    remember(target, result);
    return result;
  }

  function findTombstone(pkg: string): Tombstone | null {
    return latest?.tombstones.find((t) => t.name === pkg) ?? null;
  }

  async function scanDependencies(args: { target: string; transitive?: number; includeDev?: boolean }) {
    try {
      const r = await runScan(args.target, args);
      const rank = (t: Tombstone) => (t.status === "dead" ? 0 : t.status === "dying" ? 1 : 2);
      const notLiving = r.tombstones.filter((t) => t.status !== "living").sort((a, b) => rank(a) - rank(b) || a.vitality - b.vitality);
      return {
        ok: true as const,
        source: r.source,
        ecosystem: r.ecosystem,
        scannedAt: r.scannedAt,
        summary: r.summary,
        graveyard: notLiving.slice(0, MAX_LISTED).map((t) => ({
          name: t.name,
          status: t.status,
          vitality: t.vitality,
          direct: t.direct,
          causeOfDeath: shortCause(t),
          successor: t.successor?.name ?? null,
          curatedRecipe: t.recipeId,
        })),
        omitted: Math.max(notLiving.length - MAX_LISTED, 0),
        notes: r.notes,
        truncated: r.truncated || notLiving.length > MAX_LISTED,
        fromCache: r.fromCache,
        next: "Call explain_tombstone for the cited evidence, or plan_resurrection for packages with a curatedRecipe.",
      };
    } catch (e) {
      return toFailure(e);
    }
  }

  async function explainTombstone(args: { package: string; target?: string }) {
    try {
      const name = validPackageName(args.package);
      if (args.target && !scans.has(args.target)) await runScan(args.target, {});
      const t = args.target ? (scans.get(args.target)?.tombstones.find((x) => x.name === name) ?? null) : findTombstone(name);
      if (!t) {
        throw new ToolError(
          "not-found",
          latest || args.target ? `"${name}" is not in the scanned dependencies.` : `No scan yet. Call scan_dependencies first, or pass target.`,
        );
      }
      return {
        ok: true as const,
        package: t.name,
        status: t.status,
        vitality: t.vitality,
        requested: t.requested,
        version: t.version,
        lastPublish: t.lastPublish,
        repository: t.repository,
        causeOfDeath: t.causeOfDeath,
        epitaphs: t.epitaphs,
        successor: t.successor,
        curatedRecipe: t.recipeId,
        vulnerabilityIds: t.vulnerabilityIds.slice(0, 20),
        next: t.recipeId ? `plan_resurrection is available for ${t.name}.` : "No curated recipe: report the evidence and a manual plan instead.",
      };
    } catch (e) {
      return toFailure(e);
    }
  }

  /** Shared by plan and apply: pick the recipe, read the workspace, run the pure engine transform. */
  async function prepare(pkg: string, workspace: string | undefined) {
    const name = validPackageName(pkg);
    const recipe = recipeForPackage(name);
    if (!recipe) {
      throw new ToolError("no-recipe", `No curated recipe for "${name}". Curated: ${Object.values(RECIPES).map((r) => r.package).join(", ")}.`);
    }
    const ws = confineDir(deps.root, workspace);
    const files = await readWorkspaceSources(ws);
    if (!files.some((f) => f.path === "package.json")) throw new ToolError("not-found", `No package.json at the top of ${relative(deps.root, ws) || "."}.`);
    const t = findTombstone(name);
    const evidence = t?.epitaphs.map((e) => `${e.text} (${e.evidence.map((x) => x.field).join(", ")})`) ?? [];
    const r = resurrect({ recipeId: recipe.id, files, fromVersion: t?.version ?? null, evidence, now: now() });
    return { name, ws, r };
  }

  async function planResurrection(args: { package: string; workspace?: string; overwrite?: boolean }) {
    try {
      const { name, ws, r } = await prepare(args.package, args.workspace);
      if (r.stats.filesChanged === 0) throw new ToolError("nothing-to-migrate", r.notes.join(" "));
      const dir = confineNew(ws, ".kiro", "specs", `resurrect-${packageSlug(name)}`);
      const patchName = `${r.spec.slug}.patch`;
      const targets = [
        ["requirements.md", r.spec.requirements],
        ["design.md", r.spec.design],
        ["tasks.md", r.spec.tasks],
        [patchName, r.patch],
      ] as const;
      const paths = targets.map(([f]) => confineNew(ws, ".kiro", "specs", `resurrect-${packageSlug(name)}`, f));
      if (!args.overwrite) {
        const clash = paths.find((p) => existsSync(p));
        if (clash) throw new ToolError("exists", `Refusing to overwrite ${relative(deps.root, clash)}. Pass overwrite: true to replace it.`);
      }
      await mkdir(dir, { recursive: true });
      await Promise.all(targets.map(([, body], i) => writeFile(paths[i]!, body, "utf8")));
      return {
        ok: true as const,
        package: name,
        replacement: r.replacement,
        specDir: relative(deps.root, dir),
        written: paths.map((p) => ({ path: relative(deps.root, p), absolute: p })),
        applyCommand: `git apply ${relative(deps.root, paths[3]!)}`,
        stats: r.stats,
        notes: r.notes,
        next: `Open ${relative(deps.root, dir)}/tasks.md and run the tasks, or call apply_recipe to read the patch.`,
      };
    } catch (e) {
      return toFailure(e);
    }
  }

  async function applyRecipe(args: { package: string; workspace?: string; savePatch?: boolean }) {
    try {
      const { name, ws, r } = await prepare(args.package, args.workspace);
      const patch = truncate(r.patch, MAX_PATCH_CHARS);
      const test = truncate(r.tests.content, MAX_TEST_CHARS);
      let savedTo: string | null = null;
      if (args.savePatch && r.stats.filesChanged > 0 && !patch.truncated) {
        const p = confineNew(ws, ".revenant", `${r.spec.slug}.patch`);
        await mkdir(confineNew(ws, ".revenant"), { recursive: true });
        await writeFile(p, r.patch, "utf8");
        savedTo = relative(deps.root, p);
      }
      return {
        ok: true as const,
        package: name,
        replacement: r.replacement,
        patch: patch.text,
        patchTruncated: patch.truncated,
        files: r.files.map((f) => ({ path: f.path, kind: f.kind })),
        stats: r.stats,
        notes: r.notes,
        savedTo,
        applyCommand: savedTo ? `git apply ${savedTo}` : r.applyCommand,
        tests: { path: r.tests.path, runCommand: r.tests.runCommand, content: test.text, truncated: test.truncated },
        sourceFilesModified: false as const,
      };
    } catch (e) {
      return toFailure(e);
    }
  }

  return { scanDependencies, explainTombstone, planResurrection, applyRecipe };
}

export type Tools = ReturnType<typeof createTools>;

export function defaultDeps(env: NodeJS.ProcessEnv = process.env): ToolDeps {
  return { root: workspaceRoot(env), scan: engineScan, githubToken: env["GITHUB_TOKEN"] };
}
