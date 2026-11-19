import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, type ScanResult, type Tombstone } from "@revenant/engine";
import { newlyDead, toSnapshot } from "../src/core/diff.js";
import { runNightly } from "../src/core/nightly.js";
import { resetDemoRepo } from "../src/core/reset.js";
import { loadState, normalizeRepo, updateState } from "../src/core/store.js";
import { createHandler } from "../src/server.js";
import { rescan, type ScanFn } from "../src/core/watch.js";
import { RESET_REPO } from "../src/core/types.js";

const ev = [{ source: "npm" as const, field: "npm.latest.deprecated", value: "x" }];
const tomb = (name: string, status: Tombstone["status"]): Tombstone => ({
  name, requested: "^1", version: "1.0.0", direct: true, status, vitality: status === "dead" ? 5 : 80,
  epitaphs: [{ kind: "deprecated", text: `${name} text`, evidence: ev }],
  causeOfDeath: status === "dead" ? { text: `${name} is dead`, evidence: ev } : null,
  successor: null, recipeId: null, repository: null, lastPublish: null, vulnerabilityIds: [], scorecard: null,
});
const scanOf = (...t: Tombstone[]): ScanResult => ({
  schemaVersion: SCHEMA_VERSION, source: { kind: "github", ref: "a/b" }, ecosystem: "npm", scannedAt: new Date().toISOString(), tombstones: t,
  summary: { total: t.length, dead: t.filter((x) => x.status === "dead").length, dying: 0, living: t.filter((x) => x.status === "living").length, graveyardScore: 50 },
  notes: [], truncated: false, fromCache: false,
});

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), "gw-")); });
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("normalizeRepo", () => {
  it("accepts owner/name and github URLs", () => {
    expect(normalizeRepo("a/b")).toBe("a/b");
    expect(normalizeRepo("https://github.com/a/b.git")).toBe("a/b");
  });
  it("rejects paths, other hosts and traversal", () => {
    for (const bad of ["/etc/passwd", "../x/y", "a/b/c", "https://gitlab.com/a/b", "", "a/..", "x y/z"]) expect(normalizeRepo(bad)).toBeNull();
  });
});

describe("newlyDead", () => {
  it("is empty on a baseline scan", () => {
    expect(toSnapshot("a/b", scanOf(tomb("x", "dead")), undefined)).toMatchObject({ baseline: true, newlyDead: [] });
  });
  it("lists packages that were not dead before, including new ones", () => {
    const prev = toSnapshot("a/b", scanOf(tomb("x", "living"), tomb("y", "dead")), undefined);
    const now = toSnapshot("a/b", scanOf(tomb("x", "dead"), tomb("y", "dead"), tomb("z", "dead")), prev);
    expect(now.newlyDead).toEqual(["x", "z"]);
    expect(newlyDead(prev, now.deps)).toEqual(["x", "z"]);
  });
});

describe("store", () => {
  it("round-trips and starts with the demo repo", async () => {
    expect((await loadState(dir)).watched).toEqual([RESET_REPO]);
    await updateState((s) => { s.watched.push("a/b"); }, dir);
    expect((await loadState(dir)).watched).toContain("a/b");
  });
  it("serialises concurrent updates", async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => updateState((s) => { s.watched.push(`o/r${i}`); }, dir)));
    expect((await loadState(dir)).watched.length).toBe(9);
  });
});

describe("rescan and nightly", () => {
  it("keeps the previous snapshot when a scan fails", async () => {
    await rescan("a/b", { dir, scanFn: async () => scanOf(tomb("x", "living")) });
    await expect(rescan("a/b", { dir, scanFn: async () => { throw new Error("rate limited"); } })).rejects.toThrow();
    expect((await loadState(dir)).snapshots["a/b"]?.deps[0]?.status).toBe("living");
  });

  it("reports new deaths, continues past a failing repo, and records the run", async () => {
    await updateState((s) => { s.watched = ["a/ok", "a/bad"]; }, dir);
    let n = 0;
    const scanFn: ScanFn = async (repo) => {
      if (repo === "a/bad") throw new Error("boom");
      return scanOf(tomb("x", n++ === 0 ? "living" : "dead"));
    };
    await runNightly({ dir, scanFn, reset: async () => ({ status: "skipped", detail: "t" }) });
    const second = await runNightly({ dir, scanFn, reset: async () => ({ status: "dry-run", detail: "t" }) });
    expect(second.run.newlyDead).toEqual([{ repo: "a/ok", names: ["x"] }]);
    expect(second.run.ok).toBe(false);
    expect(second.report).toMatch(/Newly dead/);
    expect((await loadState(dir)).nightly?.at).toBe(second.run.at);
  });
});

