/**
 * Frozen JSON contract for Revenant. The web app, CLI, MCP server and Kiro Crew
 * app all consume these types. Bump SCHEMA_VERSION on any breaking change
 * (the schema-change hook in .kiro/hooks regenerates the cached sample).
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

export const SourceName = z.enum(["npm", "deps.dev", "osv", "scorecard", "github", "curated", "manifest"]);
export type SourceName = z.infer<typeof SourceName>;

/** A single fact, with the exact API field it was read from. */
export const Evidence = z.object({
  source: SourceName,
  /** Dotted path of the API field, e.g. "npm.latest.deprecated". */
  field: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  url: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

export const EpitaphKind = z.enum([
  "deprecated",
  "archived",
  "stale-publish",
  "vulnerabilities",
  "low-scorecard",
  "successor",
  "healthy",
]);
export type EpitaphKind = z.infer<typeof EpitaphKind>;

export const Epitaph = z.object({
  kind: EpitaphKind,
  text: z.string().min(1),
  /** Every epitaph must cite at least one API field (no invented facts). */
  evidence: z.array(Evidence).min(1),
});
export type Epitaph = z.infer<typeof Epitaph>;

export const Status = z.enum(["dead", "dying", "living"]);
export type Status = z.infer<typeof Status>;

export const Successor = z.object({
  name: z.string(),
  reason: z.string(),
  evidence: z.array(Evidence).min(1),
});
export type Successor = z.infer<typeof Successor>;

export const Tombstone = z.object({
  name: z.string(),
  /** Range as written in package.json, or the resolved version for transitive deps. */
  requested: z.string(),
  /** Version used for vulnerability lookups. */
  version: z.string().nullable(),
  direct: z.boolean(),
  status: Status,
  /** 0 (long dead) to 100 (thriving). */
  vitality: z.number().min(0).max(100),
  epitaphs: z.array(Epitaph).min(1),
  causeOfDeath: z.object({ text: z.string(), evidence: z.array(Evidence).min(1) }).nullable(),
  successor: Successor.nullable(),
  /** Id of a curated resurrection recipe, when one exists. */
  recipeId: z.string().nullable(),
  repository: z.string().nullable(),
  lastPublish: z.string().nullable(),
  vulnerabilityIds: z.array(z.string()),
  scorecard: z.number().nullable(),
});
export type Tombstone = z.infer<typeof Tombstone>;

export const ScanResult = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  source: z.object({ kind: z.enum(["github", "path", "package-json", "sample"]), ref: z.string() }),
  ecosystem: z.enum(["npm", "pypi", "go", "cargo", "unsupported"]),
  scannedAt: z.string(),
  tombstones: z.array(Tombstone),
  summary: z.object({
    total: z.number().int(),
    dead: z.number().int(),
    dying: z.number().int(),
    living: z.number().int(),
    /** 0-100, share of direct dependencies that are not living. */
    graveyardScore: z.number().min(0).max(100),
  }),
  /** Honest notes: truncation, rate limits, cache fallbacks, skipped ecosystems. */
  notes: z.array(z.string()),
  truncated: z.boolean(),
  fromCache: z.boolean(),
});
export type ScanResult = z.infer<typeof ScanResult>;

export const PatchFile = z.object({ path: z.string(), diff: z.string(), kind: z.enum(["modify", "add"]) });
export type PatchFile = z.infer<typeof PatchFile>;

export const Resurrection = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recipeId: z.string(),
  package: z.string(),
  replacement: z.string(),
  generatedAt: z.string(),
  /** A Kiro spec: drop these into .kiro/specs/<slug>/. */
  spec: z.object({ slug: z.string(), requirements: z.string(), design: z.string(), tasks: z.string() }),
  /** Unified diff, `git apply` compatible. */
  patch: z.string(),
  files: z.array(PatchFile),
  applyCommand: z.string(),
  /** Differential property-based tests (fast-check): old behaviour vs new. */
  tests: z.object({ path: z.string(), content: z.string(), runCommand: z.string() }),
  /** Honest list of what the recipe did not or could not migrate. */
  notes: z.array(z.string()),
  stats: z.object({ filesScanned: z.number().int(), filesChanged: z.number().int() }),
});
export type Resurrection = z.infer<typeof Resurrection>;

export const NoRecipe = z.object({ package: z.string(), curated: z.literal(false), message: z.string() });
export type NoRecipe = z.infer<typeof NoRecipe>;
