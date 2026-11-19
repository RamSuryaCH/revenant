# Requirements: Revenant engine

The engine (`packages/engine`) turns a repository's npm dependencies into a frozen JSON graveyard. It is consumed by the web app, the CLI, and later an MCP server and a Kiro Crew app.

## User stories

- As a developer, I want to scan a GitHub repo, a local path or a pasted package.json so that I see which dependencies are dead or dying.
- As a reader of a tombstone, I want every claim to point at the API field it came from so that I can trust it.
- As an integrator (web, MCP, Crew), I want one frozen, validated schema so that consumers do not churn.

## Acceptance criteria (EARS)

- R1.1 THE SYSTEM SHALL define `ScanResult`, `Tombstone` and `Resurrection` as zod schemas with a `schemaVersion` field, exported from `@revenant/engine`.
- R1.2 WHEN the schema changes THE SYSTEM SHALL regenerate the cached sample scan so that it still validates.
- R2.1 WHEN given a GitHub URL THE SYSTEM SHALL read `package.json` from raw.githubusercontent.com and analyse its direct dependencies.
- R2.2 WHEN given a local directory or a pasted package.json THE SYSTEM SHALL analyse it without network access to GitHub.
- R2.3 IF the repository has no `package.json` but has `requirements.txt`, `pyproject.toml`, `go.mod` or `Cargo.toml` THEN THE SYSTEM SHALL return an empty result with a note naming the ecosystem instead of failing.
- R2.4 WHERE the dependency count exceeds the cap THE SYSTEM SHALL analyse the first N direct dependencies and record the truncation in `notes`.
- R2.5 WHERE transitive analysis is enabled THE SYSTEM SHALL analyse at most M indirect packages, ranked by known vulnerabilities, and record the cap in `notes`.
- R3.1 THE SYSTEM SHALL read facts only from npm registry, deps.dev, OSV (`querybatch`), OpenSSF Scorecard and GitHub REST.
- R3.2 THE SYSTEM SHALL attach at least one `Evidence { source, field, value }` to every epitaph, cause of death and successor.
- R3.3 FOR ALL non-curated evidence THE SYSTEM SHALL ensure the cited value equals the value held in the source facts (property tested).
- R3.4 IF a source returns HTTP 429/403 or times out THEN THE SYSTEM SHALL continue with the remaining sources and add a note naming the source.
- R3.5 IF every source is unreachable THEN THE SYSTEM SHALL raise a `rate-limited` error so that callers can fall back to cache.
- R4.1 THE SYSTEM SHALL compute vitality in 0..100 as a pure function of signals (deprecated, archived, years since publish, vulnerabilities, Scorecard, curated legacy).
- R4.2 WHEN a bad signal is added THE SYSTEM SHALL never increase vitality (property tested).
- R4.3 WHEN a package is deprecated or archived THE SYSTEM SHALL classify it as dead.
- R5.1 WHEN a tombstone is built THE SYSTEM SHALL emit tombstones progressively through an `onTombstone` callback for streaming UIs.
- R6.1 THE SYSTEM SHALL expose a CLI `revenant scan <repo|path>` and `revenant resurrect <scan.json> <package>`.
- R6.2 THE SYSTEM SHALL map a package to a curated successor and recipe id only from the curated table or from the package's own deprecation message.
