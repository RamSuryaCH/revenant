import { HttpError, getJson, pool, type FetchOpts } from "./http.js";
import type { PackageFacts } from "./facts.js";

export interface SourceCtx {
  githubToken?: string;
  fetchImpl?: typeof fetch;
  /** Collects human-readable notes (rate limits, timeouts). */
  note: (msg: string) => void;
}

const enc = encodeURIComponent;

function opts(ctx: SourceCtx, extra: FetchOpts = {}): FetchOpts {
  return { fetchImpl: ctx.fetchImpl, ...extra };
}

async function safe<T>(ctx: SourceCtx, label: string, fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError && e.rateLimited) ctx.note(`${label} rate-limited (HTTP ${e.status}); some facts are missing.`);
    else if (e instanceof Error && e.name === "AbortError") ctx.note(`${label} timed out; some facts are missing.`);
    else ctx.note(`${label} unavailable (${e instanceof Error ? e.message : "error"}).`);
    return null;
  }
}

/** Strip range operators to a concrete version when the range pins one. */
export function pinnedVersion(range: string): string | null {
  const m = /^[\^~=v>< ]*(\d+\.\d+\.\d+(?:-[\w.]+)?)/.exec(range.trim());
  return m?.[1] ?? null;
}

export function githubRepoFrom(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[#/?].*)?$/i.exec(url.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

interface NpmDoc {
  version?: string;
  deprecated?: string;
  repository?: { url?: string } | string;
}
interface DepsDevPkg {
  versions?: { versionKey: { version: string }; publishedAt?: string; isDefault?: boolean; isDeprecated?: boolean }[];
}
interface GhRepo {
  archived?: boolean;
  pushed_at?: string;
}
interface GhCommit {
  commit?: { message?: string; committer?: { date?: string } };
}
interface ScorecardRes {
  score?: number;
}
interface DepsDevProject {
  scorecard?: { overallScore?: number };
}

export async function fetchBaseFacts(name: string, requested: string, direct: boolean, ctx: SourceCtx, pinned?: string | null): Promise<PackageFacts> {
  let version = pinned ?? pinnedVersion(requested);
  const [npm, dd] = await Promise.all([
    safe(ctx, "npm registry", () => getJson<NpmDoc>(`https://registry.npmjs.org/${name.replace("/", "%2F")}/${version ?? "latest"}`, opts(ctx))),
    safe(ctx, "deps.dev", () => getJson<DepsDevPkg>(`https://api.deps.dev/v3/systems/npm/packages/${enc(name)}`, opts(ctx, { timeoutMs: 10000 }))),
  ]);
  if (!version && npm?.version) version = npm.version;
  const def = dd?.versions?.find((v) => v.isDefault) ?? null;
  const repoUrl = typeof npm?.repository === "string" ? npm.repository : npm?.repository?.url;
  const githubRepo = githubRepoFrom(repoUrl);

  let archived: boolean | null = null;
  let pushedAt: string | null = null;
  let scorecard: number | null = null;
  let scorecardSource: PackageFacts["scorecardSource"] = "scorecard";
  if (githubRepo) {
    const gh: Record<string, string> = ctx.githubToken ? { authorization: `Bearer ${ctx.githubToken}` } : {};
    const [repo, sc] = await Promise.all([
      safe(ctx, "GitHub API", () => getJson<GhRepo>(`https://api.github.com/repos/${githubRepo}`, opts(ctx, { headers: gh }))),
      safe(ctx, "OpenSSF Scorecard", () => getJson<ScorecardRes>(`https://api.securityscorecards.dev/projects/github.com/${githubRepo}`, opts(ctx))),
    ]);
    archived = repo?.archived ?? null;
    pushedAt = repo?.pushed_at ?? null;
    scorecard = typeof sc?.score === "number" ? sc.score : null;
    if (scorecard === null) {
      const p = await safe(ctx, "deps.dev projects", () => getJson<DepsDevProject>(`https://api.deps.dev/v3/projects/github.com%2F${enc(githubRepo)}`, opts(ctx)));
      if (typeof p?.scorecard?.overallScore === "number") {
        scorecard = p.scorecard.overallScore;
        scorecardSource = "deps.dev";
      }
    }
  }

  return {
    name,
    requested,
    version,
    direct,
    npmDeprecated: typeof npm?.deprecated === "string" && npm.deprecated ? npm.deprecated : null,
    publishedAt: def?.publishedAt ?? null,
    depsDevDeprecated: def ? (def.isDeprecated ?? false) : null,
    githubRepo,
    archived,
    pushedAt,
    lastCommitMessage: null,
    lastCommitDate: null,
    scorecard,
    scorecardSource,
    vulnIds: [],
  };
}

export async function fetchLastCommit(f: PackageFacts, ctx: SourceCtx): Promise<void> {
  if (!f.githubRepo) return;
  const gh: Record<string, string> = ctx.githubToken ? { authorization: `Bearer ${ctx.githubToken}` } : {};
  const c = await safe(ctx, "GitHub commits", () => getJson<GhCommit[]>(`https://api.github.com/repos/${f.githubRepo}/commits?per_page=1`, opts(ctx, { headers: gh })));
  const first = c?.[0]?.commit;
  if (first?.message) {
    f.lastCommitMessage = first.message.split("\n")[0] ?? null;
    f.lastCommitDate = first.committer?.date ?? null;
  }
}

/** OSV querybatch, chunked. Returns vuln ids per query index. */
export async function osvBatch(items: { name: string; version: string | null }[], ctx: SourceCtx): Promise<string[][]> {
  const out: string[][] = items.map(() => []);
  const idx = items.map((it, i) => (it.version ? i : -1)).filter((i) => i >= 0);
  for (let s = 0; s < idx.length; s += 500) {
    const chunk = idx.slice(s, s + 500);
    const body = JSON.stringify({ queries: chunk.map((i) => ({ package: { name: items[i]!.name, ecosystem: "npm" }, version: items[i]!.version })) });
    const res = await safe(ctx, "OSV", () => getJson<{ results: { vulns?: { id: string }[] }[] }>("https://api.osv.dev/v1/querybatch", opts(ctx, { method: "POST", body, timeoutMs: 15000 })));
    res?.results.forEach((r, k) => {
      out[chunk[k]!] = (r.vulns ?? []).map((v) => v.id);
    });
  }
  return out;
}

interface DepsDevDeps {
  nodes?: { versionKey: { name: string; version: string }; relation: string }[];
}

/** Indirect deps of a package@version via deps.dev (one call per direct dependency). */
export async function fetchTransitive(direct: { name: string; version: string | null }[], ctx: SourceCtx): Promise<{ name: string; version: string }[]> {
  const found = new Map<string, string>();
  await pool(direct.filter((d) => d.version), 6, async (d) => {
    const r = await safe(ctx, "deps.dev dependencies", () => getJson<DepsDevDeps>(`https://api.deps.dev/v3/systems/npm/packages/${enc(d.name)}/versions/${enc(d.version!)}:dependencies`, opts(ctx, { timeoutMs: 10000 })));
    for (const n of r?.nodes ?? []) if (n.relation === "INDIRECT") found.set(`${n.versionKey.name}`, n.versionKey.version);
  });
  return [...found].map(([name, version]) => ({ name, version }));
}
