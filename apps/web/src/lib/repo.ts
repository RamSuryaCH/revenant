/** Accept `owner/repo` as well as a GitHub URL. Anything else is returned trimmed and unchanged. */
export function normalizeRepo(input: string): string {
  const t = input.trim();
  return /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/.test(t) && !/^https?:/i.test(t) ? `https://github.com/${t}` : t;
}

/** True when the repository exists and is public, false on 404, null when GitHub could not say. */
export async function repoExists(owner: string, repo: string, o: { token?: string; fetchImpl?: typeof fetch } = {}): Promise<boolean | null> {
  try {
    const res = await (o.fetchImpl ?? fetch)(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: { accept: "application/vnd.github+json", ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 404) return false;
    return res.ok ? true : null;
  } catch {
    return null;
  }
}

export interface PrTotals {
  additions: number;
  deletions: number;
  files: number;
}

/**
 * Read a pull request's own totals, from GitHub's pulls API shape (`changed_files`) or from our
 * route's reply (`files`). Returns null unless all three are numbers.
 */
export function parsePrTotals(j: unknown): PrTotals | null {
  const o = (j ?? {}) as Record<string, unknown>;
  const { additions, deletions } = o;
  const files = o["changed_files"] ?? o["files"];
  return typeof additions === "number" && typeof deletions === "number" && typeof files === "number" ? { additions, deletions, files } : null;
}

/** Short label for what a patch was computed against. */
export function scopeLabel(repo: string | null, sample: boolean): string {
  if (sample || !repo) return "the cursed sample app";
  const m = /github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?(?:[/#?].*)?$/i.exec(repo);
  return m?.[1] ?? "your scanned repo";
}
