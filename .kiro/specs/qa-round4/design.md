# Design: Round 4 QA fixes

## Context (C4 L1/L2, unchanged)
Browser (Next.js app `apps/web`) -> route handlers `/api/scan`, `/api/resurrect`, `/api/gravekeeper` -> engine (`@revenant/engine`, read-only) -> npm, deps.dev, OSV, Scorecard, GitHub. No write token exists in the app.

## Changes by requirement

| Req | Change | File |
|---|---|---|
| R1.1 | Hero example is `bower/bower` (measured 10 s locally with token: 11 dead direct). Constant `LIVE_EXAMPLE`. | `App.tsx`, `Hero.tsx` |
| R1.2, R1.3 | `summaryLine` reports direct and indirect separately and a total; "all alive" form. Filter "All" and alive row already use the full list. | `lib/ledger.ts` |
| R1.4 | State word "checked, nothing to cite". | `Graveyard.tsx` |
| R2 | Card `<button>` loses transform; hover lift and rise move to an inner `.stone-face`. `tombrise` animates the `<li>` with `animation-fill-mode: backwards` and `pointer-events` always on. | `Stone.tsx`, `globals.css` |
| R3 | `/api/gravekeeper` also reads `GET /repos/RamSuryaCH/revenant-crypt/pulls/N` (read token, already in use) and returns `totals {additions, deletions, files}`. `PrCard` shows "Patch (source files of <repo>)" and "Whole pull request incl. spec and tests". | `api/gravekeeper/route.ts`, `PrCard.tsx`, `ResurrectSequence.tsx` |
| R4.1, R4.2 | `friendlyError()` maps TypeError and unknown to the plain sentence; failure text gets a full stop; effect focuses the Try again button on `phase === "failed"`. | `ResurrectSequence.tsx` |
| R4.3, R4.4 | `normalizeRepo()` turns `owner/repo` into the GitHub URL, used by Hero and the scan route. Scan route probes `api.github.com/repos/o/r` only when package.json is missing, to tell 404/private from "no package.json". | `lib/repo.ts`, `api/scan/route.ts`, `App.tsx` |
| R5.1 | Hero epitaph uses `clampAtClause` (cut at `,` `;` ` see ` or ` in `), plus the existing chips. | `lib/ledger.ts`, `Stone.tsx` |
| R5.2, R5.3 | `.field` uses `overflow-wrap: normal` with `<wbr>` after separators; claim cell prints the full cause. | `Drawer.tsx`, `globals.css` |
| R5.4 | "Open an issue" link to the repo's new-issue URL with title/body query. | `Drawer.tsx` |
| R5.5 | Chip label "view JSON" when the URL host is an API host; icon on all. | `Drawer.tsx` |
| R5.6 | Engine text is not edited (out of scope). The drawer shows the cited field value beside the claim, which names the version. Recorded as skipped: needs an engine wording change. | n/a |
| R5.7 | Header `min-height: 100svh` flex column with the footer line pinned; body background continuous. | `Hero.tsx`, `globals.css` |
| R6.1 | Stage grid: stone centred left, cards column right, all inside the dialog; PR card replaces cards in place. | `ResurrectSequence.tsx`, `globals.css` |
| R6.2, R6.3 | Candle follows the pointer via CSS vars (already on `.stone`; extended to `.hstone`); fog drift keyframes; counter tick runs once. All behind `html[data-reduce="false"]` and `@media (prefers-reduced-motion: no-preference)`. | `globals.css`, `Stone.tsx` |
| R6.4 | Caption under the PR card. | `PrCard.tsx` |
| R7 | Padding on footer links; "(3 shown)". | `App.tsx`, `Hero.tsx` |

## Error paths
Network failure, 4xx/5xx JSON, 5xx HTML all map to a sentence plus the fixed suffix. GitHub totals failure omits the totals line.

## Security
No new write path. The only new upstream call is a read-only GET to GitHub with the existing token, server side. `normalizeRepo` accepts only `[\w.-]+/[\w.-]+`; the issue link is built with `encodeURIComponent`.

## Testing
Unit: `normalizeRepo`, `summaryLine` (all-alive and mixed), `clampAtClause`, `friendlyError`, `prTotals` parser. Existing property and structural tests unchanged. Browser: prod verification listed in the PR.

## Well-Architected review
| Pillar | Finding | Severity |
|---|---|---|
| Operational Excellence | Prod verification steps are listed in the PR. | info |
| Security | Read-only upstream call only; input pattern-checked. | info |
| Reliability | GitHub failure degrades to omitted totals. | low |
| Performance | Extra GitHub call is on the cached gravekeeper route (s-maxage 60). | low |
| Cost | No new services. | info |
| Sustainability | Fog and candle are CSS only and paused when the tab is hidden. | info |

## Cost model
No new cost drivers: one extra GitHub REST read per gravekeeper lookup, cached at the edge for 60 s.
