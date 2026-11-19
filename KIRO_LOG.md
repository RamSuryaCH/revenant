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

## 2026-11-19 (round 3: QA fixes)

- **Spec first.** `.kiro/specs/qa-round3/` (requirements, design, tasks) was committed in `7d638a2` before any code change, from the findings in the QA review `qa-r2` (not committed).
- **Dying noise.** The QA review showed Express reporting 11 "dying" packages, mostly small finished modules (`depd`, `etag`, `once`). Cause: the staleness penalty (up to 35 points) pushed clean packages under the dying line. Staleness now counts only together with a known vulnerability or a curated legacy mark. Re-scanning Express locally after the fix: 36 packages, 0 dead, 0 dying, 36 living. This is a judgement call, not a ground truth; the Stable epitaph states which facts it rests on, and both a stable fixture and a vulnerable-and-old fixture are tested.
- **Cache.** `ScanCache` (engine) keyed by repo and commit SHA, 10 minute TTL, 50 entries. Checked locally with a read-only token: first scan of revenant-crypt 5.1 s, second 0.47 s with `fromCache: true`. It lives in one serverless instance, so a cold instance rescans; no shared store was added.
- **Wording, accessibility, animation.** Notes rewritten for people, score caption added, dying stones amber with darker stone bases (text now full-strength ink on #9097a8 and #a08f45, both above 4.5:1 by calculation), tab list with arrow keys, scan hint text, a tombstone-rising animation that reduced-motion turns off. I did not run an automated contrast checker or Lighthouse this round.
- **Not done.** Hooks still not exercised through the Kiro hook runner; multi-folder monorepo scanning is stated as unsupported rather than built; mobile filter chips still wrap.
## 2026-11-19 (MCP server and Graveyard Watch Crew app)

- **Specs before crew code.** `.kiro/specs/crew-app` and `.kiro/specs/mcp-server` (requirements and tasks) were committed before `apps/crew`. The MCP server code (`packages/mcp`) was written first and its spec after; the spec header says so.
- **MCP server.** Four tools over stdio, optional loopback-only streamable HTTP. 21 vitest tests, including `..` traversal, symlink escapes, overwrite refusal and a protocol-level listing. A raw-client smoke run (`pnpm --filter @revenant/mcp smoke`) called all four tools against a copy of `samples/cursed`: 8 dead, 1 dying, 3 living; `/etc` as workspace refused.
- **Crew app.** Scaffolded with `kirocrew app init`, then edited. Installed locally with `kirocrew app install apps/crew`. `kirocrew app enable` was refused by Kiro Crew's third-party trust policy; the owner must approve it in the App Store. Later the same day, on the owner's go-ahead, `graveyard-watch` was added to `agent.apps_trusted` (that one app only; `agent.apps_allow_third_party` stayed off) and enabled: 2 agents and 2 skills registered, backend healthy on port 9101, cron `graveyard-watch/nightly-rescan` registered for 02:00 IST.
- **Manual run of the watch logic (not the cron).** `node apps/crew/bin/nightly.mjs` was run twice from a terminal with `REVENANT_WATCH_DATA=/tmp/gwdata` and `REVENANT_RESET_DRY_RUN=1`, against live GitHub and registry data for `RamSuryaCH/revenant-crypt`. Run 1 recorded a baseline; run 2 compared with it. Output of run 2: "no new deaths across 1 watched repo(s)"; snapshot 2 dead, 1 dying, 0 living, graveyard score 100; reset ran in dry-run and listed `revenant/uuid3-to-randomuuid` for deletion without deleting it.
- **Hooks.** The existing `.kiro` hooks were not triggered through Kiro in this round (no Kiro IDE hook runner was used).
- **Scheduled job runs (Kiro Crew cron, triggered with `kirocrew cron trigger`).**
  - 2026-11-19 14:56 UTC: scanned 1 repo, 0 newly dead. The reset ran **live**: the cron `env` override I had added did not reach the command, so `reset.sh` closed demo PRs #1-#3 on `RamSuryaCH/revenant-crypt` and deleted their branches. I recreated the three branches at their exact previous head SHAs and reopened the PRs within minutes (the "Nightly reset" close comments remain on them). Fix: the reset is now a dry run unless `REVENANT_RESET_LIVE=1`, with a test.
  - 2026-11-19 14:59 UTC: scanned 1 repo, 0 newly dead, reset in dry-run; all three demo PRs still open.
- **Page check.** Kiro Crew blocks agents from capturing its own dashboard, so the page was checked by rendering the shipped `ui/index.mjs` against the live backend in `apps/crew/scripts/preview.mjs` with Playwright. That is the README screenshot. The in-dashboard page itself was not seen by the agent.
- **Not verified:** whether the agents can call the MCP tools under the name `@graveyard-watch:revenant` inside a Crew chat.

## 2026-11-19 (round 3b: Ledger of the Dead redesign)

- **Spec first.** `.kiro/specs/graveyard-redesign/` (requirements with EARS criteria, design with mermaid diagrams, traced tasks) and the rewritten `.kiro/steering/design-system.md` were committed before any UI code. Input was an art-direction research note (`DESIGN_DIRECTION.md`, not committed) that critiqued the live site.
- **Scope.** `apps/web` only; the engine, API routes and data contract are unchanged and no write token is added.
- **Built to the spec.** New tokens and OFL fonts, a hero that shows three real cited tombstones, stone cards for the dead and a collapsed ledger for the living, an evidence-table drawer, and one Web Animations API timeline for Resurrect fed by the real response. Contrast is a unit test over every token pair (`apps/web/tests/contrast.test.ts`), and a second test asserts every rendered claim keeps its source and field.
- **Measured, not assumed.** Lighthouse mobile first scored 88 (LCP 2.9 s, TBT 320 ms) on a local production build. Making the hero entrance transform-only and lazy-loading the graveyard and drawer lifted it to 96 with TBT 10 ms. The default simulated LCP stayed at 2.8 s locally while the Chrome-throttled run reported 1.5 s; both are recorded in PR #5.
- **A bug found by looking.** On a 390 px screen the first hero build clipped the scan box because a grid column had no `min-width: 0`. `overflow-x: clip` hid it from the scrollWidth check, so the check alone was not enough; a screenshot caught it.
- **Not done by Kiro.** The Vercel preview sits behind deployment protection, so the preview could not be opened in an unauthenticated browser; production is checked after the merge.
