---
inclusion: always
description: Stack, repository layout, commands and engineering conventions for Revenant.
---

# Tech

- Monorepo with pnpm workspaces. Node 20+. TypeScript strict everywhere.
- `packages/engine`: ESM, zod schema, CLI `revenant`. Relative imports end in `.js`. Vitest and fast-check.
- `apps/web`: Next.js App Router, Tailwind. Server-only secrets (`GITHUB_TOKEN`).
- `samples/cursed`: input fixture. Output goes to `apps/web/public/samples/` via `pnpm sample`.
- Data sources: deps.dev, OSV `querybatch`, OpenSSF Scorecard, npm registry, GitHub REST. No others.

## Commands

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm sample        # regenerate cached ScanResult and Resurrection samples (needs network)
pnpm embed         # re-embed recipe test files into the engine
```

## Conventions

- Facts first, prose second: build `PackageFacts`, then render text that cites `FIELDS`.
- Property tests use at least 100 runs.
- Disk is tight: one lockfile, no duplicate installs, delete build output you do not need.
- Commit messages: Conventional Commits.
