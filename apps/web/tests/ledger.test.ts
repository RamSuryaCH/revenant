import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ScanResult } from "@revenant/engine";
import { HERO_STONES } from "../src/data/hero-sample";
import { artifactFacts, clampAtWord, evidenceRows, patchCounts, sourceChips, summaryLine } from "../src/lib/ledger";

const sample = JSON.parse(readFileSync(new URL("../public/samples/cursed.scan.json", import.meta.url), "utf8")) as ScanResult;

describe("evidence stays attached to every claim the UI renders", () => {
  it("every row for every sample tombstone has a source, a field and a non-empty claim", () => {
    for (const t of sample.tombstones) {
      const rows = evidenceRows(t);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.claim.length).toBeGreaterThan(0);
        expect(r.chips.length).toBeGreaterThan(0);
        for (const c of r.chips) {
          expect(c.source).toBeTruthy();
          expect(c.field).toBeTruthy();
          if (c.url) expect(c.url.startsWith("https://")).toBe(true);
        }
      }
    }
  });

  it("every stone card shows at least one chip", () => {
    for (const t of sample.tombstones) expect(sourceChips(t).chips.length).toBeGreaterThan(0);
  });

  it("hero tombstones are identical to the precomputed sample", () => {
    for (const h of HERO_STONES) expect(h).toEqual(sample.tombstones.find((t) => t.name === h.name));
  });
});

describe("clampAtWord", () => {
  it("returns short text unchanged", () => expect(clampAtWord("short", 20)).toBe("short"));
  it("cuts at a word boundary and never inside a URL", () => {
    const text = 'Deprecated: "request has been deprecated, see https://github.com/request/request/issues/3142"';
    const out = clampAtWord(text, 60);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/https?:\/\/\S*…$/);
    expect(out.length).toBeLessThanOrEqual(61);
  });
  it("drops a single oversize token whole", () => expect(clampAtWord("x".repeat(80), 20)).toBe("…"));
});

describe("summaryLine", () => {
  it("counts direct dependencies, not a percentage", () => {
    const line = summaryLine(sample.tombstones);
    expect(line).toMatch(/^8 of 12 direct dependencies are dead or dying\./);
    expect(line).not.toMatch(/%/);
  });
  it("singular form", () => expect(summaryLine(sample.tombstones.filter((t) => t.name === "request"))).toBe("1 of 1 direct dependency is dead or dying."));
});

describe("patchCounts and artifactFacts", () => {
  it("ignores file headers", () => {
    expect(patchCounts("--- a/x\n+++ b/x\n@@ -1 +1,2 @@\n-old\n+new\n+more\n context")).toEqual({ added: 2, removed: 1 });
  });
  it("reads the real recipe response", () => {
    const r = JSON.parse(readFileSync(new URL("../public/samples/request-to-fetch.json", import.meta.url), "utf8"));
    const f = artifactFacts(r);
    expect(f.patch.added + f.patch.removed).toBeGreaterThan(0);
    expect(f.spec.dir).toContain(r.spec.slug);
    expect(f.tests.path).toBe(r.tests.path);
  });
});
