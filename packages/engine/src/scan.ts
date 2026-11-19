import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { HttpError, getText, pool } from "./http.js";
import { SCHEMA_VERSION, type ScanResult, type Tombstone } from "./schema.js";
import { graveyardScore } from "./scoring.js";
import { fetchBaseFacts, fetchLastCommit, fetchTransitive, osvBatch, type SourceCtx } from "./sources.js";
import { buildTombstone } from "./tombstone.js";

export interface ScanOptions {
  githubToken?: string;
  fetchImpl?: typeof fetch;
  /** Max direct dependencies analysed. */
  maxDirect?: number;
  /** Max transitive dependencies analysed (0 disables). */
  maxTransitive?: number;
  includeDev?: boolean;
  now?: Date;
  /** Called as each tombstone is finished (streaming). */
  onTombstone?: (t: Tombstone) => void;
  onProgress?: (msg: string) => void;
}

export type ScanInput = { kind: "github"; url: string } | { kind: "path"; path: string } | { kind: "package-json"; text: string };

export class ScanError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "rate-limited" | "invalid-manifest" | "unreachable",
  ) {
    super(message);
  }
}

export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?].*)?$/i.exec(input.trim());
  return m ? { owner: m[1]!, repo: m[2]! } : null;
}

export function classifyInput(raw: string): ScanInput {
  const t = raw.trim();
  if (t.startsWith("{")) return { kind: "package-json", text: t };
  if (parseGithubUrl(t)) return { kind: "github", url: t };
  return { kind: "path", path: t };
}

interface Manifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const UNSUPPORTED_FILES: [string, string][] = [
  ["requirements.txt", "PyPI"],
  ["pyproject.toml", "PyPI"],
  ["go.mod", "Go"],
  ["Cargo.toml", "Cargo"],
];

