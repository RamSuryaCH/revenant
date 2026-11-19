# Requirements: Round 3 QA fixes

Input: the independent QA review `qa-r2` (not committed; findings P1-1 to P1-5, P1-8 and one P2 are quoted below). Scope is the live scan and the graveyard UI. The epitaph invariant (every epitaph, cause of death and successor cites an API field) is unchanged and stays property-tested.

## User stories

- As a judge who scans a well-known repo twice, I want the second scan to be instant so that I never see a rate-limit fallback for a repo I just scanned.
- As a judge who knows Express, I want finished, stable modules (`depd`, `etag`, `once`) not to be called dying so that the headline number is credible.
- As a first-time visitor, I want one sentence that says what the graveyard score means and which direction is good.
- As a keyboard or low-vision user, I want readable contrast, visible focus and no forced motion.
- As a visitor who pastes a Python, Go or monorepo URL, I want an accurate explanation instead of a dead end.

## Acceptance criteria (EARS)

### Caching (P1-1)
- R1.1 WHEN a live scan is requested for a repository whose current commit SHA was scanned within the last 10 minutes THE SYSTEM SHALL replay the stored result without calling npm, deps.dev, OSV or Scorecard, and mark it `fromCache: true`.
- R1.2 THE SYSTEM SHALL key cached results by repository and commit SHA, so a new commit is never served a stale result.
- R1.3 THE SYSTEM SHALL bound the cache (at most 50 entries, 10 minute TTL, oldest evicted first).
- R1.4 WHEN a scan is served from cache THE SYSTEM SHALL NOT count it against the per-IP scan limit.
- R1.5 IF the commit SHA cannot be read THEN THE SYSTEM SHALL scan normally and store nothing.
- R1.6 THE SYSTEM SHALL NOT cache a result that was cut short by the serverless time budget.

### Stable packages are not dying (P1-2)
- R2.1 THE SYSTEM SHALL treat age since last publish as a risk signal only when the package also has a known unpatched vulnerability or a curated legacy mark.
- R2.2 WHEN a package is not deprecated, not archived, has no known vulnerability and no legacy mark THE SYSTEM SHALL classify it `living` however long ago it was published.
- R2.3 WHEN a living package has not been published for a year or more THE SYSTEM SHALL say so as a stable epitaph ("Stable: ... no known vulnerabilities, not deprecated") that cites the publish date and vulnerability fields.
- R2.4 THE SYSTEM SHALL keep deprecated and archived packages `dead`, and keep moment (legacy mark) `dying`.
- R2.5 THE SYSTEM SHALL carry a test with a stable, finished package fixture (old publish date, clean) that must be `living`.

### Wording (P1-3, P1-4)
- R3.1 THE SYSTEM SHALL phrase scan notes for a person, for example "Showing 12 of 199 indirect packages, picked by known vulnerabilities."
- R3.2 THE SYSTEM SHALL show, next to the graveyard score, one line stating that it is the share of direct dependencies that are dead or dying and that lower is better.
- R3.3 THE SYSTEM SHALL label status with words that do not rely on colour alone, and use amber for dying.

### Accessibility (P1-5)
- R4.1 THE SYSTEM SHALL keep body and tombstone text at a contrast ratio of at least 4.5:1 against its background (WCAG 2.2 AA), including the bottom of the stone gradient.
- R4.2 WHILE keyboard focus is on a tombstone, filter, tab or button THE SYSTEM SHALL show a visible focus ring.
- R4.3 WHILE the `prefers-reduced-motion: reduce` setting is on THE SYSTEM SHALL play no decorative animation, including the resurrect animation.
- R4.4 THE SYSTEM SHALL implement the Resurrect output tabs as a keyboard-operable tab list (arrow keys, Home, End, one tab stop).
- R4.5 WHEN the live scan button is disabled THE SYSTEM SHALL say why in text next to the input.

### Non-npm repositories (P1-8)
- R5.1 WHEN a repository has no root `package.json` but has a Python, Go or Rust manifest THE SYSTEM SHALL say that Revenant reads npm projects today and name the ecosystem it found.
- R5.2 WHEN a repository has no recognised manifest at all THE SYSTEM SHALL say Revenant reads npm projects with a root `package.json`, and that monorepo packages in subfolders are not scanned yet.
- R5.3 THE SYSTEM SHALL show these messages as an explanation, not as an error.

### Resurrect animation (P2)
- R6.1 WHEN the Resurrect output appears THE SYSTEM SHALL play a short (under 1.2 s) tombstone-rising animation using only transform and opacity.
- R6.2 IF reduced motion is requested THEN THE SYSTEM SHALL show the final state with no animation.

### Constraints
- R7.1 THE SYSTEM SHALL NOT add a GitHub write token or any new secret to the web app.
