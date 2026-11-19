import type { Evidence } from "./schema.js";

/** Raw, API-sourced facts about one package. Everything an epitaph says comes from here. */
export interface PackageFacts {
  name: string;
  requested: string;
  version: string | null;
  direct: boolean;
  /** npm registry: /<name>/<version> -> deprecated */
  npmDeprecated: string | null;
  /** deps.dev: default version publishedAt */
  publishedAt: string | null;
  /** deps.dev: default version isDeprecated */
  depsDevDeprecated: boolean | null;
  /** npm registry: repository.url normalised to "owner/repo" on GitHub */
  githubRepo: string | null;
  /** GitHub REST: /repos/{o}/{r} */
  archived: boolean | null;
  pushedAt: string | null;
  /** GitHub REST: /repos/{o}/{r}/commits?per_page=1 */
  lastCommitMessage: string | null;
  lastCommitDate: string | null;
  /** OpenSSF Scorecard API (or deps.dev project scorecard fallback): overall score */
  scorecard: number | null;
  scorecardSource: "scorecard" | "deps.dev";
  /** OSV querybatch: ids affecting `version` */
  vulnIds: string[];
}

export const FIELDS = {
  npmDeprecated: "npm.version.deprecated",
  publishedAt: "deps.dev.versions[isDefault].publishedAt",
  depsDevDeprecated: "deps.dev.versions[isDefault].isDeprecated",
  archived: "github.repos.archived",
  pushedAt: "github.repos.pushed_at",
  lastCommitMessage: "github.commits[0].commit.message",
  lastCommitDate: "github.commits[0].commit.committer.date",
  scorecard: "scorecard.score",
  scorecardDepsDev: "deps.dev.projects.scorecard.overallScore",
  vulnIds: "osv.querybatch.results[].vulns[].id",
  requested: "manifest.dependencies",
} as const;

/** Resolve an evidence field back to the value stored in facts. Used to prove no fact is invented. */
export function lookupField(f: PackageFacts, field: string): Evidence["value"] | undefined {
  switch (field) {
    case FIELDS.npmDeprecated:
      return f.npmDeprecated;
    case FIELDS.publishedAt:
      return f.publishedAt;
    case FIELDS.depsDevDeprecated:
      return f.depsDevDeprecated;
    case FIELDS.archived:
      return f.archived;
    case FIELDS.pushedAt:
      return f.pushedAt;
    case FIELDS.lastCommitMessage:
      return f.lastCommitMessage;
    case FIELDS.lastCommitDate:
      return f.lastCommitDate;
    case FIELDS.scorecard:
    case FIELDS.scorecardDepsDev:
      return f.scorecard;
    case FIELDS.vulnIds:
      return f.vulnIds.join(",");
    case FIELDS.requested:
      return f.requested;
    default:
      return undefined;
  }
}
