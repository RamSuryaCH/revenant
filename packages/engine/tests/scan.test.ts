import { describe, expect, it } from "vitest";
import { classifyInput, parseGithubUrl, scan, ScanError } from "../src/scan.js";
import { ScanResult } from "../src/schema.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Minimal fake of the five public APIs. */
function fakeFetch(opts: { rateLimit?: boolean } = {}): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (opts.rateLimit) return new Response("slow down", { status: 429 });
    if (url.startsWith("https://registry.npmjs.org/request/")) return json({ version: "2.88.2", deprecated: "request has been deprecated", repository: { url: "git+https://github.com/request/request.git" } });
    if (url.startsWith("https://registry.npmjs.org/")) return json({ version: "1.0.0", repository: { url: "https://github.com/o/fresh" } });
    if (url.includes("api.deps.dev/v3/systems/npm/packages/request")) return json({ versions: [{ versionKey: { version: "2.88.2" }, publishedAt: "2020-02-11T00:00:00Z", isDefault: true, isDeprecated: true }] });
    if (url.includes("api.deps.dev/v3/systems/npm/packages/")) return json({ versions: [{ versionKey: { version: "1.0.0" }, publishedAt: "2026-10-01T00:00:00Z", isDefault: true, isDeprecated: false }] });
    if (url.startsWith("https://api.github.com/repos/request/request/commits")) return json([{ commit: { message: "last words\n\nbody", committer: { date: "2020-02-11T00:00:00Z" } } }]);
    if (url.startsWith("https://api.github.com/repos/")) return json({ archived: url.includes("request/request"), pushed_at: "2020-02-11T00:00:00Z" });
    if (url.startsWith("https://api.securityscorecards.dev/")) return json({ score: 3.6 });
    if (url === "https://api.osv.dev/v1/querybatch") {
      const q = (JSON.parse(String(init?.body)) as { queries: { package: { name: string } }[] }).queries;
      return json({ results: q.map((x) => (x.package.name === "request" ? { vulns: [{ id: "GHSA-p8p7-x288-28g6" }] } : {})) });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const manifest = JSON.stringify({ dependencies: { request: "^2.88.2", fresh: "^1.0.0" } });

describe("scan", () => {
  it("builds a schema-valid graveyard from a pasted package.json", async () => {
    const seen: string[] = [];
    const r = await scan({ kind: "package-json", text: manifest }, { fetchImpl: fakeFetch(), onTombstone: (t) => seen.push(t.name), now: new Date("2026-11-19T00:00:00Z") });
    expect(() => ScanResult.parse(r)).not.toThrow();
    expect(seen.sort()).toEqual(["fresh", "request"]);
    const req = r.tombstones.find((t) => t.name === "request")!;
    expect(req.status).toBe("dead");
    expect(req.vulnerabilityIds).toEqual(["GHSA-p8p7-x288-28g6"]);
    expect(req.causeOfDeath?.text).toContain("last words");
    expect(r.tombstones.find((t) => t.name === "fresh")?.status).toBe("living");
    expect(r.summary).toMatchObject({ total: 2, dead: 1, living: 1, graveyardScore: 50 });
  });

  it("caps direct dependencies and says so", async () => {
    const big = JSON.stringify({ dependencies: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`fresh${i}`, "^1.0.0"])) });
    const r = await scan({ kind: "package-json", text: big }, { fetchImpl: fakeFetch(), maxDirect: 3 });
    expect(r.tombstones).toHaveLength(3);
    expect(r.truncated).toBe(true);
    expect(r.notes.join(" ")).toMatch(/3 of 6/);
  });

  it("raises a rate-limited error when every source is down so callers can fall back to cache", async () => {
    await expect(scan({ kind: "package-json", text: manifest }, { fetchImpl: fakeFetch({ rateLimit: true }) })).rejects.toMatchObject({ code: "rate-limited" });
    await expect(scan({ kind: "package-json", text: manifest }, { fetchImpl: fakeFetch({ rateLimit: true }) })).rejects.toBeInstanceOf(ScanError);
  });

  it("rejects invalid manifests", async () => {
    await expect(scan({ kind: "package-json", text: "{nope" }, { fetchImpl: fakeFetch() })).rejects.toMatchObject({ code: "invalid-manifest" });
  });

  it("returns a friendly empty result for non-npm repositories", async () => {
    const f = (async (input: string | URL | Request) => (String(input).endsWith("/go.mod") ? new Response("module x", { status: 200 }) : new Response("nf", { status: 404 }))) as typeof fetch;
    const r = await scan({ kind: "github", url: "https://github.com/o/gorepo" }, { fetchImpl: f });
    expect(r.ecosystem).toBe("unsupported");
    expect(r.tombstones).toHaveLength(0);
    expect(r.notes[0]).toMatch(/Go project/);
  });

  it("classifies and validates inputs", () => {
    expect(classifyInput("https://github.com/expressjs/express").kind).toBe("github");
    expect(classifyInput('{"dependencies":{}}').kind).toBe("package-json");
    expect(classifyInput("./some/dir").kind).toBe("path");
    expect(parseGithubUrl("https://github.com/a/b.git")).toEqual({ owner: "a", repo: "b" });
    expect(parseGithubUrl("https://evil.example/github.com/a/b")).toBeNull();
  });
});
