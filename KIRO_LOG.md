# Kiro log

An honest record of how Kiro was used to build Revenant. This project was built inside **Kiro Crew** (a Kiro app) by an agent working through spec-driven work items. It was not built in the Kiro IDE, and nothing below claims IDE-only features such as the IDE spec panel.

## 2026-11-19

- **Plan review.** A separate reviewer agent stress-tested the plan before coding (`.conductor/review-r1.md`, not committed). Its advice shaped the MVP: frozen schema first, cached default path, three curated recipes, honest limits.
- **Engine first pass, then specs.** The engine (schema, scoring, sources, scanner, three recipes) was written first as a vertical slice to prove the data sources. The specs in `.kiro/specs/` were written immediately after, from the working code and the acceptance list, and then used to drive the remaining work (traceable task lists, checked off as code lands). They did not exist before that first slice; the log does not pretend otherwise.
- **Steering.** `product.md` and `tech.md` (always included) and `design-system.md` (only for `apps/web/**`) capture the honesty rules and conventions. The "no invented facts" rule is enforced by a property test (`epitaph-evidence.test.ts`).
- **Hooks (`.kiro/hooks`).**
  - `schema-regenerate-sample`: schema, tombstone or scoring change runs `pnpm sample` and the schema validation test.
  - `recipe-change-run-pbt`: a recipe, shim or differential test change re-embeds the files and runs all recipe properties.
  - `spec-traceability-check`: an agent prompt that checks requirement ids against task citations when a spec changes.
- **Agents (`.kiro/agents`).** `medium` (writes specs from evidence), `necromancer` (applies recipes and runs differential tests), `gravekeeper` (re-scans and diffs). The spec generator in `packages/engine/src/recipes/spec.ts` implements the Medium's output format in code; the agent files describe the same contract for Kiro to use.
- **Property-based testing.** fast-check drives three kinds of tests: scoring invariants, evidence equality, and differential old-versus-new tests for each recipe against the real libraries (moment/dayjs, request/fetch shim, uuid@3/randomUUID).
- **Known gaps.** The hooks have been authored but only the commands they run were exercised by hand, not through the Kiro hook runner. The AI-written plan for uncurated packages is not built.
