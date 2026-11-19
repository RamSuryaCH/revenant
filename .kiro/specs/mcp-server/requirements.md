# Requirements: Revenant MCP server

Note on history: `packages/mcp` code was written before this spec. The spec records the contract the code was built to and is what the tests check.

## R1. Transport and tools

- R1.1 THE SYSTEM SHALL be an MCP server built with `@modelcontextprotocol/sdk` that serves over stdio.
- R1.2 WHERE `--http` is given THE SYSTEM SHALL serve streamable HTTP on 127.0.0.1 only and refuse requests whose Host header is not loopback.
- R1.3 THE SYSTEM SHALL expose `scan_dependencies`, `explain_tombstone`, `plan_resurrection` and `apply_recipe`.
- R1.4 THE SYSTEM SHALL write each tool description for retrieval: what it does, when to use it, and a "Do not use" clause.

## R2. Behaviour

- R2.1 WHEN `scan_dependencies` gets a GitHub URL or a workspace directory THE SYSTEM SHALL return the summary and at most 20 worst packages, and say when output was truncated.
- R2.2 WHEN `explain_tombstone` is called THE SYSTEM SHALL return the cause of death with every evidence field and URL.
- R2.3 WHEN `plan_resurrection` is called for a curated package THE SYSTEM SHALL write `requirements.md`, `design.md`, `tasks.md` and the patch into `<workspace>/.kiro/specs/resurrect-<package>/` and return the paths.
- R2.4 WHEN a spec directory already exists THE SYSTEM SHALL refuse unless `overwrite` is true.
- R2.5 WHEN `apply_recipe` is called THE SYSTEM SHALL return the patch, touched files, honest limits and the differential test command, and SHALL NOT modify source files.
- R2.6 IF a package has no curated recipe THEN THE SYSTEM SHALL say so and list the curated ones.

## R3. Safety

- R3.1 THE SYSTEM SHALL refuse any directory outside the workspace root (`REVENANT_WORKSPACE`, else cwd), including `..` paths and symlinks that lead out.
- R3.2 THE SYSTEM SHALL validate package names as npm names before using them in a path.
- R3.3 IF a tool fails THEN THE SYSTEM SHALL return `{ok:false, error:{code,message,retryable}}` with `isError` set, not a protocol error.
- R3.4 THE SYSTEM SHALL cap patch and test output size.

## R4. Distribution

- R4.1 THE SYSTEM SHALL ship a ready-to-paste `.kiro/settings/mcp.json` example and be registered in this repository's own `.kiro/settings/mcp.json`.
- R4.2 THE SYSTEM SHALL be verifiable standalone with a raw client script (`pnpm --filter @revenant/mcp smoke`).
