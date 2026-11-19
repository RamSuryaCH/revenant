// Standalone check: spawn the built server over stdio and call every tool with a raw MCP client.
// Usage: pnpm --filter @revenant/mcp build && pnpm --filter @revenant/mcp smoke [workspace-dir]
import { mkdtempSync, cpSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));
const sample = resolve(here, "../../../samples/cursed");
const ws = mkdtempSync(join(tmpdir(), "revenant-smoke-"));
cpSync(sample, join(ws, "cursed"), { recursive: true, filter: (s) => !s.endsWith("node_modules") });

const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(new StdioClientTransport({ command: "node", args: [join(here, "../dist/cli.js")], env: { ...process.env, REVENANT_WORKSPACE: ws } }));

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const body = JSON.parse(r.content[0].text);
  console.log(`\n# ${name} ${JSON.stringify(args)} -> ${r.isError ? "ERROR" : "ok"}`);
  return body;
};

console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "));
const scan = await call("scan_dependencies", { target: "cursed" });
console.log(scan.ok ? `${scan.summary.dead} dead, ${scan.summary.dying} dying, ${scan.summary.living} living; worst: ${scan.graveyard.slice(0, 3).map((g) => g.name).join(", ")}` : scan.error);
const why = await call("explain_tombstone", { package: "moment" });
console.log(why.ok ? `${why.status}: ${why.causeOfDeath?.text}` : why.error);
const plan = await call("plan_resurrection", { package: "moment", workspace: "cursed" });
console.log(plan.ok ? plan.written.map((w) => w.path).join("\n") : plan.error);
const patch = await call("apply_recipe", { package: "request", workspace: "cursed" });
console.log(patch.ok ? `${patch.files.length} files, patch ${patch.patch.length} chars, sources modified: ${patch.sourceFilesModified}` : patch.error);
const evil = await call("plan_resurrection", { package: "moment", workspace: "/etc" });
console.log(evil.error);
console.log("spec dir:", readdirSync(join(ws, "cursed/.kiro/specs")).join(", "));
await client.close();
