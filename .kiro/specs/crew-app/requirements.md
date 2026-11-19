# Requirements: Graveyard Watch (Kiro Crew app)

Graveyard Watch is a Kiro Crew app that watches GitHub repositories for dependencies that have died, shows them as a graveyard, and lets an agent resurrect them. It reuses the Revenant engine and the Revenant MCP server.

## R1. Watchlist

**User story:** As a maintainer, I want to list the repositories I care about, so that Revenant keeps checking them.

- R1.1 WHEN the user adds a value of the form `owner/name` or a github.com URL THE SYSTEM SHALL store the normalized `owner/name` and scan it.
- R1.2 IF the value is not a GitHub repository (local path, other host, traversal characters) THEN THE SYSTEM SHALL refuse it and store nothing.
- R1.3 WHEN the user removes a repository THE SYSTEM SHALL delete it and its snapshot.
- R1.4 THE SYSTEM SHALL start with `RamSuryaCH/revenant-crypt` in the watchlist.

## R2. Graveyard page

- R2.1 THE SYSTEM SHALL provide a dashboard page "Graveyard Watch" showing, per watched repository, its dead, dying and living counts, graveyard score and last scan time.
- R2.2 WHEN a scan has found packages that are dead now and were not dead at the previous scan THE SYSTEM SHALL list them in a "Newly dead" section with repository and cause.
- R2.3 WHEN the user selects a tombstone THE SYSTEM SHALL show its cause of death with the cited API field and source for every claim, the successor if known, and whether a curated recipe exists.
- R2.4 WHEN a package has a curated recipe THE SYSTEM SHALL offer a "Resurrect" action that opens a chat with the necromancer agent.
- R2.5 WHILE a scan is running THE SYSTEM SHALL show progress and keep the previous results visible.
- R2.6 IF a scan fails THEN THE SYSTEM SHALL show the reason and keep the previous snapshot.
- R2.7 THE SYSTEM SHALL use the same visual language as the Revenant web app and honour `prefers-reduced-motion`.

## R3. Nightly job

- R3.1 THE SYSTEM SHALL register one scheduled job, nightly, that rescans every watched repository.
- R3.2 WHEN a rescan finds newly dead packages THE SYSTEM SHALL report them in the job output, which reaches the Kiro Crew bell.
- R3.3 WHEN it has no previous snapshot to compare with THE SYSTEM SHALL record a baseline and report no new deaths.
- R3.4 THE nightly job SHALL run `scripts/reset.sh` in a local clone of `RamSuryaCH/revenant-crypt` and in no other repository.
- R3.5 IF the clone's origin is not `RamSuryaCH/revenant-crypt`, or the script does not pin that repository, THEN THE SYSTEM SHALL skip the reset and record why.
- R3.6 THE SYSTEM SHALL record every run (time, scanned count, newly dead, errors, reset result) and show the last run on the page.
- R3.7 IF one repository fails to scan THEN THE SYSTEM SHALL continue with the others.

## R4. Agents, skills and MCP

- R4.1 THE SYSTEM SHALL ship a `necromancer` agent that runs a curated resurrection through the Revenant MCP tools and verifies the patch.
- R4.2 THE SYSTEM SHALL ship a `gravekeeper` agent that explains the watch results with cited evidence only.
- R4.3 THE SYSTEM SHALL ship skills describing the resurrection workflow and the watch operations.
- R4.4 THE SYSTEM SHALL register the Revenant MCP server for the app's agents.

## R5. Safety and honesty

- R5.1 THE SYSTEM SHALL write only inside its own data directory, except for running the guarded reset script.
- R5.2 THE SYSTEM SHALL write state atomically and under a lock, because the backend and the nightly job share it.
- R5.3 THE SYSTEM SHALL contain no credentials; `GITHUB_TOKEN` is read from the environment only.
- R5.4 THE SYSTEM SHALL never invent a cause of death: every cause shown comes from engine evidence.

## R6. Installation

- R6.1 THE SYSTEM SHALL be installable from the `apps/crew` directory with `kirocrew app install`, needing only Node.
- R6.2 THE README SHALL document install, enable, the cron, and the environment variables.
