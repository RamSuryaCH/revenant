import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { lookupField, type PackageFacts } from "../src/facts.js";
import { Tombstone } from "../src/schema.js";
import { buildTombstone } from "../src/tombstone.js";

const NOW = new Date("2026-11-19T00:00:00Z");
const iso = fc.date({ min: new Date("2010-01-01"), max: new Date("2026-11-01"), noInvalidDate: true }).map((d) => d.toISOString());
const text = fc.string({ minLength: 1, maxLength: 120 }).filter((s) => s.trim().length > 0);

const facts: fc.Arbitrary<PackageFacts> = fc.record({
  name: fc.constantFrom("moment", "request", "uuid", "left-pad", "lodash", "some-pkg", "@scope/pkg"),
  requested: fc.constant("^1.0.0"),
  version: fc.option(fc.constantFrom("1.0.0", "2.19.0", "3.4.0", "9.1.2"), { nil: null }),
  direct: fc.boolean(),
  npmDeprecated: fc.option(text, { nil: null }),
  publishedAt: fc.option(iso, { nil: null }),
  depsDevDeprecated: fc.option(fc.boolean(), { nil: null }),
  githubRepo: fc.option(fc.constant("owner/repo"), { nil: null }),
  archived: fc.option(fc.boolean(), { nil: null }),
  pushedAt: fc.option(iso, { nil: null }),
  lastCommitMessage: fc.option(text, { nil: null }),
  lastCommitDate: fc.option(iso, { nil: null }),
  scorecard: fc.option(fc.double({ min: 0, max: 10, noNaN: true }), { nil: null }),
  scorecardSource: fc.constantFrom("scorecard" as const, "deps.dev" as const),
  vulnIds: fc.array(fc.stringMatching(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/), { maxLength: 6 }),
});

describe("correctness invariant: no invented facts", () => {
  it("every epitaph, cause of death and successor cites an API field", () => {
    fc.assert(
      fc.property(facts, (f) => {
        const t = buildTombstone(f, NOW);
        expect(() => Tombstone.parse(t)).not.toThrow();
        for (const e of t.epitaphs) expect(e.evidence.length).toBeGreaterThan(0);
        if (t.status !== "living") expect(t.causeOfDeath?.evidence.length).toBeGreaterThan(0);
        if (t.successor) expect(t.successor.evidence.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });

  it("every cited non-curated value equals the value in the source facts", () => {
    fc.assert(
      fc.property(facts, (f) => {
        const t = buildTombstone(f, NOW);
        const all = [...t.epitaphs.flatMap((e) => e.evidence), ...(t.causeOfDeath?.evidence ?? []), ...(t.successor?.evidence ?? [])];
        for (const ev of all) {
          if (ev.source === "curated") continue;
          expect(lookupField(f, ev.field), `field ${ev.field}`).toEqual(ev.value);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("a deprecation epitaph quotes the npm message verbatim (prefix)", () => {
    fc.assert(
      fc.property(facts, (f) => {
        const t = buildTombstone({ ...f, npmDeprecated: "use foo instead" }, NOW);
        expect(t.epitaphs.some((e) => e.kind === "deprecated" && e.text.includes("use foo instead"))).toBe(true);
        expect(t.status).toBe("dead");
      }),
      { numRuns: 100 },
    );
  });

  it("known successors and recipes resolve as curated", () => {
    const base = { name: "request", requested: "^2.88.2", version: "2.88.2", direct: true, npmDeprecated: "deprecated", publishedAt: "2020-02-11T00:00:00Z", depsDevDeprecated: true, githubRepo: null, archived: null, pushedAt: null, lastCommitMessage: null, lastCommitDate: null, scorecard: null, scorecardSource: "scorecard", vulnIds: [] } satisfies PackageFacts;
    const t = buildTombstone(base, NOW);
    expect(t.recipeId).toBe("request-to-fetch");
    expect(t.successor?.name).toBe("native fetch");
    expect(buildTombstone({ ...base, name: "uuid", version: "9.0.0" }, NOW).recipeId).toBeNull();
  });
});
