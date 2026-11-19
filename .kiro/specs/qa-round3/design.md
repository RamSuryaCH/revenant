# Design: Round 3 QA fixes

## Cache (R1)
`packages/engine/src/cache.ts` exports `ScanCache` (Map with TTL, max entries, injectable clock) and `headSha(owner, repo, token, fetchImpl)` which calls `GET /repos/{o}/{r}/commits/HEAD` with `Accept: application/vnd.github.sha`. The route keeps one module-level `ScanCache`. Per serverless instance only, so a cold instance rescans; the limit is documented, a shared store is not added (no new infrastructure, no new secret).

Route flow: validate input, read SHA, cache hit then replay (`start`, each `tombstone`, `done` with `fromCache: true`) before the rate-limit check, else rate-limit, scan, store when complete and not time-boxed.

## Scoring (R2)
Staleness penalty applies only when `vulnerabilityCount > 0 || legacy`. Everything else is unchanged, so the monotonicity properties hold (more years or more vulnerabilities never raise vitality). A living package aged one year or more gets a "Stable" epitaph, and the `stale-publish` epitaph is dropped for living packages.

## Wording and UI (R3, R4, R6)
- Notes rewritten in `scan.ts`; sample regenerated with `pnpm sample`.
- Score caption under the number; amber token `--color-amber` for dying, stone gradients darkened at the base so ink text passes 4.5:1.
- Tab list gets roving tabindex and arrow keys. Scan button hint text via `aria-describedby`.
- Resurrect animation: CSS `@keyframes tomb-rise` (translateY and opacity, 900 ms) on a small tombstone glyph inside the panel, disabled by the existing reduced-motion block.

## Non-npm copy (R5)
`scan.ts` messages changed; the UI shows `unsupported` and `not-found` results as a calm info panel.

## Well-Architected note
Reliability: cache reduces GitHub calls per judge click. Security: no new secret, cache holds only public data. Cost: in-memory, zero. Known limit: not shared across instances.

## Test strategy
Unit: cache TTL/eviction/key; stable-package fixture; scoring properties; messages for non-npm; epitaph-evidence property unchanged and extended with stable cases.
