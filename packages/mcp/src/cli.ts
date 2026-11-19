#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startHttp } from "./http.js";
import { createServer } from "./server.js";

const HELP = `revenant-mcp - Revenant MCP server

Usage:
  revenant-mcp                 serve over stdio (what Kiro launches)
  revenant-mcp --http [port]   serve streamable HTTP on 127.0.0.1:<port>/mcp (default 3939)

Env:
  REVENANT_WORKSPACE   directory all file access is confined to (default: current directory)
  GITHUB_TOKEN         raises GitHub API limits`;

async function main(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stderr.write(`${HELP}\n`);
    return;
  }
  const i = argv.indexOf("--http");
  if (i >= 0) {
    const port = Number(argv[i + 1] ?? 3939);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port.");
    await startHttp(port);
    process.stderr.write(`revenant-mcp listening on http://127.0.0.1:${port}/mcp\n`);
    return;
  }
  await createServer().connect(new StdioServerTransport());
  process.stderr.write("revenant-mcp ready on stdio\n");
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
