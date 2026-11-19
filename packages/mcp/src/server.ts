import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createTools, defaultDeps, type ToolDeps } from "./tools.js";

export const SERVER_NAME = "revenant";
export const SERVER_VERSION = "0.1.0";

type Result = { ok: boolean } & Record<string, unknown>;

/** Every tool answers with the same JSON envelope. Failures set isError so the model can recover. */
function reply(r: Result) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }],
    structuredContent: r,
    ...(r.ok ? {} : { isError: true }),
  };
}

const pkg = z.string().min(1).max(214).describe("npm package name, for example moment or @scope/name");

export function createServer(deps: ToolDeps = defaultDeps()): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const tools = createTools(deps);

  server.registerTool(
    "scan_dependencies",
    {
      title: "Scan a repository for dead dependencies",
      description:
        "Scan the npm dependencies of a GitHub repository URL or a local workspace directory and return the graveyard: how many are dead, dying or living, plus the worst packages with a one-line cause of death and a successor when one is known. Output is capped to the 20 worst packages. " +
        "Use when asked which dependencies are abandoned, deprecated or unmaintained, or to start a resurrection. " +
        "Do not use when you already have a scan this session and only need detail on one package (use explain_tombstone), or for non-npm projects (PyPI, Go and Cargo are not scanned), or to inspect code vulnerabilities in the project's own source.",
      inputSchema: {
        target: z.string().min(1).max(500).describe("GitHub URL (https://github.com/owner/repo) or a directory inside the workspace holding package.json"),
        transitive: z.number().int().min(0).max(20).optional().describe("Also analyse up to this many transitive packages, riskiest first. Default 0."),
        includeDev: z.boolean().optional().describe("Include devDependencies. Default false."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (a) => reply(await tools.scanDependencies(a)),
  );

  server.registerTool(
    "explain_tombstone",
    {
      title: "Explain why a package is dead",
      description:
        "Return the cited cause of death for one package from a scan: status, vitality, each epitaph with the exact API field and URL it was read from, the successor if any, and whether a curated resurrection recipe exists. Every claim carries evidence. " +
        "Use after scan_dependencies when asked why a package is considered dead or dying. " +
        "Do not use before any scan exists unless you pass target, or to judge a package that was not in the scanned manifest.",
      inputSchema: {
        package: pkg,
        target: z.string().min(1).max(500).optional().describe("Repo URL or workspace directory to scan first if no scan has run yet"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (a) => reply(await tools.explainTombstone(a)),
  );

  server.registerTool(
    "plan_resurrection",
    {
      title: "Write a Kiro spec for replacing a dead package",
      description:
        "Write a real Kiro spec (requirements.md, design.md, tasks.md) plus the migration patch into <workspace>/.kiro/specs/resurrect-<package>/ and return the written paths. Works only for packages with a curated recipe (moment, request, uuid@3). Refuses to write outside the workspace and refuses to overwrite an existing spec unless overwrite is true. Does not modify source files. " +
        "Use when the user wants a plan, a spec or tasks for migrating off a dead dependency. " +
        "Do not use to apply the change (use apply_recipe to read the patch, then git apply), for packages with no curated recipe, or when the package is not imported anywhere in the workspace.",
      inputSchema: {
        package: pkg,
        workspace: z.string().max(500).optional().describe("Project directory inside the workspace root. Default: the workspace root."),
        overwrite: z.boolean().optional().describe("Replace an existing resurrect spec. Default false."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (a) => reply(await tools.planResurrection(a)),
  );

  server.registerTool(
    "apply_recipe",
    {
      title: "Get the migration patch for a curated recipe",
      description:
        "Run a curated recipe (moment to dayjs, request to fetch, uuid@3 to crypto.randomUUID) over the workspace sources and return the unified diff, the files it touches, the honest list of what it could not migrate, and the differential test to run. Source files are never modified; with savePatch the diff is saved under <workspace>/.revenant/. " +
        "Use when the user wants the patch itself or asks to apply a recipe. After it, run the returned applyCommand and the test command. " +
        "Do not use for packages without a curated recipe, to rewrite code freehand, or when a spec is wanted (use plan_resurrection).",
      inputSchema: {
        package: pkg,
        workspace: z.string().max(500).optional().describe("Project directory inside the workspace root. Default: the workspace root."),
        savePatch: z.boolean().optional().describe("Also save the patch to .revenant/<name>.patch inside the workspace. Default false."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (a) => reply(await tools.applyRecipe(a)),
  );

  return server;
}
