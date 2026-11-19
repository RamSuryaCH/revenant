# Requirements: Resurrection recipes

Curated, tested migrations for exactly three abandoned packages: `moment` to `dayjs`, `request` to native fetch, `uuid@3` to `crypto.randomUUID`.

## User stories

- As a maintainer, I want one click on a tombstone to give me a Kiro spec, a patch and tests so that I can migrate with evidence.
- As a reviewer, I want old-versus-new behaviour compared by property-based tests so that I trust the diff.
- As a user with an uncovered package, I want an honest "no curated recipe yet" instead of a guess.

## Acceptance criteria (EARS)

- R1.1 WHEN a recipe is run on repository files THE SYSTEM SHALL return a `Resurrection` containing a Kiro spec (requirements, design, tasks), a unified diff, an apply command and a differential test file.
- R1.2 WHEN the patch is applied with `git apply` to the files it was generated from THE SYSTEM SHALL apply without errors.
- R1.3 IF no source file uses the package THEN THE SYSTEM SHALL return an empty patch and a note, not an invented change.
- R2.1 WHEN a call site uses behaviour a recipe cannot express THEN THE SYSTEM SHALL insert a `TODO(revenant)` comment or leave the file unchanged, and list it in `notes`.
- R2.2 WHEN source code does not mention the package THE SYSTEM SHALL leave it byte-identical (property tested).
- R3.1 THE SYSTEM SHALL ship differential tests, run with at least 100 generated inputs per property, for each recipe against the real old library.
- R3.2 WHEN the recipe test files change THE SYSTEM SHALL re-embed them and re-run them (hook).
- R4.1 WHEN a package has no curated recipe THE SYSTEM SHALL say so and generate nothing.
- R4.2 WHERE an LLM key is configured THE SYSTEM MAY offer an AI-written plan, rate-limited and token-capped, off by default. (Not built in this release.)
- R5.1 THE SYSTEM SHALL state each recipe's limits in the spec and in the UI.
