# Revenant

> Resurrect the open-source packages your project buried.

**Live demo: https://revenant-beta.vercel.app** (no login; one click loads a cached cursed repo in under a second)

Revenant maps a repository's npm dependencies as a graveyard. Dead and dying packages become **tombstones** with epitaphs and a cause of death; healthy ones are **living lanterns**. Every sentence cites the API field it came from, so nothing is invented. For three curated migrations, **Resurrect** produces:

1. a **Kiro spec** (EARS requirements, mermaid design, traceable tasks),
2. a **unified diff** you can download as a `.patch` and `git apply`,
3. **differential property-based tests** (fast-check) that run the old library and the replacement side by side.

Built for Kiroween 2026, category **Resurrection**.

<!-- screenshot placeholders: docs/hero.png, docs/graveyard.png, docs/resurrect.png -->

## What it does

| Step | Detail |
|---|---|
| Scan | GitHub URL, local path or pasted `package.json`. Direct dependencies plus a capped set of transitive ones (the ones with the most known vulnerabilities). |
| Facts | npm registry (deprecation), deps.dev (publish dates), OSV `querybatch` (vulnerabilities), OpenSSF Scorecard, GitHub REST (archived, last commit). |
| Judge | Pure vitality score 0 to 100. Deprecated or archived means dead. |
| Epitaph | Each epitaph carries `Evidence { source, field, value }`. A property test proves every cited value equals the value in the source facts. |
| Resurrect | Curated recipes: `moment` to `dayjs`, `request` to native fetch, `uuid@3` to `crypto.randomUUID`. |

Honest limits: exactly three recipes; other packages get "no curated recipe yet". Successors come from a small curated table (labelled `curated`) or from the package's own deprecation message. Differential tests cover pure behaviour (dates, UUID shape, HTTP request/response), not everything a library can do. Mutating `moment` calls and streaming `request` calls are flagged with `TODO(revenant)` instead of being silently rewritten. The AI-written plan for uncurated packages is not built.

## Run it

```bash
pnpm install
pnpm --filter @revenant/engine build
pnpm --filter @revenant/web dev          # http://localhost:3000

# CLI
node packages/engine/dist/cli.js scan https://github.com/expressjs/express
node packages/engine/dist/cli.js scan samples/cursed --out scan.json
node packages/engine/dist/cli.js resurrect scan.json moment --from samples/cursed --patch moment.patch
```

`GITHUB_TOKEN` (server side only) raises GitHub rate limits. Live scans that hit a rate limit or timeout fall back to the cached sample with a visible note.

## Layout

```
packages/engine   zod schema (frozen), scanner, scoring, recipes, CLI  (@revenant/engine)
apps/web          Next.js App Router graveyard UI, /api/scan (NDJSON stream), /api/resurrect
samples/cursed    haunted input project; cached output lives in apps/web/public/samples
.kiro             specs, steering, hooks, agents (see KIRO_LOG.md)
```

The engine is a package with clean exports so an MCP server and a Kiro Crew app can consume the same `ScanResult` and `Resurrection` JSON.

## Tests

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Vitest unit tests plus fast-check properties (at least 100 runs): scoring bounds and monotonicity, the evidence-equality invariant, no-op on unrelated code, and differential old-versus-new tests for each recipe against the real `moment`/`dayjs`, `request` and `uuid@3`.

## Built with Kiro

See [KIRO_LOG.md](KIRO_LOG.md) for an honest, dated account, and `.kiro/` for the specs, steering, hooks and custom agents. Design notes: [DESIGN.md](DESIGN.md).

## License

MIT
