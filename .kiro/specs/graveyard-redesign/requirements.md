# Requirements: Graveyard redesign, "The Ledger of the Dead"

Input: the approved art direction (`DESIGN_DIRECTION.md`, round 3, not committed) and its critique of the live site. Scope is `apps/web` only. The engine, the API routes and the data contract do not change. Every existing behaviour stays: precomputed sample in under 3 s, live scan streaming, non-npm message, Resurrect (spec, patch, tests, link to the real sandbox PR), and epitaphs that cite their source field.

## User stories

- As a judge with five seconds, I want to see real tombstones with an epitaph and its source, and one obvious action, without scrolling.
- As a visitor reading the graveyard, I want the dead packages to be the loudest thing on the page and the living ones to be quiet.
- As a skeptic, I want every claim on a tombstone to show the API field it came from.
- As a viewer of the demo video, I want one continuous Resurrect shot that uses only real response data.
- As a phone user at 360 or 390 px, I want no sideways scrolling, whatever the repo name.
- As a keyboard, screen-reader or motion-sensitive user, I want the same outcome without a mouse or animation.

## Acceptance criteria (EARS)

### First viewport
- R1.1 WHEN the landing page loads at 1440x900 or 390x844 THE SYSTEM SHALL show, without scrolling, a headline, one scan control, and three tombstones taken from the precomputed sample, each with name, version, status word and glyph, an epitaph, and at least one source chip.
- R1.2 THE SYSTEM SHALL NOT render a moon or any decorative disc as the brightest object in the hero.
- R1.3 THE SYSTEM SHALL provide a single combined input and Scan button that is never disabled; IF the field is empty WHEN Scan is pressed THEN THE SYSTEM SHALL focus the field and show a hint.
- R1.4 THE SYSTEM SHALL show the sandbox-repo link and the express link as readable text links at 14 px or larger.
- R1.5 THE SYSTEM SHALL make the hero tombstones keyboard focusable and open the same detail view as the graveyard.
- R1.6 THE SYSTEM SHALL render the hero without waiting for a network call (hero tombstones are bundled data derived from the sample).

### Graveyard hierarchy
- R2.1 THE SYSTEM SHALL show dead and dying packages first as large stone cards, and living packages as a collapsed ledger that expands on request.
- R2.2 THE SYSTEM SHALL state the summary as "N of M direct dependencies are dead or dying" and SHALL NOT show a bare percentage as the headline number.
- R2.3 THE SYSTEM SHALL clamp epitaphs at a word boundary, never inside a URL token, and SHALL show the full text in the detail view.
- R2.4 THE SYSTEM SHALL provide an All, Dead, Dying and Alive filter with counts, each at least 44 px tall.
- R2.5 THE SYSTEM SHALL wrap long repository names so that `document.documentElement.scrollWidth` equals `window.innerWidth` at 360 and 390 px in every state.
- R2.6 THE SYSTEM SHALL mark status with a glyph and a word as well as colour.

### Evidence
- R3.1 THE SYSTEM SHALL show, on each stone card, the source chips (source name and field path) of its first epitaph, at 12 px or larger.
- R3.2 THE SYSTEM SHALL show in the detail view an evidence table with Claim, Field and Source columns, where every epitaph, the cause of death and the successor appear with each cited field.
- R3.3 THE SYSTEM SHALL derive every rendered claim from engine tombstone data; it SHALL NOT invent a claim or a source.
- R3.4 WHERE the cited evidence has a URL THE SYSTEM SHALL link the source chip to it.

### Detail view
- R4.1 THE SYSTEM SHALL show tombstone detail in a native `dialog` styled as a right-hand drawer on desktop and a bottom sheet below 768 px.
- R4.2 WHEN the detail view is open THE SYSTEM SHALL trap focus, close on Escape and return focus to the tombstone that opened it.
- R4.3 THE SYSTEM SHALL keep the Resurrect action in a sticky footer of the drawer.
- R4.4 WHERE a dead package has no curated recipe THE SYSTEM SHALL replace the action with a plain statement and the suggested successor.

### Resurrect moment
- R5.1 WHEN the user presses Resurrect THE SYSTEM SHALL play one Web Animations API timeline of about 5 seconds: crack, ember, strike-through and typed successor name, three artifact cards (patch, spec, tests), PR card, pull-back.
- R5.2 THE SYSTEM SHALL render only real response values in the sequence (patch line counts, file counts, spec file names, test file path, PR number).
- R5.3 IF the response arrives later than the animation THEN THE SYSTEM SHALL hold the ember beat until it arrives and SHALL NOT show completion early.
- R5.4 IF the request fails THEN THE SYSTEM SHALL reverse the crack, show the error text and offer a retry.
- R5.5 WHEN the user presses Escape or a Skip control during the sequence THE SYSTEM SHALL finish it immediately to its final state.
- R5.6 WHILE `prefers-reduced-motion: reduce` is set, or the in-page Reduce motion toggle is on, THE SYSTEM SHALL show the same five states as static steps with captions and no translation, parallax, drift or particles.

### PR result
- R6.1 WHEN the sandbox repo is scanned and the Gravekeeper pull request exists THE SYSTEM SHALL show a PR card with the repository, number, an Open chip, the +/- line counts and a link to GitHub.
- R6.2 WHERE no pull request exists or the lookup fails THE SYSTEM SHALL say so plainly and still offer the patch download and the `git apply` command.
- R6.3 THE SYSTEM SHALL NOT hold or request any GitHub write token.

### Scan progress
- R7.1 WHILE a live scan streams THE SYSTEM SHALL show a source ledger of the five sources and empty plots that fill as tombstones arrive.
- R7.2 WHEN the stream reports progress THE SYSTEM SHALL announce it in an `aria-live="polite"` region.

### Quality gates
- R8.1 THE SYSTEM SHALL meet WCAG 2.2 AA contrast (4.5:1 text, 3:1 UI) for every foreground and background token pair; a unit test SHALL compute and assert this.
- R8.2 THE SYSTEM SHALL have no text below 12 px.
- R8.3 THE SYSTEM SHALL be operable by keyboard along scan, tombstone, detail, Resurrect.
- R8.4 THE SYSTEM SHALL reach Lighthouse mobile performance 90 or higher, accessibility 95 or higher, LCP under 2.5 s on the Vercel preview.
- R8.5 THE SYSTEM SHALL load only OFL fonts through `next/font` and original SVG and CSS art, with no raster image above the fold.
- R8.6 THE SYSTEM SHALL keep the epitaph-source invariant tested: a test over the sample asserts that every tombstone claim the UI renders has a non-empty source and field.
