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
- **Tasks checked off as code landed.** The engine, recipes and graveyard UI task lists were ticked after the matching code and tests existed (UI and mocked-fetch scan tests landed after the specs were written, so those tasks were genuinely open when the specs were committed). Lighthouse on the deployed landing: performance 100, accessibility 100, best practices 100.

## 2026-11-19 (round 2: Gravekeeper)

- **Spec before code, this time.** `.kiro/specs/gravekeeper-pr/` (requirements, design, tasks) was committed in `47b189c` before the implementing commit `982b079`; the git history shows the order.
- **Design changed after review.** The first draft had a web route that opened PRs with a server-side write token. An independent QA review (`.conductor/qa-r2.md`, not committed) flagged that a public button backed by a broad token would give every visitor write access. The conductor ruled it out; the spec records the decision. PRs are now opened by the `gravekeeper` agent's local run (`revenant gravekeeper all`) with the maintainer's own `gh` token, and the deployed app only reads and links them.
- **Real proof found real bugs.** Running each recipe against the sandbox's own suite (`scripts/verify-crypt.mts`) failed two of three at first: the moment recipe missed the relativeTime and objectSupport plugins (`.from()`, `.humanize()`, `moment.utc({..})`), and the request shim lost `err.code` because fetch wraps socket errors in `cause` and refuses WHATWG bad ports. Both were fixed in the recipe, a new differential property covers connection errors, and all three now pass 16/16.
- **Live PRs.** [revenant-crypt#1](https://github.com/RamSuryaCH/revenant-crypt/pull/1), [#2](https://github.com/RamSuryaCH/revenant-crypt/pull/2), [#3](https://github.com/RamSuryaCH/revenant-crypt/pull/3), left open. Re-running the command reused #1 instead of opening a duplicate. GitHub Actions checks on them fail in 2-3 s because of the account billing lock, so the local suite output is pasted in each PR body.
- **Agent updated.** `.kiro/agents/gravekeeper.json` now describes what it really does (verify, then open or reuse sandbox PRs).
- **Still not done.** Hooks are still not exercised through the Kiro hook runner.

## 2026-11-19 (MCP server and Graveyard Watch Crew app)

- **Specs before crew code.** `.kiro/specs/crew-app` and `.kiro/specs/mcp-server` (requirements and tasks) were committed before `apps/crew`. The MCP server code (`packages/mcp`) was written first and its spec after; the spec header says so.
- **MCP server.** Four tools over stdio, optional loopback-only streamable HTTP. 21 vitest tests, including `..` traversal, symlink escapes, overwrite refusal and a protocol-level listing. A raw-client smoke run (`pnpm --filter @revenant/mcp smoke`) called all four tools against a copy of `samples/cursed`: 8 dead, 1 dying, 3 living; `/etc` as workspace refused.
- **Crew app.** Scaffolded with `kirocrew app init`, then edited. Installed locally with `kirocrew app install apps/crew`. `kirocrew app enable` was refused by Kiro Crew's third-party trust policy; the owner must approve it in the App Store. **Until that happens the page, the agents and the cron registration are unverified, and the cron has not run.**
- **Manual run of the watch logic (not the cron).** `node apps/crew/bin/nightly.mjs` was run twice from a terminal with `REVENANT_WATCH_DATA=/tmp/gwdata` and `REVENANT_RESET_DRY_RUN=1`, against live GitHub and registry data for `RamSuryaCH/revenant-crypt`. Run 1 recorded a baseline; run 2 compared with it. Output of run 2: "no new deaths across 1 watched repo(s)"; snapshot 2 dead, 1 dying, 0 living, graveyard score 100; reset ran in dry-run and listed `revenant/uuid3-to-randomuuid` for deletion without deleting it.
- **Hooks.** The existing `.kiro` hooks were not triggered through Kiro in this round (no Kiro IDE hook runner was used).
