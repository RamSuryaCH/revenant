# Requirements: Design round 5 (carved stones, scroll narrative, share image, mobile sheet)

Source: independent review `qa-r4` (Awwwards items 1, 2, 5; P2-5, P2-9). Scope: `apps/web` only.

## R1 Carved stones
- R1.1 WHEN the hero or the graveyard renders a dead or dying package THE SYSTEM SHALL draw it as an inline SVG tombstone (arch, lit edge, carved inset, grain) behind real HTML text.
- R1.2 THE SYSTEM SHALL keep name, version, status word, epitaph and source chips as selectable HTML text inside one button with the existing accessible name.
- R1.3 THE SYSTEM SHALL keep carved text at WCAG AA (4.5:1) against the darkest possible fill including the grain overlay; a unit test asserts it.
- R1.4 WHILE the in-page reduce switch or the OS preference is on THE SYSTEM SHALL render the stones without the cursor candle or any motion.
- R1.5 THE SYSTEM SHALL NOT move a stone button on hover or focus (qa-r4 P1-5).
- R1.6 IF the status is dying THEN THE SYSTEM SHALL show a crack in the SVG; status stays readable by glyph and word, not colour alone.

## R2 Scroll narrative
- R2.1 THE SYSTEM SHALL render, between the hero and the graveyard, three beats: Scan, Epitaph, Resurrect.
- R2.2 EACH beat SHALL show one real artifact read from bundled data: the scan ledger counts of the cached sample, the `request` epitaph with its cited field and source, and the recorded Resurrect result (PR number and stats from `request-to-fetch.json`). No invented numbers.
- R2.3 WHEN a beat enters the viewport THE SYSTEM SHALL reveal it once with opacity and transform only; IF reduced motion is on THEN beats are visible at once.
- R2.4 THE SYSTEM SHALL render the narrative as server HTML so it reads without JavaScript.

## R3 Share image and metadata
- R3.1 THE SYSTEM SHALL serve a 1200x630 Open Graph and Twitter image that draws the three hero stones from the same sample data.
- R3.2 THE SYSTEM SHALL set `metadataBase`, canonical, `twitter:card=summary_large_image`, and OG title, description, image with alt text.

## R4 Epitaph wording (P2-5)
- R4.1 WHEN an epitaph says "Marked deprecated on deps.dev" and cites `deps.dev.versions[isDefault].isDeprecated` THE SYSTEM SHALL display "The latest release on deps.dev is marked deprecated", so it does not read as a flag on the scanned version.
- R4.2 THE epitaph SHALL still cite its original field and source (invariant test).

## R5 Mobile (P2-9)
- R5.1 WHILE the viewport is under 768 px and the graveyard has stones THE SYSTEM SHALL pin the status filter bar to the bottom, 44 px targets, respecting the safe-area inset.
- R5.2 WHILE under 768 px THE drawer SHALL be a bottom sheet with a grab handle that dismisses on a downward drag past a threshold, and Escape and Close still work with focus returning to the opener.

## R6 Non-functional
- R6.1 No sideways scroll at 390 px. WCAG AA. Lighthouse mobile performance >= 90, accessibility >= 95.
- R6.2 Only free or openly licensed fonts and art: all art is original SVG; fonts stay OFL 1.1. No new dependency.
- R6.3 No regression: hero example bower/bower shows dead stones; the three recipes end on revenant-crypt PRs #1/#2/#3.
