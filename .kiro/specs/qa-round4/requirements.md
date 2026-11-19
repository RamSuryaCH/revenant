# Requirements: Round 4 QA fixes and staged Resurrect

Input: the independent QA review `qa-r4` of the live Ledger of the Dead build (items P0-1, P1-1 to P1-5, P2-1 to P2-10, Awwwards items 3 and 4). Scope is `apps/web` only. The engine is unchanged. Invariants that stay in force: every epitaph, cause of death and successor cites an API source and field (tested); no write token in the public app; keyboard flow and focus return; no sideways scroll at 390 px; WCAG AA contrast.

## User stories

- As a judge who clicks the one live example on the hero, I want to see real dead packages so that I believe the data is real.
- As a judge who compares our PR card to GitHub, I want every number to say what it covers so that nothing looks inflated or inconsistent.
- As a keyboard user whose request fails, I want a plain message and focus on "Try again".
- As a developer, I want to type `owner/repo` and be told plainly when the repo does not exist.
- As a viewer of the demo video, I want the Resurrect shot centred and full, and the hero to feel alive without being noisy.

## Acceptance criteria (EARS)

### Live example and counts (P0-1)
- R1.1 THE SYSTEM SHALL offer, as the hero's live example, a public repository whose root `package.json` yields at least 3 dead direct dependencies and that scans in under 20 seconds (`bower/bower`, verified before the swap).
- R1.2 WHEN a scan finishes THE SYSTEM SHALL state the same package total in the headline, the filter bar and the alive row.
- R1.5 WHILE a scan is still streaming THE SYSTEM SHALL show only the running count, never a verdict such as "all alive".
- R1.3 WHEN a scan finds no dead or dying package THE SYSTEM SHALL say "N packages checked, all alive".
- R1.4 WHEN a source was read but no epitaph cites it THE SYSTEM SHALL label it "checked, nothing to cite", never "cited by no package".

### Hit target (P1-5)
- R2.1 WHILE a stone card is rising or hovered THE SYSTEM SHALL keep its click target stationary (no transform on the button; lift is drawn on an inner layer).
- R2.2 WHEN a user clicks a card within one second of load, scroll or drawer close THE SYSTEM SHALL open its drawer on the first click.

### PR card numbers (P1-1)
- R3.1 THE SYSTEM SHALL label the patch line with the repository it was computed for ("source files of <repo>").
- R3.2 WHERE a pull request is found THE SYSTEM SHALL show that pull request's own additions, deletions and file count as read from GitHub, labelled as including the Kiro spec and tests.
- R3.3 IF GitHub cannot return the pull request totals THEN THE SYSTEM SHALL omit them, not estimate them.
- R3.4 WHEN the view comes from the cached sample THE SYSTEM SHALL NOT say "your scan".

### Errors (P1-2, P1-3)
- R4.1 IF the resurrect request fails to reach the server THEN THE SYSTEM SHALL show "Could not reach the server. Check your connection and try again." followed by a full stop and "The crack closed. Nothing was written anywhere.".
- R4.2 WHEN a resurrect attempt fails THE SYSTEM SHALL move keyboard focus to "Try again".
- R4.3 THE SYSTEM SHALL accept `owner/repo` as a repository reference.
- R4.4 IF the repository does not exist or is private THEN THE SYSTEM SHALL say so, distinct from "no package.json at the root".

### Hero and drawer text (P1-4, P2-2 to P2-5, P2-10)
- R5.1 THE SYSTEM SHALL show each hero epitaph cut at a clause boundary with a source chip, or with a "more in the evidence" cue.
- R5.2 THE SYSTEM SHALL NOT break field paths mid-word in the evidence table except at `.`, `[` or `]`.
- R5.3 THE SYSTEM SHALL NOT print "(in full above)" in a claim cell.
- R5.4 WHEN a dead package has no curated recipe THE SYSTEM SHALL link "Open an issue" with the package and reason prefilled.
- R5.5 THE SYSTEM SHALL mark every source chip that opens raw API data with "view JSON" and the same external icon.
- R5.6 WHEN the epitaph cites `versions[isDefault].isDeprecated` THE SYSTEM SHALL word it as "latest release (x.y.z) is marked deprecated" only if the engine text names the default version; otherwise the UI SHALL render the engine text unchanged. (Wording itself is engine text; see design.)
- R5.7 THE SYSTEM SHALL fill the viewport below the hero with the page background (no black band or seam at 1440x900).

### Resurrect staging and ambience (Phase B)
- R6.1 THE SYSTEM SHALL centre the stone on the Resurrect stage and show the three artifact cards beside it, filling the stage.
- R6.2 WHERE motion is allowed THE SYSTEM SHALL draw a cursor candle on hero stones, a slow fog drift and a ticking counter.
- R6.3 WHILE the in-page Reduce motion switch is on OR the OS prefers reduced motion THE SYSTEM SHALL disable candle, fog drift, counter tick and the animated timeline (the stepper stays).
- R6.4 THE SYSTEM SHALL disclose, in a caption, that the Resurrect click reads the open pull request and does not create one.

### Other (P2-7 to P2-9)
- R7.1 THE SYSTEM SHALL give footer source links a 44 px tall hit area.
- R7.2 THE SYSTEM SHALL label the hero counter "(3 shown)" against the stones' heading.
