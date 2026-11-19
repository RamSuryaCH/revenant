import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type Tombstone } from "@revenant/engine";
import { createTools, MAX_LISTED, type ScanFn } from "../src/tools.js";
import { confineDir, confineNew, packageSlug, validPackageName } from "../src/safe.js";

const CURSED = resolve(__dirname, "../../../samples/cursed");

const ev = [{ source: "npm" as const, field: "npm.latest.deprecated", value: "use dayjs" }];
const tomb = (name: string, status: Tombstone["status"], vitality: number, recipeId: string | null = null): Tombstone => ({
  name,
  requested: "^1.0.0",
  version: "1.0.0",
  direct: true,
  status,
  vitality,
  epitaphs: [{ kind: status === "living" ? "healthy" : "deprecated", text: `${name} epitaph`, evidence: ev }],
  causeOfDeath: status === "living" ? null : { text: `${name} is deprecated`, evidence: ev },
  successor: status === "living" ? null : { name: "dayjs", reason: "listed in deprecation notice", evidence: ev },
  recipeId,
  repository: null,
  lastPublish: null,
  vulnerabilityIds: [],
  scorecard: null,
});

const fakeScan = (tombstones: Tombstone[]): ScanFn => async (input) => ({
  schemaVersion: SCHEMA_VERSION,
  source: { kind: input.kind === "github" ? "github" : "path", ref: input.kind === "github" ? input.url : "dir" },
  ecosystem: "npm",
  scannedAt: "2026-11-19T00:00:00.000Z",
  tombstones,
  summary: {
    total: tombstones.length,
    dead: tombstones.filter((t) => t.status === "dead").length,
    dying: tombstones.filter((t) => t.status === "dying").length,
    living: tombstones.filter((t) => t.status === "living").length,
    graveyardScore: 50,
  },
  notes: [],
  truncated: false,
  fromCache: false,
});

let base: string;
let root: string;
let outside: string;

beforeAll(async () => {
  base = realpathSync(await mkdtemp(join(tmpdir(), "revenant-mcp-")));
  root = join(base, "ws");
  outside = join(base, "outside");
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "package.json"), '{"dependencies":{"moment":"2.0.0"}}');
  await cp(CURSED, join(root, "app"), { recursive: true, filter: (s) => !s.endsWith("node_modules") });
});
afterAll(() => rm(base, { recursive: true, force: true }));

const make = (tombs: Tombstone[] = [tomb("moment", "dead", 5, "moment-to-dayjs"), tomb("lodash", "living", 90)]) =>
  createTools({ root, scan: fakeScan(tombs), now: () => new Date("2026-11-19T00:00:00Z") });

