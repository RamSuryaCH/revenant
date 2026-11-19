# Tasks: Gravekeeper pull requests

- [ ] 1. Make the three recipes pass the sandbox's own suite
  - [ ] 1.1 moment: enable relativeTime for `.from/.to/.humanize`, objectSupport for object construction
  - [ ] 1.2 request: unwrap fetch's `cause` so socket errors keep `code`; probe WHATWG bad ports; fix the shim path in the emitted test
  - [ ] 1.3 `scripts/verify-crypt.mts` records before/after suites and differential output per recipe
  - _Requirements: R2.1, R2.2_
- [ ] 2. Engine Gravekeeper module with guard, idempotency and PR body
  - [ ] 2.1 `openResurrectionPr` on the Git Data API, branch `revenant/<id>`
  - [ ] 2.2 `findResurrectionPr` read-only lookup
  - [ ] 2.3 Unit tests against a fake GitHub
  - _Requirements: R1.1, R1.2, R1.3, R1.4, R2.3_
- [ ] 3. CLI `revenant gravekeeper <recipe|package|all>`
  - _Requirements: R1.1, R1.5_
- [ ] 4. Web: read-only PR lookup route and Resurrect panel link, patch download kept
  - _Requirements: R3.1, R3.2, R3.3_
- [ ] 5. `/api/resurrect` accepts package names as recipe ids
  - _Requirements: R4.1_
- [ ] 6. Open the three live PRs on revenant-crypt and leave them open
  - _Requirements: R1.1, R1.3, R2.1_
