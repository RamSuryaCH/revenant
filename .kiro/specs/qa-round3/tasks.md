# Tasks: Round 3 QA fixes

- [ ] 1. Engine scoring: stable packages stay living
  - [ ] 1.1 gate the staleness penalty on vulnerabilities or legacy
  - [ ] 1.2 Stable epitaph with citations, drop stale-publish for living
  - [ ] 1.3 stable-package fixture test, scoring tests updated
  - _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5_
- [ ] 2. Engine cache and notes
  - [ ] 2.1 `ScanCache` and `headSha` with tests
  - [ ] 2.2 human-readable notes, non-npm messages
  - _Requirements: R1.2, R1.3, R3.1, R5.1, R5.2_
- [ ] 3. Scan route uses the cache
  - _Requirements: R1.1, R1.4, R1.5, R1.6, R7.1_
- [ ] 4. Web UI wording, contrast, focus, tabs, hint
  - _Requirements: R3.2, R3.3, R4.1, R4.2, R4.4, R4.5, R5.3_
- [ ] 5. Resurrect animation with reduced-motion fallback
  - _Requirements: R4.3, R6.1, R6.2_
- [ ] 6. Regenerate samples, gate, PR, deploy, browser verification on desktop and mobile
