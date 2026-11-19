import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { emptyState, APP_NAME, type WatchState } from "./types.js";

/** The app's data directory: <crew home>/apps/graveyard-watch/data. REVENANT_WATCH_DATA overrides it. */
export function dataDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env["REVENANT_WATCH_DATA"]) return env["REVENANT_WATCH_DATA"];
  return join(env["KIROCREW_HOME"] || join(homedir(), ".kiro", "crew"), "apps", APP_NAME, "data");
}

const REPO = /^[\w.-]{1,100}\/[\w.-]{1,100}$/;

/** Accept owner/name or a github.com URL; return owner/name or null. Nothing else is watchable. */
export function normalizeRepo(input: string): string | null {
  const m = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?].*)?$/i.exec(input.trim());
  const repo = m ? `${m[1]}/${m[2]}` : input.trim();
  return REPO.test(repo) && !repo.includes("..") ? repo : null;
}

async function readState(file: string): Promise<WatchState> {
  try {
    const raw = JSON.parse(await readFile(file, "utf8")) as Partial<WatchState>;
    if (raw.version !== 1 || !Array.isArray(raw.watched)) return emptyState();
    return { ...emptyState(), ...raw, watched: raw.watched.filter((r) => REPO.test(r)), snapshots: raw.snapshots ?? {} } as WatchState;
  } catch {
    return emptyState();
  }
}

export async function loadState(dir = dataDir()): Promise<WatchState> {
  return readState(join(dir, "state.json"));
}

async function lock(dir: string): Promise<() => Promise<void>> {
  const path = join(dir, "state.lock");
  for (let i = 0; i < 100; i++) {
    try {
      await mkdir(path);
      return () => rm(path, { recursive: true, force: true });
    } catch {
      // A lock older than 30 s belongs to a crashed process.
      const age = await stat(path).then((s) => Date.now() - s.mtimeMs, () => 0);
      if (age > 30_000) await rm(path, { recursive: true, force: true });
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("State is locked by another process.");
}

/** Read, change and write the state under a lock, so the backend and the nightly job never clobber each other. */
export async function updateState<T>(fn: (s: WatchState) => T | Promise<T>, dir = dataDir()): Promise<T> {
  await mkdir(dir, { recursive: true });
  const unlock = await lock(dir);
  try {
    const file = join(dir, "state.json");
    const state = await readState(file);
    const out = await fn(state);
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tmp, file);
    return out;
  } finally {
    await unlock();
  }
}
