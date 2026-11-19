import { describe, expect, it } from "vitest";
import { ScanCache, headSha } from "../src/cache.js";
import { finish } from "../src/scan.js";

const result = () => finish({ kind: "github", ref: "o/r" }, "npm", new Date("2026-11-19T00:00:00Z"), [], [], false, false);
const SHA = "a".repeat(40);

describe("ScanCache", () => {
  it("keys by repo (case-insensitive) and sha", () => {
    expect(ScanCache.key("Owner/Repo", SHA)).toBe(ScanCache.key("owner/repo", SHA));
    expect(ScanCache.key("o/r", SHA)).not.toBe(ScanCache.key("o/r", "b".repeat(40)));
  });
  it("expires entries after the ttl", () => {
    let t = 0;
    const c = new ScanCache({ ttlMs: 1000, now: () => t });
    c.set("k", result());
    t = 999;
    expect(c.get("k")).not.toBeNull();
    t = 1000;
    expect(c.get("k")).toBeNull();
    expect(c.size).toBe(0);
  });
  it("evicts the oldest entry beyond the bound", () => {
    const c = new ScanCache({ maxEntries: 2 });
    c.set("a", result());
    c.set("b", result());
    c.set("c", result());
    expect(c.get("a")).toBeNull();
    expect(c.get("b")).not.toBeNull();
    expect(c.size).toBe(2);
  });
});

describe("headSha", () => {
  const reply = (body: string, ok = true) => (async () => new Response(body, { status: ok ? 200 : 403 })) as unknown as typeof fetch;
  it("returns a 40-char sha", async () => {
    expect(await headSha("o", "r", { fetchImpl: reply(`${SHA}\n`) })).toBe(SHA);
  });
  it("returns null on errors and junk", async () => {
    expect(await headSha("o", "r", { fetchImpl: reply("nope", false) })).toBeNull();
    expect(await headSha("o", "r", { fetchImpl: reply("not a sha") })).toBeNull();
    expect(await headSha("o", "r", { fetchImpl: (async () => { throw new Error("down"); }) as unknown as typeof fetch })).toBeNull();
  });
});
