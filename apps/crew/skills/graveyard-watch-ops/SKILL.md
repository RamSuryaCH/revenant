---
name: graveyard-watch-ops
description: Operating the Graveyard Watch app: the watchlist, the nightly rescan, the demo-repo reset and where its state lives. Use when the user asks why a dependency was reported as newly dead or how to change what is watched.
always: false
triggers: graveyard watch, newly dead, nightly rescan, watchlist, demo reset, revenant-crypt
---

# Graveyard Watch operations

- State file: `<crew home>/apps/graveyard-watch/data/state.json` (override with `REVENANT_WATCH_DATA`). Read it, do not hand-edit it while the backend runs.
- "Newly dead" means dead in the latest scan and not dead in the previous one. The first scan of a repo is a baseline and reports none.
- The nightly job runs at 02:00: it rescans every watched repo, records the run in `state.json` (`nightly`), then runs `scripts/reset.sh` in a local clone of `RamSuryaCH/revenant-crypt`. It skips the reset, and says why, when the clone's origin or the script's pinned repo is anything else.
- `REVENANT_CRYPT_DIR` points at the clone. `REVENANT_RESET_DRY_RUN=1` previews the reset. `GITHUB_TOKEN` raises GitHub rate limits.
- Only `owner/name` GitHub repositories can be watched.
