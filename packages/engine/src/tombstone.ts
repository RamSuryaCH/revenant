import { FIELDS, type PackageFacts } from "./facts.js";
import type { Epitaph, Evidence, Tombstone } from "./schema.js";
import { statusOf, vitality, yearsBetween, type Signals } from "./scoring.js";
import { parseSuccessorFromDeprecation, successorFor } from "./successors.js";

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const day = (iso: string) => iso.slice(0, 10);

export function signalsOf(f: PackageFacts, now: Date): Signals {
  const deprecated = f.npmDeprecated !== null || f.depsDevDeprecated === true;
  const succ = successorFor(f.name, f.version);
  return {
    deprecated,
    archived: f.archived === true,
    yearsSincePublish: f.publishedAt ? yearsBetween(f.publishedAt, now) : null,
    vulnerabilityCount: f.vulnIds.length,
    scorecard: f.scorecard,
    legacy: succ?.legacy === true,
  };
}

/** Pure: facts in, tombstone out. Every sentence carries the evidence field it came from. */
export function buildTombstone(f: PackageFacts, now: Date): Tombstone {
  const sig = signalsOf(f, now);
  const ev = (field: string, source: Evidence["source"], value: Evidence["value"], url?: string): Evidence => ({ source, field, value, ...(url ? { url } : {}) });
  const npmUrl = `https://registry.npmjs.org/${f.name}/${f.version ?? "latest"}`;
  const ghUrl = f.githubRepo ? `https://api.github.com/repos/${f.githubRepo}` : undefined;

  const epitaphs: Epitaph[] = [];
  if (f.npmDeprecated !== null) {
    epitaphs.push({ kind: "deprecated", text: `Deprecated: "${clip(oneLine(f.npmDeprecated), 140)}"`, evidence: [ev(FIELDS.npmDeprecated, "npm", f.npmDeprecated, npmUrl)] });
  } else if (f.depsDevDeprecated === true) {
    epitaphs.push({ kind: "deprecated", text: "Marked deprecated on deps.dev", evidence: [ev(FIELDS.depsDevDeprecated, "deps.dev", true)] });
  }
  if (f.archived === true) {
    const e = [ev(FIELDS.archived, "github", true, ghUrl)];
    if (f.pushedAt) e.push(ev(FIELDS.pushedAt, "github", f.pushedAt, ghUrl));
    epitaphs.push({ kind: "archived", text: `Archived on GitHub${f.pushedAt ? `, last push ${day(f.pushedAt)}` : ""}`, evidence: e });
  }
  if (f.publishedAt && sig.yearsSincePublish !== null && sig.yearsSincePublish >= 1) {
    const y = sig.yearsSincePublish;
    epitaphs.push({ kind: "stale-publish", text: `No publish in ${y} year${y === 1 ? "" : "s"} (last ${day(f.publishedAt)})`, evidence: [ev(FIELDS.publishedAt, "deps.dev", f.publishedAt)] });
  }
  if (f.vulnIds.length > 0) {
    const n = f.vulnIds.length;
    epitaphs.push({
      kind: "vulnerabilities",
      text: `${n} known ${n === 1 ? "vulnerability" : "vulnerabilities"} in ${f.version ?? "this version"} (${f.vulnIds.slice(0, 3).join(", ")}${n > 3 ? ", …" : ""})`,
      evidence: [ev(FIELDS.vulnIds, "osv", f.vulnIds.join(","))],
    });
  }
  if (f.scorecard !== null && f.scorecard < 4) {
    epitaphs.push({
      kind: "low-scorecard",
      text: `OpenSSF Scorecard ${f.scorecard.toFixed(1)}/10`,
      evidence: [ev(f.scorecardSource === "scorecard" ? FIELDS.scorecard : FIELDS.scorecardDepsDev, f.scorecardSource === "scorecard" ? "scorecard" : "deps.dev", f.scorecard)],
    });
  }

  // Successor: curated table first, else parsed from the npm deprecation message.
  const curated = successorFor(f.name, f.version);
  let successor: Tombstone["successor"] = null;
  if (curated) {
    successor = { name: curated.name, reason: curated.reason, evidence: [ev(`curated.successors[${f.name}]`, "curated", curated.name)] };
  } else if (f.npmDeprecated) {
    const parsed = parseSuccessorFromDeprecation(f.npmDeprecated);
    if (parsed) successor = { name: parsed, reason: "Named in the package's own deprecation notice", evidence: [ev(FIELDS.npmDeprecated, "npm", f.npmDeprecated, npmUrl)] };
  }
  if (successor) epitaphs.push({ kind: "successor", text: `Successor: ${successor.name}. ${successor.reason}`, evidence: successor.evidence });
  if (curated?.legacy) {
    epitaphs.push({ kind: "stale-publish", text: "Maintainers describe the project as legacy / maintenance-only", evidence: [ev(`curated.legacy[${f.name}]`, "curated", true)] });
  }

  const status = statusOf(sig);
  if (status === "living" || epitaphs.length === 0) {
    epitaphs.unshift({
      kind: "healthy",
      text: f.publishedAt ? `Alive: last publish ${day(f.publishedAt)}` : `Declared as ${f.requested}`,
      evidence: [f.publishedAt ? ev(FIELDS.publishedAt, "deps.dev", f.publishedAt) : ev(FIELDS.requested, "manifest", f.requested)],
    });
  }

  // Cause of death: composed only from cited facts.
  let causeOfDeath: Tombstone["causeOfDeath"] = null;
  if (status !== "living") {
    const parts: string[] = [];
    const evs: Evidence[] = [];
    if (f.npmDeprecated) {
      parts.push(`npm flags ${f.version ?? "it"} as deprecated ("${clip(oneLine(f.npmDeprecated), 100)}")`);
      evs.push(ev(FIELDS.npmDeprecated, "npm", f.npmDeprecated, npmUrl));
    }
    if (f.archived === true) {
      parts.push("its repository was archived and made read-only");
      evs.push(ev(FIELDS.archived, "github", true, ghUrl));
    }
    if (f.publishedAt && (sig.yearsSincePublish ?? 0) >= 2) {
      parts.push(`it went silent on npm after ${day(f.publishedAt)}`);
      evs.push(ev(FIELDS.publishedAt, "deps.dev", f.publishedAt));
    }
    if (curated?.legacy) {
      parts.push("its maintainers put it into maintenance-only mode");
      evs.push(ev(`curated.legacy[${f.name}]`, "curated", true));
    }
    if (f.vulnIds.length > 0) {
      parts.push(`${f.vulnIds.length} known ${f.vulnIds.length === 1 ? "vulnerability remains" : "vulnerabilities remain"} open for ${f.version ?? "it"}`);
      evs.push(ev(FIELDS.vulnIds, "osv", f.vulnIds.join(",")));
    }
    let text = parts.length ? `Cause of death: ${parts.join("; ")}.` : "Cause of death: slow decline across several weak health signals.";
    if (f.lastCommitMessage && f.lastCommitDate && yearsBetween(f.lastCommitDate, now) >= 1) {
      text += ` Its last recorded commit, on ${day(f.lastCommitDate)}, read "${clip(oneLine(f.lastCommitMessage), 80)}".`;
      evs.push(ev(FIELDS.lastCommitMessage, "github", f.lastCommitMessage, ghUrl), ev(FIELDS.lastCommitDate, "github", f.lastCommitDate, ghUrl));
    }
    if (evs.length === 0) evs.push(ev(FIELDS.requested, "manifest", f.requested));
    causeOfDeath = { text, evidence: evs };
  }

  return {
    name: f.name,
    requested: f.requested,
    version: f.version,
    direct: f.direct,
    status,
    vitality: vitality(sig),
    epitaphs,
    causeOfDeath,
    successor,
    recipeId: curated?.recipeId ?? null,
    repository: f.githubRepo ? `https://github.com/${f.githubRepo}` : null,
    lastPublish: f.publishedAt,
    vulnerabilityIds: f.vulnIds,
    scorecard: f.scorecard,
  };
}
