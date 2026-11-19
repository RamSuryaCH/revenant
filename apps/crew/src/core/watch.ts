import { classifyInput, scan, type ScanOptions, type ScanResult } from "@revenant/engine";
import { toSnapshot } from "./diff.js";
import { normalizeRepo, updateState } from "./store.js";
import type { Snapshot } from "./types.js";

export type ScanFn = (repo: string, options?: ScanOptions) => Promise<ScanResult>;

export const defaultScan: ScanFn = (repo, options) =>
  scan(classifyInput(`https://github.com/${repo}`), { githubToken: process.env["GITHUB_TOKEN"], maxTransitive: 0, ...options });

/** Scan one repo, compare with the stored snapshot, and persist the result. The network call happens outside the lock. */
export async function rescan(repo: string, o: { scanFn?: ScanFn; dir?: string } = {}): Promise<Snapshot> {
  if (!normalizeRepo(repo)) throw new Error(`Not a GitHub repository: ${repo}`);
  const result = await (o.scanFn ?? defaultScan)(repo);
  return updateState((s) => {
    const snap = toSnapshot(repo, result, s.snapshots[repo]);
    s.snapshots[repo] = snap;
    return snap;
  }, o.dir);
}
