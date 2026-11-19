import type { ScanResult, Tombstone } from "@revenant/engine";
import type { Dep, Snapshot } from "./types.js";

export function toDep(t: Tombstone): Dep {
  return {
    name: t.name,
    status: t.status,
    vitality: t.vitality,
    direct: t.direct,
    version: t.version,
    cause: t.causeOfDeath?.text ?? t.epitaphs[0]?.text ?? "",
    evidence: (t.causeOfDeath?.evidence ?? t.epitaphs[0]?.evidence ?? []).slice(0, 6).map((e) => ({ source: e.source, field: e.field, value: e.value, url: e.url })),
    successor: t.successor?.name ?? null,
    recipeId: t.recipeId,
  };
}

/** Dead now, and either absent or not dead at the previous scan. A first scan has nothing to compare with. */
export function newlyDead(previous: Snapshot | undefined, deps: Dep[]): string[] {
  if (!previous) return [];
  const before = new Map(previous.deps.map((d) => [d.name, d.status]));
  return deps.filter((d) => d.status === "dead" && before.get(d.name) !== "dead").map((d) => d.name).sort();
}

export function toSnapshot(repo: string, scan: ScanResult, previous: Snapshot | undefined): Snapshot {
  const deps = scan.tombstones.map(toDep);
  return {
    repo,
    scannedAt: scan.scannedAt,
    summary: scan.summary,
    deps,
    newlyDead: newlyDead(previous, deps),
    since: previous?.scannedAt ?? null,
    baseline: !previous,
    notes: scan.notes,
  };
}
