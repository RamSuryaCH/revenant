import type { Evidence, Resurrection, Tombstone } from "@revenant/engine";

export const SOURCE_LABEL: Record<string, string> = {
  npm: "npm registry",
  "deps.dev": "deps.dev",
  osv: "OSV",
  scorecard: "OpenSSF Scorecard",
  github: "GitHub",
  curated: "Curated by Revenant",
  manifest: "package.json",
};

export const STATUS_WORD = { dead: "Dead", dying: "Dying", living: "Alive" } as const;

/**
 * Cut `text` to at most `max` characters at a word boundary. A URL or any other
 * unbroken token is dropped whole rather than split, so a link is never shown half-cut.
 */
export function clampAtWord(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  const head = (space > 0 ? cut.slice(0, space) : "").replace(/[\s,;:.(\-–—]+$/u, "");
  return `${head}…`;
}

/** "3 of 3 direct dependencies are dead or dying." */
export function summaryLine(tombs: readonly Tombstone[]): string {
  const direct = tombs.filter((t) => t.direct);
  const bad = direct.filter((t) => t.status !== "living").length;
  const indirect = tombs.filter((t) => !t.direct);
  const noun = direct.length === 1 ? "direct dependency is" : "direct dependencies are";
  const head = direct.length === 0 ? "No direct dependencies found." : `${bad} of ${direct.length} ${noun} dead or dying.`;
  if (indirect.length === 0) return head;
  const alive = indirect.filter((t) => t.status === "living").length;
  return `${head} ${indirect.length} indirect packages checked, ${alive} alive.`;
}

export interface Chip {
  source: string;
  label: string;
  field: string;
  url?: string;
}

const chipOf = (e: Evidence): Chip => ({ source: e.source, label: SOURCE_LABEL[e.source] ?? e.source, field: e.field, ...(isHttps(e.url) ? { url: e.url } : {}) });

export function isHttps(u: string | undefined): u is string {
  return typeof u === "string" && u.startsWith("https://");
}

/** Source chips of a tombstone's first epitaph (unique by source + field). */
export function sourceChips(t: Tombstone, max = 2): { chips: Chip[]; more: number } {
  const seen = new Set<string>();
  const all: Chip[] = [];
  for (const e of t.epitaphs[0]?.evidence ?? []) {
    const k = `${e.source}|${e.field}`;
    if (!seen.has(k)) {
      seen.add(k);
      all.push(chipOf(e));
    }
  }
  return { chips: all.slice(0, max), more: Math.max(0, all.length - max) };
}

export interface EvidenceRow {
  group: "cause" | "epitaph" | "successor";
  claim: string;
  chips: Chip[];
}

/** Every claim the drawer shows, with the fields it cites. Nothing here is composed by the UI. */
export function evidenceRows(t: Tombstone): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  if (t.causeOfDeath) rows.push({ group: "cause", claim: t.causeOfDeath.text.replace(/^Cause of death: /, ""), chips: t.causeOfDeath.evidence.map(chipOf) });
  for (const e of t.epitaphs) rows.push({ group: "epitaph", claim: e.text, chips: e.evidence.map(chipOf) });
  if (t.successor) rows.push({ group: "successor", claim: `${t.successor.name}: ${t.successor.reason}`, chips: t.successor.evidence.map(chipOf) });
  return rows;
}

/** Added and removed line counts of a unified diff (file headers excluded). */
export function patchCounts(patch: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of patch.split("\n")) {
    if (l.startsWith("+++") || l.startsWith("---")) continue;
    if (l.startsWith("+")) added++;
    else if (l.startsWith("-")) removed++;
  }
  return { added, removed };
}

/** Everything the Resurrect sequence shows, read from the real response. */
export function artifactFacts(r: Resurrection) {
  const { added, removed } = patchCounts(r.patch);
  return {
    patch: { files: r.stats.filesChanged, added, removed },
    spec: { dir: `.kiro/specs/${r.spec.slug}/`, files: ["requirements.md", "design.md", "tasks.md"] },
    tests: { path: r.tests.path, properties: (r.tests.content.match(/\bfc\.assert\(|\bfc\.property\(/g) ?? []).length },
    replacement: r.replacement,
  };
}
