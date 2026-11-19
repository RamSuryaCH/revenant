import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { graveyardScore, penalties, statusOf, vitality, type Signals } from "../src/scoring.js";

const signals: fc.Arbitrary<Signals> = fc.record({
  deprecated: fc.boolean(),
  archived: fc.boolean(),
  yearsSincePublish: fc.option(fc.integer({ min: 0, max: 20 }), { nil: null }),
  vulnerabilityCount: fc.integer({ min: 0, max: 30 }),
  scorecard: fc.option(fc.double({ min: 0, max: 10, noNaN: true }), { nil: null }),
  legacy: fc.boolean(),
});

describe("scoring properties", () => {
  it("vitality is always within 0..100", () => {
    fc.assert(
      fc.property(signals, (s) => {
        const v = vitality(s);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }),
      { numRuns: 300 },
    );
  });

  it("adding a bad signal never raises vitality (monotonic)", () => {
    fc.assert(
      fc.property(signals, (s) => {
        expect(vitality({ ...s, deprecated: true })).toBeLessThanOrEqual(vitality(s));
        expect(vitality({ ...s, archived: true })).toBeLessThanOrEqual(vitality(s));
        expect(vitality({ ...s, vulnerabilityCount: s.vulnerabilityCount + 1 })).toBeLessThanOrEqual(vitality(s));
        expect(vitality({ ...s, yearsSincePublish: (s.yearsSincePublish ?? 0) + 1 })).toBeLessThanOrEqual(vitality(s));
      }),
      { numRuns: 300 },
    );
  });

  it("deprecated or archived packages are always dead", () => {
    fc.assert(
      fc.property(signals, fc.boolean(), (s, which) => {
        expect(statusOf(which ? { ...s, deprecated: true } : { ...s, archived: true })).toBe("dead");
      }),
      { numRuns: 200 },
    );
  });

  it("a clean, fresh package is living", () => {
    expect(statusOf({ deprecated: false, archived: false, yearsSincePublish: 0, vulnerabilityCount: 0, scorecard: 8 })).toBe("living");
    expect(penalties({ deprecated: false, archived: false, yearsSincePublish: null, vulnerabilityCount: 0, scorecard: null })).toBe(0);
  });

  it("status is consistent with vitality bands", () => {
    fc.assert(
      fc.property(signals, (s) => {
        const status = statusOf(s);
        if (!s.deprecated && !s.archived) {
          const v = vitality(s);
          expect(status).toBe(v <= 40 ? "dead" : v <= 75 ? "dying" : "living");
        }
      }),
      { numRuns: 300 },
    );
  });

  it("graveyard score is the share of non-living direct deps", () => {
    expect(graveyardScore([])).toBe(0);
    expect(graveyardScore([{ status: "dead" }, { status: "living" }])).toBe(50);
  });
});
