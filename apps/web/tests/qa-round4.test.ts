import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ScanResult, Tombstone } from "@revenant/engine";
import { clampAtClause, summaryLine } from "../src/lib/ledger";
import { friendlyError, withStop } from "../src/lib/messages";
import { normalizeRepo, parsePrTotals, repoExists, scopeLabel } from "../src/lib/repo";

const sample = JSON.parse(readFileSync(new URL("../public/samples/cursed.scan.json", import.meta.url), "utf8")) as ScanResult;
const alive = (n: number, direct: boolean): Tombstone[] => Array.from({ length: n }, (_, i) => ({ ...sample.tombstones.find((t) => t.status === "living")!, name: `a${i}${direct}`, direct, status: "living" as const }));

describe("summaryLine (R1.2, R1.3)", () => {
  it("says all alive with the same total the filter bar shows", () => {
    const t = [...alive(28, true), ...alive(8, false)];
    expect(summaryLine(t)).toBe("36 packages checked, all alive.");
  });
  it("reports direct and indirect separately and the total", () => {
    const line = summaryLine(sample.tombstones);
    expect(line).toMatch(/^8 of 12 direct dependencies are dead or dying\./);
    expect(line).toContain(`${sample.tombstones.length} checked in all.`);
  });
});

describe("normalizeRepo (R4.3)", () => {
  it.each([
    ["octocat/Hello-World", "https://github.com/octocat/Hello-World"],
    ["  bower/bower ", "https://github.com/bower/bower"],
    ["https://github.com/bower/bower", "https://github.com/bower/bower"],
    ["github.com/bower/bower", "github.com/bower/bower"],
    ["not a url", "not a url"],
    ["./a/b", "./a/b"],
    ["a/b/c", "a/b/c"],
  ])("%s", (i, o) => expect(normalizeRepo(i)).toBe(o));
});

describe("repoExists (R4.4)", () => {
  const f = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
  it("is false on 404, true on 200, null when GitHub cannot say", async () => {
    expect(await repoExists("o", "r", { fetchImpl: f(404) })).toBe(false);
    expect(await repoExists("o", "r", { fetchImpl: f(200) })).toBe(true);
    expect(await repoExists("o", "r", { fetchImpl: f(403) })).toBeNull();
    expect(await repoExists("o", "r", { fetchImpl: (async () => { throw new TypeError("x"); }) as unknown as typeof fetch })).toBeNull();
  });
});

describe("friendlyError (R4.1)", () => {
  it("hides the browser string", () => {
    expect(friendlyError(new TypeError("Failed to fetch"))).toBe("Could not reach the server. Check your connection and try again.");
    expect(friendlyError(new Error("Failed to fetch"))).toBe("Could not reach the server. Check your connection and try again.");
  });
  it("keeps server text and adds a full stop", () => {
    expect(friendlyError(new Error("Too many requests. Try again in a few minutes."))).toBe("Too many requests. Try again in a few minutes.");
    expect(withStop("No stop")).toBe("No stop.");
  });
  it("falls back for unknown values", () => expect(friendlyError("x")).toBe("Could not resurrect."));
});

describe("clampAtClause (R5.1)", () => {
  it("cuts the request epitaph at the clause and closes the quote", () => {
    const t = 'Deprecated: "request has been deprecated, see https://github.com/request/request/issues/3142"';
    expect(clampAtClause(t, 60)).toBe('Deprecated: "request has been deprecated"');
  });
  it("leaves short text alone", () => expect(clampAtClause("short", 90)).toBe("short"));
});

describe("PR totals (R3.2, R3.3)", () => {
  it("reads GitHub's pull shape and refuses anything partial", () => {
    expect(parsePrTotals({ additions: 347, deletions: 4, changed_files: 7 })).toEqual({ additions: 347, deletions: 4, files: 7 });
    expect(parsePrTotals({ additions: 1 })).toBeNull();
    expect(parsePrTotals(null)).toBeNull();
  });
  it("names the repo a patch was computed for (R3.1)", () => {
    expect(scopeLabel("https://github.com/RamSuryaCH/revenant-crypt", false)).toBe("RamSuryaCH/revenant-crypt");
    expect(scopeLabel(null, true)).toBe("the cursed sample app");
  });
});
