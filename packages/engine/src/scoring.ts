import type { Status } from "./schema.js";

export interface Signals {
  deprecated: boolean;
  archived: boolean;
  /** Whole years since the last publish; null if unknown. */
  yearsSincePublish: number | null;
  /** Vulnerabilities affecting the pinned version. */
  vulnerabilityCount: number;
  /** OpenSSF Scorecard overall score 0-10; null if unknown. */
  scorecard: number | null;
  /** Curated: maintainers declare the project legacy/maintenance-only. */
  legacy?: boolean;
}

/** Penalty points per signal. Pure and monotonic: more bad signals never raise vitality. */
export function penalties(s: Signals): number {
  let p = 0;
  if (s.deprecated) p += 50;
  if (s.archived) p += 40;
  if (s.yearsSincePublish !== null) {
    const y = Math.max(0, s.yearsSincePublish);
    p += y >= 4 ? 35 : y >= 2 ? 20 : y >= 1 ? 8 : 0;
  }
  p += Math.min(30, Math.max(0, s.vulnerabilityCount) * 10);
  if (s.scorecard !== null && s.scorecard < 4) p += 10;
  if (s.legacy) p += 30;
  return p;
}

export function vitality(s: Signals): number {
  return Math.max(0, Math.min(100, 100 - penalties(s)));
}

export function statusOf(s: Signals): Status {
  const v = vitality(s);
  if (s.deprecated || s.archived || v <= 40) return "dead";
  if (v <= 75) return "dying";
  return "living";
}

export function graveyardScore(direct: { status: Status }[]): number {
  if (direct.length === 0) return 0;
  const bad = direct.filter((t) => t.status !== "living").length;
  return Math.round((bad / direct.length) * 100);
}

export function yearsBetween(fromIso: string, now: Date): number {
  const ms = now.getTime() - new Date(fromIso).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
}
