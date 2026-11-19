# Requirements: Gravekeeper pull requests

Turn a curated resurrection into a real, reviewable pull request on the sandbox repository `RamSuryaCH/revenant-crypt`, and show that pull request in the web app.

Decision (2026-11-19, after QA review `qa-r2`): pull requests are opened by a local Gravekeeper run with the maintainer's own `gh` credentials. The deployed web app holds only a read token and never writes to GitHub. A public button backed by a broad write token would hand every visitor write access to the account.

## User stories

- As a judge, I want to click through to a real pull request for each curated recipe so that I can see the migration, its Kiro spec and its tests as a reviewer would.
- As the maintainer, I want one command to open (or find) the pull request for a recipe so that the demo is repeatable without duplicate PRs.
- As a reviewer of the PR, I want the sandbox's own test suite output in the PR body so that I can trust the change while GitHub Actions is unavailable.
- As a visitor with any other repository, I want the patch download path so that I can apply the migration myself.

## Acceptance criteria (EARS)

- R1.1 WHEN `revenant gravekeeper <recipe>` runs with a GitHub token THE SYSTEM SHALL open a pull request on `RamSuryaCH/revenant-crypt` from branch `revenant/<recipe-id>` that contains the migrated sources, the Kiro spec under `.kiro/specs/<slug>/` and the differential property tests.
- R1.2 IF the target repository is anything other than `RamSuryaCH/revenant-crypt` THEN THE SYSTEM SHALL refuse before making any network call.
- R1.3 WHEN an open pull request already exists for the recipe's branch THE SYSTEM SHALL return it and write nothing.
- R1.4 IF the `revenant/<recipe-id>` branch exists without an open pull request THEN THE SYSTEM SHALL move only that branch to the fresh commit.
- R1.5 THE SYSTEM SHALL accept `all` to run the three curated recipes in sequence.
- R2.1 WHEN a local verification run matches the PR's base commit THE SYSTEM SHALL include the sandbox suite result before and after migration and the differential test output in the PR body.
- R2.2 IF no verification matches the base commit THEN THE SYSTEM SHALL say so in the PR body instead of claiming a pass.
- R2.3 THE SYSTEM SHALL list the recipe's limits and the honest notes in the PR body.
- R3.1 WHEN a resurrection is shown for the sandbox repository THE SYSTEM SHALL look up the open Gravekeeper pull request read-only and show its link, or say that none is open.
- R3.2 THE SYSTEM SHALL keep the patch download available for every repository, including the sandbox.
- R3.3 THE SYSTEM SHALL never expose a write-capable token to the deployed app, the client, logs or the repository.
- R4.1 WHEN `/api/resurrect` receives a package name (`moment`, `request`, `uuid`) as `recipeId` THE SYSTEM SHALL treat it as the matching curated recipe id.
