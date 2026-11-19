# Requirements: Final polish

Input: the independent judge-style review `qa-final` (items P1-1 to P1-3, P2-1 to P2-8). Scope: `apps/web`, `README.md`, `docs/`, `.kiro/`, `KIRO_LOG.md` and the submission pack. The engine is unchanged. Invariants that stay in force: every epitaph cites its source field (tested); `bower/bower` live example shows dead tombstones; all three Resurrect recipes end on `revenant-crypt` PRs #1, #2, #3; keyboard flow and focus return; reduced motion; no sideways scroll at 390 px; WCAG AA; Lighthouse mobile on prod at least 95 for performance and accessibility.

## User stories

- As a judge, I want the hero and the share image to say only what a click does, so that no claim contradicts the Resurrect card.
- As a judge reading the README, I want screenshots that match the live site and a quickstart whose buttons exist.
- As a judge reading the Kiro write-up, I want "spec-driven" claims that match the log, including where code came first.
- As a keyboard user, I want focus to move into the Resurrect dialog when it starts.

## Acceptance criteria (EARS)

### Honest claims (P1-1, P1-3)
- R1.1 THE SYSTEM SHALL NOT say in the hero, the narrative, the og image or the twitter image that a click raises or opens a pull request.
- R1.2 THE SYSTEM SHALL say a click shows the Kiro spec, the patch, the property tests and the real pull request it became.
- R1.3 THE SYSTEM SHALL use the same claim in SUBMISSION.md, VIDEO.md, BLOG.md and SOCIAL.md.
- R1.4 THE SYSTEM SHALL describe the build as spec-driven and state that the log records where code came first; VIDEO.md, KIRO_WRITEUP.md and SUBMISSION.md SHALL NOT say "spec first" flatly.

### README media (P1-2)
- R2.1 WHEN this change is deployed THE SYSTEM SHALL ship README images captured from prod: desktop hero, graveyard, evidence drawer, Resurrect ending on the PR card, mobile hero.
- R2.2 THE SYSTEM SHALL delete a docs image only when nothing links it.
- R2.3 THE README quickstart SHALL name only buttons that exist on prod ("Haunt the sandbox repo", "or scan bower/bower").

### UI (P2-1 to P2-5)
- R3.1 WHILE the Resurrect stage shows its end state THE SYSTEM SHALL NOT overlap the stage text with the version number or the crack.
- R3.2 WHEN Resurrect starts THE SYSTEM SHALL move focus to the first control inside the stage dialog, and return it on close.
- R3.3 THE SYSTEM SHALL use one term, "differential tests", for the old-versus-new tests, with the count read from recorded output.
- R3.4 WHERE the viewport is 390 px wide THE SYSTEM SHALL keep the hero links from wrapping a single link onto its own row.
- R3.5 THE SYSTEM SHALL NOT leave an empty dark band under the desktop hero.

### Pack and log (P2-6 to P2-8)
- R4.1 THE SYSTEM SHALL record the prod Lighthouse run (13.6.0, mobile, one run, 2026-11-19, 100/100/100/100) beside the local run.
- R4.2 THE KIRO_LOG gravekeeper line SHALL say the agent reads and reports and does not re-scan.
- R4.3 THE SYSTEM SHALL ship `design.md` with one mermaid diagram for `mcp-server` and `crew-app`, describing the code as built.
