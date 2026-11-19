import { describe, expect, it } from "vitest";
import { GravekeeperError, openResurrectionPr, SANDBOX_REPO } from "../src/gravekeeper.js";

const PKG = '{\n  "name": "lantern",\n  "dependencies": {\n    "uuid": "3.4.0"\n  }\n}\n';
const IDS = 'const uuidv4 = require("uuid/v4");\nmodule.exports = () => uuidv4();\n';

/** Minimal in-memory GitHub: records every call so tests can assert on writes. */
function fakeGitHub(o: { openPulls?: { html_url: string; number: number }[]; refExists?: boolean } = {}) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      if (url.endsWith("/package.json")) return new Response(PKG);
      if (url.endsWith("/src/ids.js")) return new Response(IDS);
      return new Response("", { status: 404 });
    }
    const path = url.replace(`https://api.github.com/repos/${SANDBOX_REPO}`, "");
    if (path.startsWith("/pulls?")) return json(200, o.openPulls ?? []);
    if (path === "") return json(200, { default_branch: "main" });
    if (path === "/git/ref/heads/main") return json(200, { object: { sha: "base123" } });
    if (path === "/git/commits/base123") return json(200, { tree: { sha: "tree0" } });
    if (path.startsWith("/git/trees/")) return json(200, { tree: [{ path: "src/ids.js", type: "blob", size: 80 }] });
    if (path === "/git/trees") return json(201, { sha: "tree1" });
    if (path === "/git/commits") return json(201, { sha: "commit1" });
    if (path === "/git/refs") return o.refExists ? json(422, { message: "Reference already exists" }) : json(201, {});
    if (path.startsWith("/git/refs/heads/")) return json(200, {});
    if (path === "/pulls") return json(201, { html_url: "https://github.com/x/pull/7", number: 7 });
    return json(500, { message: `unexpected ${method} ${path}` });
  }) as typeof fetch;
  return { impl, calls };
}

describe("Gravekeeper", () => {
  it("refuses any repository other than the sandbox, before any network call", async () => {
    const g = fakeGitHub();
    await expect(openResurrectionPr({ repo: "facebook/react", recipeId: "uuid3-to-randomuuid", token: "t", fetchImpl: g.impl })).rejects.toBeInstanceOf(GravekeeperError);
    expect(g.calls).toHaveLength(0);
  });

  it("reuses an open PR for the same recipe and writes nothing", async () => {
    const g = fakeGitHub({ openPulls: [{ html_url: "https://github.com/x/pull/3", number: 3 }] });
    const r = await openResurrectionPr({ repo: SANDBOX_REPO.toLowerCase(), recipeId: "uuid3-to-randomuuid", token: "t", fetchImpl: g.impl });
    expect(r).toMatchObject({ number: 3, reused: true, branch: "revenant/uuid3-to-randomuuid" });
    expect(g.calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  });

  it("commits migrated code, Kiro spec and differential tests on a revenant/ branch", async () => {
    const g = fakeGitHub();
    const r = await openResurrectionPr({ repo: SANDBOX_REPO, recipeId: "uuid3-to-randomuuid", token: "t", fetchImpl: g.impl });
    expect(r).toMatchObject({ number: 7, reused: false });
    const tree = g.calls.find((c) => c.method === "POST" && c.url.endsWith("/git/trees"))!.body as { tree: { path: string }[] };
    const paths = tree.tree.map((t) => t.path);
    expect(paths).toContain("src/ids.js");
    expect(paths.some((p) => p.startsWith(".kiro/specs/") && p.endsWith("/requirements.md"))).toBe(true);
    expect(paths).toContain("tests/revenant/uuid3-to-randomuuid.differential.test.ts");
    const ref = g.calls.find((c) => c.url.endsWith("/git/refs"))!.body as { ref: string };
    expect(ref.ref).toBe("refs/heads/revenant/uuid3-to-randomuuid");
    const pr = g.calls.find((c) => c.method === "POST" && c.url.endsWith("/pulls"))!.body as { head: string; base: string; body: string };
    expect(pr).toMatchObject({ head: "revenant/uuid3-to-randomuuid", base: "main" });
    expect(pr.body).toContain("No recorded local run matches base");
  });

  it("moves a leftover revenant/ branch instead of failing", async () => {
    const g = fakeGitHub({ refExists: true });
    await openResurrectionPr({ repo: SANDBOX_REPO, recipeId: "uuid3-to-randomuuid", token: "t", fetchImpl: g.impl });
    const patch = g.calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toMatch(/\/git\/refs\/heads\/revenant\/uuid3-to-randomuuid$/);
  });
});
