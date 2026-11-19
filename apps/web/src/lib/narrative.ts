import type { Resurrection, ScanResult, Tombstone } from "@revenant/engine";
import { patchCounts, SOURCE_LABEL, sourceChips, displayEpitaph } from "./ledger";
import { sandboxProof } from "./proof";

export interface NarrativeFacts {
  scan: { total: number; dead: number; dying: number; living: number; sources: Array<{ id: string; label: string; packages: number }> };
  epitaph: { name: string; version: string; text: string; field: string; sourceLabel: string; url: string | null };
  resurrect: { name: string; replacement: string; files: number; added: number; removed: number; specSlug: string; suite: string | null; differential: number | null; recordedOn: string | null };
}

const SOURCE_ORDER = ["npm", "deps.dev", "osv", "scorecard", "github"] as const;

const citedSources = (t: Tombstone): Set<string> => {
  const s = new Set<string>();
  for (const e of t.epitaphs) for (const x of e.evidence) s.add(x.source);
  for (const x of t.causeOfDeath?.evidence ?? []) s.add(x.source);
  for (const x of t.successor?.evidence ?? []) s.add(x.source);
  return s;
};

/** Everything the three beats show, read from the bundled sample files. Nothing is composed here. */
export function narrativeFacts(scan: ScanResult, request: Resurrection, pick = "request"): NarrativeFacts {
  const counts = { dead: 0, dying: 0, living: 0 };
  const per: Record<string, number> = {};
  for (const t of scan.tombstones) {
    counts[t.status]++;
    for (const s of citedSources(t)) per[s] = (per[s] ?? 0) + 1;
  }
  const stone = scan.tombstones.find((t) => t.name === pick && t.epitaphs.length > 0);
  if (!stone) throw new Error(`The sample has no tombstone named ${pick}`);
  const ep = stone.epitaphs[0]!;
  const chip = sourceChips(stone, 1).chips[0];
  if (!chip) throw new Error(`The first epitaph of ${pick} cites nothing`);
  const { added, removed } = patchCounts(request.patch);
  const proof = sandboxProof(request.recipeId);
  return {
    scan: { total: scan.tombstones.length, ...counts, sources: SOURCE_ORDER.map((id) => ({ id, label: SOURCE_LABEL[id] ?? id, packages: per[id] ?? 0 })) },
    epitaph: { name: stone.name, version: stone.version ?? stone.requested, text: displayEpitaph(ep), field: chip.field, sourceLabel: chip.label, url: chip.url ?? null },
    resurrect: {
      name: request.package,
      replacement: request.replacement,
      files: request.stats.filesChanged,
      added,
      removed,
      specSlug: request.spec.slug,
      suite: proof ? `${proof.suitePass} of ${proof.suiteTotal}` : null,
      differential: proof?.diffPassed ?? null,
      recordedOn: proof ? proof.date : null,
    },
  };
}
