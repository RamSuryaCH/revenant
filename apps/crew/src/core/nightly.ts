import { resetDemoRepo } from "./reset.js";
import { loadState, updateState } from "./store.js";
import type { NightlyRun } from "./types.js";
import { rescan, type ScanFn } from "./watch.js";

export interface NightlyDeps {
  scanFn?: ScanFn;
  dir?: string;
  reset?: () => Promise<NightlyRun["reset"]>;
  now?: () => Date;
}

/** Rescan every watched repo, record what newly died, reset the demo repo, and return a readable report. */
export async function runNightly(d: NightlyDeps = {}): Promise<{ run: NightlyRun; report: string }> {
  const state = await loadState(d.dir);
  const run: NightlyRun = { at: (d.now ?? (() => new Date()))().toISOString(), ok: true, scanned: 0, newlyDead: [], errors: [], reset: { status: "skipped", detail: "" } };
  for (const repo of state.watched) {
    try {
      const snap = await rescan(repo, { ...(d.scanFn ? { scanFn: d.scanFn } : {}), ...(d.dir ? { dir: d.dir } : {}) });
      run.scanned++;
      if (snap.newlyDead.length) run.newlyDead.push({ repo, names: snap.newlyDead });
    } catch (e) {
      run.ok = false;
      run.errors.push(`${repo}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  run.reset = await (d.reset ?? (() => resetDemoRepo({ configured: state.cryptDir })))();
  if (run.reset.status === "failed") run.ok = false;
  await updateState((s) => {
    s.nightly = run;
  }, d.dir);
  return { run, report: formatReport(run) };
}

export function formatReport(run: NightlyRun): string {
  const lines: string[] = [];
  if (run.newlyDead.length) {
    lines.push("Newly dead since the last scan:");
    for (const n of run.newlyDead) lines.push(`  ${n.repo}: ${n.names.join(", ")}`);
  } else {
    lines.push(`Graveyard Watch: no new deaths across ${run.scanned} watched repo(s).`);
  }
  for (const e of run.errors) lines.push(`Scan failed - ${e}`);
  lines.push(`Demo reset (${run.reset.status}): ${run.reset.detail}`);
  return lines.join("\n");
}