describe("resetDemoRepo", () => {
  const ok = (stdout: string) => async () => ({ stdout });
  it("skips when no clone exists", async () => {
    const r = await resetDemoRepo({ env: { REVENANT_CRYPT_DIR: join(dir, "none") }, configured: undefined });
    expect(r.status).toBe("skipped");
  });
  it("refuses a clone whose origin is another repo, and never runs the script", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(dir, "scripts"));
    writeFileSync(join(dir, "scripts", "reset.sh"), `REPO="${RESET_REPO}"\n`);
    const calls: string[] = [];
    const r = await resetDemoRepo({ env: { REVENANT_CRYPT_DIR: dir }, exec: async (f, a) => { calls.push(`${f} ${a[0]}`); return { stdout: "git@github.com:someone/else.git" }; } });
    expect(r.status).toBe("skipped");
    expect(calls.every((c) => !c.startsWith("bash"))).toBe(true);
  });
  it("runs live only with REVENANT_RESET_LIVE=1", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(dir, "scripts"));
    writeFileSync(join(dir, "scripts", "reset.sh"), `REPO="${RESET_REPO}"\n`);
    let env: Record<string, string | undefined> = {};
    const r = await resetDemoRepo({
      env: { REVENANT_CRYPT_DIR: dir, REVENANT_RESET_LIVE: "1" },
      exec: async (f, _a, o) => { if (f === "bash") env = (o?.["env"] ?? {}) as typeof env; return { stdout: f === "git" ? `https://github.com/${RESET_REPO}` : "reset done" }; },
    });
    expect(r.status).toBe("done");
    expect(env["DRY_RUN"]).toBe("0");
  });
  it("refuses a script that does not pin the repo", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(dir, "scripts"));
    writeFileSync(join(dir, "scripts", "reset.sh"), `REPO="other/repo"\n`);
    const r = await resetDemoRepo({ env: { REVENANT_CRYPT_DIR: dir }, exec: ok(`https://github.com/${RESET_REPO}.git`) });
    expect(r.detail).toMatch(/does not pin/);
  });
  it("runs the pinned script, in dry-run when asked", async () => {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(join(dir, "scripts"));
    writeFileSync(join(dir, "scripts", "reset.sh"), `REPO="${RESET_REPO}"\n`);
    let env: Record<string, string | undefined> = {};
    const r = await resetDemoRepo({
      env: { REVENANT_CRYPT_DIR: dir },
      exec: async (f, _a, o) => { if (f === "bash") env = (o?.["env"] ?? {}) as typeof env; return { stdout: f === "git" ? `git@github.com:${RESET_REPO}.git` : "reset done" }; },
    });
    expect(r).toEqual({ status: "dry-run", detail: "reset done" });
    expect(env["DRY_RUN"]).toBe("1");
  });
});

describe("backend", () => {
  it("watch rejects non-GitHub input and accepts a repo", async () => {
    const { handler } = createHandler({ dir, scanFn: async () => scanOf(tomb("x", "dead")) });
    const { createServer } = await import("node:http");
    const server = createServer((q, s) => void handler(q, s));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    const post = (p: string, body: unknown) => fetch(`http://127.0.0.1:${port}/api/apps/graveyard-watch${p}`, { method: "POST", body: JSON.stringify(body) });
    expect((await post("/watch", { repo: "/etc/passwd" })).status).toBe(400);
    expect((await post("/watch", { repo: "a/b" })).status).toBe(202);
    await new Promise((r) => setTimeout(r, 300));
    const state = (await (await fetch(`http://127.0.0.1:${port}/api/apps/graveyard-watch/state`)).json()) as { watched: string[]; snapshots: Record<string, unknown> };
    expect(state.watched).toContain("a/b");
    expect(state.snapshots["a/b"]).toBeTruthy();
    server.close();
  });
});
