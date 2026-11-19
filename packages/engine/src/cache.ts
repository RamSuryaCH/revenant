import type { ScanResult } from "./schema.js";

export interface CacheOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/** Small in-memory TTL cache for finished scans. Per process: a cold serverless instance starts empty. */
export class ScanCache {
  private readonly map = new Map<string, { at: number; result: ScanResult }>();
  private readonly ttlMs: number;
  private readonly max: number;
  private readonly now: () => number;

  constructor(o: CacheOptions = {}) {
    this.ttlMs = o.ttlMs ?? 10 * 60_000;
    this.max = o.maxEntries ?? 50;
    this.now = o.now ?? Date.now;
  }

  static key(repo: string, sha: string): string {
    return `${repo.toLowerCase()}@${sha}`;
  }

  get(key: string): ScanResult | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (this.now() - hit.at >= this.ttlMs) {
      this.map.delete(key);
      return null;
    }
    return hit.result;
  }

  set(key: string, result: ScanResult): void {
    this.map.delete(key);
    this.map.set(key, { at: this.now(), result });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }

  get size(): number {
    return this.map.size;
  }
}

/** Current HEAD commit SHA of a public repo, or null when it cannot be read. */
export async function headSha(owner: string, repo: string, o: { githubToken?: string; fetchImpl?: typeof fetch } = {}): Promise<string | null> {
  const f = o.fetchImpl ?? fetch;
  try {
    const res = await f(`https://api.github.com/repos/${owner}/${repo}/commits/HEAD`, {
      headers: { accept: "application/vnd.github.sha", "user-agent": "revenant", ...(o.githubToken ? { authorization: `Bearer ${o.githubToken}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const sha = (await res.text()).trim();
    return /^[0-9a-f]{40}$/.test(sha) ? sha : null;
  } catch {
    return null;
  }
}
