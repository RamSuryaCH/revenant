export const APP_NAME = "graveyard-watch";
/** The only repository the nightly reset may touch. */
export const RESET_REPO = "RamSuryaCH/revenant-crypt";

export type Status = "dead" | "dying" | "living";

export interface EvidenceRef {
  source: string;
  field: string;
  value: string | number | boolean | null;
  url?: string | undefined;
}

export interface Dep {
  name: string;
  status: Status;
  vitality: number;
  direct: boolean;
  version: string | null;
  cause: string;
  evidence: EvidenceRef[];
  successor: string | null;
  recipeId: string | null;
}

export interface Snapshot {
  repo: string;
  scannedAt: string;
  summary: { total: number; dead: number; dying: number; living: number; graveyardScore: number };
  deps: Dep[];
  /** Names that were not dead at the previous scan and are dead now. Empty on a first (baseline) scan. */
  newlyDead: string[];
  /** Timestamp of the scan this one was compared with. */
  since: string | null;
  baseline: boolean;
  notes: string[];
}

export interface NightlyRun {
  at: string;
  ok: boolean;
  scanned: number;
  newlyDead: { repo: string; names: string[] }[];
  errors: string[];
  reset: { status: "done" | "skipped" | "failed" | "dry-run"; detail: string };
}

export interface WatchState {
  version: 1;
  watched: string[];
  snapshots: Record<string, Snapshot>;
  nightly: NightlyRun | null;
  /** Local clone of RESET_REPO whose scripts/reset.sh the nightly job runs. */
  cryptDir?: string | undefined;
}

export const emptyState = (): WatchState => ({ version: 1, watched: [RESET_REPO], snapshots: {}, nightly: null });
