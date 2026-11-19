import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Resurrection, ScanResult } from "@revenant/engine";
import { contrast } from "../src/lib/contrast";
import { displayEpitaph, evidenceRows } from "../src/lib/ledger";
import { narrativeFacts } from "../src/lib/narrative";

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const scan = read("../public/samples/cursed.scan.json") as ScanResult;
const req = read("../public/samples/request-to-fetch.json") as Resurrection;

/** Blend a #rrggbb colour towards black by `a` (0..1): the worst case of the grain and edge shading. */
const darken = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - a)));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};
const GRAIN_MAX = 0.12; // feColorMatrix alpha row in StoneDefs: 0.12 * noise, noise <= 1

describe("stone contrast with grain (R1.3)", () => {
  const css = readFileSync(new URL("../src/components/StoneArt.tsx", import.meta.url), "utf8");
  it("declares the grain at no more than 12 percent", () => expect(css).toContain("0.12 0 0 0 0"));
  it.each([
    ["dead top", "#c9cedb"],
    ["dead bottom", "#a6adbe"],
    ["dying top", "#d9c27a"],
    ["dying bottom", "#a69447"],
  ])("carved text on %s stays AA after darkening", (_n, fill) => {
    expect(contrast("#0b0e16", darken(fill, GRAIN_MAX))).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps the narrative plate text AA on the darkest plate stop", () => {
    const worst = darken("#a6adbe", GRAIN_MAX);
    expect(contrast("#0b0e16", worst)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#2b3042", "#a6adbe")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#1b2a63", "#a6adbe")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("epitaph wording (R4)", () => {
  const e = { text: "Marked deprecated on deps.dev", evidence: [{ field: "deps.dev.versions[isDefault].isDeprecated" }] };
  it("names the latest release", () => expect(displayEpitaph(e)).toBe("The latest release on deps.dev is marked deprecated"));
  it("leaves other text alone, even this sentence on another field", () => {
    expect(displayEpitaph({ text: "x", evidence: [{ field: "a" }] })).toBe("x");
    expect(displayEpitaph({ ...e, evidence: [{ field: "other" }] })).toBe(e.text);
    expect(displayEpitaph(undefined)).toBe("");
  });
  it("every displayed claim still cites a source and a field", () => {
    for (const t of scan.tombstones) for (const r of evidenceRows(t)) {
      expect(r.claim.length).toBeGreaterThan(0);
      expect(r.chips.length, `${t.name}: ${r.claim}`).toBeGreaterThan(0);
      for (const c of r.chips) { expect(c.field).toBeTruthy(); expect(c.source).toBeTruthy(); }
    }
  });
});

describe("narrative facts (R2.2)", () => {
  const f = narrativeFacts(scan, req);
  it("scan counts add up to the sample", () => expect(f.scan.dead + f.scan.dying + f.scan.living).toBe(f.scan.total));
  it("cites only sources that appear in the sample", () => {
    const seen = new Set(scan.tombstones.flatMap((t) => t.epitaphs.flatMap((e) => e.evidence.map((x) => x.source))));
    for (const s of f.scan.sources) if (s.packages > 0) expect(seen.has(s.id)).toBe(true);
  });
  it("the epitaph is the sample's own, with its field", () => {
    const t = scan.tombstones.find((x) => x.name === "request")!;
    expect(f.epitaph.text).toBe(t.epitaphs[0]!.text);
    expect(f.epitaph.field).toBe(t.epitaphs[0]!.evidence[0]!.field);
  });
  it("patch numbers are counted from the recorded patch", () => {
    expect(f.resurrect.added).toBeGreaterThan(0);
    expect(f.resurrect.files).toBe(req.stats.filesChanged);
  });
  it("refuses a missing package", () => expect(() => narrativeFacts(scan, req, "nope")).toThrow());
});
