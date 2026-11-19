# Requirements: Graveyard UI

A dark, cinematic Next.js app where a ScanResult becomes a graveyard of tombstones and living trees.

## User stories

- As a judge, I want one click to a rich graveyard so that I see the product in seconds without a repo.
- As a developer, I want to paste a repo URL and watch tombstones rise as data arrives.
- As a user of assistive technology or a phone, I want the same information without motion or a mouse.

## Acceptance criteria (EARS)

- R1.1 WHEN the user activates "Exhume a cursed repo" THE SYSTEM SHALL load the cached sample from static JSON and render the graveyard in under 3 seconds.
- R1.2 WHEN the user submits a GitHub URL THE SYSTEM SHALL stream tombstones as they are produced.
- R1.3 IF a live scan is rate-limited, times out or fails THEN THE SYSTEM SHALL show the cached sample with a visible note stating why.
- R1.4 IF the repository is not an npm project THEN THE SYSTEM SHALL show a friendly message naming the detected ecosystem.
- R2.1 THE SYSTEM SHALL show dead and dying packages as tombstones with their epitaphs, and living packages as trees or lanterns.
- R2.2 WHEN a tombstone is opened THE SYSTEM SHALL show its cause of death and every epitaph's source field.
- R3.1 WHEN Resurrect is activated on a tombstone with a recipe THE SYSTEM SHALL show the spec, the diff, a `.patch` download, the `git apply` command and the tests.
- R3.2 WHEN the tombstone has no recipe THE SYSTEM SHALL say "no curated recipe yet" and offer nothing generated.
- R4.1 WHILE `prefers-reduced-motion` is set THE SYSTEM SHALL disable parallax, fog drift and entrance animation.
- R4.2 THE SYSTEM SHALL be fully operable by keyboard with visible focus, and expose status as text, not colour alone.
- R4.3 THE SYSTEM SHALL lay out without horizontal scroll down to 360 px width.
- R4.4 THE SYSTEM SHALL reach a Lighthouse performance score of at least 90 on the landing page.
- R5.1 THE SYSTEM SHALL stay within Vercel function limits by capping live scans and streaming results.