export async function scan(input: ScanInput, o: ScanOptions = {}): Promise<ScanResult> {
  const now = o.now ?? new Date();
  const notes: string[] = [];
  const ctx: SourceCtx = { githubToken: o.githubToken, fetchImpl: o.fetchImpl, note: (m) => !notes.includes(m) && notes.push(m) };
  const progress = o.onProgress ?? (() => {});

  let manifestText: string | null = null;
  let source: ScanResult["source"];
  if (input.kind === "package-json") {
    manifestText = input.text;
    source = { kind: "package-json", ref: "pasted package.json" };
  } else if (input.kind === "path") {
    manifestText = await readFile(input.path.endsWith(".json") ? input.path : join(input.path, "package.json"), "utf8").catch(() => null);
    source = { kind: "path", ref: input.path };
  } else {
    const gh = parseGithubUrl(input.url);
    if (!gh) throw new ScanError("Not a GitHub repository URL.", "not-found");
    source = { kind: "github", ref: `${gh.owner}/${gh.repo}` };
    const base = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/HEAD`;
    try {
      manifestText = await getText(`${base}/package.json`, { fetchImpl: o.fetchImpl, timeoutMs: 8000 });
    } catch (e) {
      throw new ScanError(e instanceof HttpError && e.rateLimited ? "GitHub is rate-limiting us." : "Could not reach GitHub.", e instanceof HttpError && e.rateLimited ? "rate-limited" : "unreachable");
    }
    if (manifestText === null) {
      for (const [file, eco] of UNSUPPORTED_FILES) {
        const hit = await getText(`${base}/${file}`, { fetchImpl: o.fetchImpl, timeoutMs: 6000 }).catch(() => null);
        if (hit !== null) {
          return emptyResult(source, "unsupported", now, [`This looks like a ${eco} project (found ${file}). Revenant reads npm projects today, so there is nothing to scan here yet. ${eco} support is planned, not built.`]);
        }
      }
      throw new ScanError(`Revenant reads npm projects with a package.json at the repository root, and found none in ${gh.owner}/${gh.repo}. Packages inside subfolders of a monorepo are not scanned yet. Try a repository whose root has a package.json.`, "not-found");
    }
  }
  if (manifestText === null) throw new ScanError("package.json not found.", "not-found");

  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestText) as Manifest;
  } catch {
    throw new ScanError("package.json is not valid JSON.", "invalid-manifest");
  }
  const deps = { ...(o.includeDev ? manifest.devDependencies : {}), ...manifest.dependencies };
  const entries = Object.entries(deps).filter(([, v]) => typeof v === "string" && !/^(file|link|workspace|git|github|http)/.test(v));
  const maxDirect = o.maxDirect ?? 40;
  const truncated = entries.length > maxDirect;
  if (truncated) notes.push(`Showing the first ${maxDirect} of ${entries.length} direct dependencies, to keep the scan fast.`);
  const chosen = entries.slice(0, maxDirect);

  progress(`Reading ${chosen.length} dependencies`);
  const tombstones: Tombstone[] = [];
  const emit = (t: Tombstone) => {
    tombstones.push(t);
    o.onTombstone?.(t);
  };

  const baseFacts = await pool(chosen, 8, async ([name, range]) => fetchBaseFacts(name, range, true, ctx));
  const vulns = await osvBatch(baseFacts.map((f) => ({ name: f.name, version: f.version })), ctx);
  baseFacts.forEach((f, i) => (f.vulnIds = vulns[i] ?? []));

  const sourcesDown = baseFacts.length > 0 && baseFacts.every((f) => f.publishedAt === null && f.npmDeprecated === null && f.githubRepo === null);
  if (sourcesDown) throw new ScanError("Public registries are unreachable or rate-limiting us.", "rate-limited");

  await pool(baseFacts, 6, async (f) => {
    let t = buildTombstone(f, now);
    if (t.status !== "living") {
      await fetchLastCommit(f, ctx);
      t = buildTombstone(f, now);
    }
    emit(t);
  });

  const maxT = o.maxTransitive ?? 0;
  if (maxT > 0) {
    progress("Following transitive dependencies");
    const trans = await fetchTransitive(baseFacts.slice(0, 15).map((f) => ({ name: f.name, version: f.version })), ctx);
    const known = new Set(chosen.map(([n]) => n));
    const fresh = trans.filter((t) => !known.has(t.name));
    const tv = await osvBatch(fresh, ctx);
    const ranked = fresh.map((t, i) => ({ ...t, vulns: tv[i] ?? [] })).sort((a, b) => b.vulns.length - a.vulns.length);
    if (ranked.length > maxT) {
      notes.push(`Showing ${maxT} of ${ranked.length} indirect packages, picked by known vulnerabilities.`);
    }
    const picked = ranked.slice(0, maxT);
    await pool(picked, 6, async (p) => {
      const f = await fetchBaseFacts(p.name, p.version, false, ctx, p.version);
      f.vulnIds = p.vulns;
      emit(buildTombstone(f, now));
    });
  }

  return finish(source, "npm", now, tombstones, notes, truncated, false);
}

function emptyResult(source: ScanResult["source"], ecosystem: ScanResult["ecosystem"], now: Date, notes: string[]): ScanResult {
  return finish(source, ecosystem, now, [], notes, false, false);
}

export function finish(source: ScanResult["source"], ecosystem: ScanResult["ecosystem"], now: Date, tombstones: Tombstone[], notes: string[], truncated: boolean, fromCache: boolean): ScanResult {
  const sorted = [...tombstones].sort((a, b) => Number(b.direct) - Number(a.direct) || a.vitality - b.vitality || a.name.localeCompare(b.name));
  const c = (s: Tombstone["status"]) => sorted.filter((t) => t.status === s).length;
  return {
    schemaVersion: SCHEMA_VERSION,
    source,
    ecosystem,
    scannedAt: now.toISOString(),
    tombstones: sorted,
    summary: { total: sorted.length, dead: c("dead"), dying: c("dying"), living: c("living"), graveyardScore: graveyardScore(sorted.filter((t) => t.direct)) },
    notes,
    truncated,
    fromCache,
  };
}