describe("scan_dependencies", () => {
  it("summarises and lists worst packages first", async () => {
    const r = await make([tomb("a", "dying", 40), tomb("b", "dead", 10), tomb("c", "living", 95)]).scanDependencies({ target: "app" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.graveyard.map((g) => g.name)).toEqual(["b", "a"]);
    expect(r.summary.living).toBe(1);
  });

  it("truncates the list and says so", async () => {
    const many = Array.from({ length: MAX_LISTED + 5 }, (_, i) => tomb(`p${i}`, "dead", i));
    const r = await make(many).scanDependencies({ target: "app" });
    expect(r.ok && r.graveyard.length).toBe(MAX_LISTED);
    expect(r.ok && r.omitted).toBe(5);
    expect(r.ok && r.truncated).toBe(true);
  });

  it("refuses a directory outside the workspace, as data", async () => {
    const r = await make().scanDependencies({ target: outside });
    expect(r).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
  });

  it("refuses ../ traversal", async () => {
    const r = await make().scanDependencies({ target: "../outside" });
    expect(r).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
  });

  it("reports scanner failures as retryable data", async () => {
    const { ScanError } = await import("@revenant/engine");
    const t = createTools({ root, scan: async () => { throw new ScanError("rate limited", "rate-limited"); } });
    expect(await t.scanDependencies({ target: "https://github.com/a/b" })).toMatchObject({ ok: false, error: { code: "scan-failed", retryable: true } });
  });
});

describe("explain_tombstone", () => {
  it("cites evidence after a scan", async () => {
    const t = make();
    await t.scanDependencies({ target: "app" });
    const r = await t.explainTombstone({ package: "moment" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.causeOfDeath?.evidence[0]?.field).toBe("npm.latest.deprecated");
      expect(r.curatedRecipe).toBe("moment-to-dayjs");
    }
  });

  it("asks for a scan when none exists", async () => {
    expect(await make().explainTombstone({ package: "moment" })).toMatchObject({ ok: false, error: { code: "not-found" } });
  });

  it("rejects malformed package names", async () => {
    expect(await make().explainTombstone({ package: "../../etc/passwd" })).toMatchObject({ ok: false, error: { code: "invalid-input" } });
  });
});

describe("plan_resurrection", () => {
  it("writes a real spec into .kiro/specs/resurrect-<pkg>", async () => {
    const t = make();
    await t.scanDependencies({ target: "app" });
    const r = await t.planResurrection({ package: "moment", workspace: "app" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.specDir).toBe(join("app", ".kiro", "specs", "resurrect-moment"));
    const files = await readdir(join(root, r.specDir));
    expect(files).toEqual(expect.arrayContaining(["requirements.md", "design.md", "tasks.md"]));
    expect(await readFile(join(root, r.specDir, "requirements.md"), "utf8")).toMatch(/WHEN|SHALL/);
    expect(r.stats.filesChanged).toBeGreaterThan(0);
  });

  it("will not overwrite unless asked", async () => {
    const t = make();
    expect(await t.planResurrection({ package: "moment", workspace: "app" })).toMatchObject({ ok: false, error: { code: "exists" } });
    expect((await t.planResurrection({ package: "moment", workspace: "app", overwrite: true })).ok).toBe(true);
  });

  it("refuses a workspace outside the root, writing nothing", async () => {
    const r = await make().planResurrection({ package: "moment", workspace: outside });
    expect(r).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
    expect(existsSync(join(outside, ".kiro"))).toBe(false);
  });

  it("refuses a symlink that leads outside", async () => {
    await symlink(outside, join(root, "link"));
    const r = await make().planResurrection({ package: "moment", workspace: "link" });
    expect(r).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
    expect(existsSync(join(outside, ".kiro"))).toBe(false);
  });

  it("refuses a .kiro symlinked outside the workspace", async () => {
    const proj = join(root, "trap");
    await cp(join(root, "app"), proj, { recursive: true, filter: (s) => !s.endsWith(".kiro") });
    await symlink(outside, join(proj, ".kiro"));
    const r = await make().planResurrection({ package: "moment", workspace: "trap" });
    expect(r).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
    expect(existsSync(join(outside, "specs"))).toBe(false);
  });

  it("says when there is no curated recipe", async () => {
    expect(await make().planResurrection({ package: "left-pad", workspace: "app" })).toMatchObject({ ok: false, error: { code: "no-recipe" } });
  });
});

describe("apply_recipe", () => {
  it("returns a patch and never edits sources", async () => {
    const before = await readFile(join(root, "app", "package.json"), "utf8");
    const r = await make().applyRecipe({ package: "request", workspace: "app" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch).toContain("diff --git");
    expect(r.sourceFilesModified).toBe(false);
    expect(await readFile(join(root, "app", "package.json"), "utf8")).toBe(before);
  });

  it("saves the patch only inside the workspace", async () => {
    const r = await make().applyRecipe({ package: "uuid", workspace: "app", savePatch: true });
    expect(r.ok && r.savedTo).toMatch(/^app\/\.revenant\/.+\.patch$/);
    expect(existsSync(join(root, "app", ".revenant"))).toBe(true);
  });

  it("refuses an outside workspace", async () => {
    expect(await make().applyRecipe({ package: "moment", workspace: "../outside" })).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
  });
});

describe("path helpers", () => {
  it("confineNew rejects escapes", () => {
    expect(() => confineNew(root, "..", "x")).toThrow(/escapes/);
    expect(() => confineNew(root, "/etc/passwd")).toThrow(/escapes/);
    expect(confineNew(root, "a", "b")).toBe(join(root, "a", "b"));
  });
  it("confineDir rejects missing and outside dirs", () => {
    expect(() => confineDir(root, "nope")).toThrow(/does not exist/);
    expect(() => confineDir(root, "/")).toThrow(/outside/);
  });
  it("package names", () => {
    expect(packageSlug("@scope/name")).toBe("scope-name");
    for (const bad of ["", "a b", "../x", "A", "x/y", ".hidden"]) expect(() => validPackageName(bad)).toThrow();
  });
});
