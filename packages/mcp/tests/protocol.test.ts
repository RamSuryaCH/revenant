import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("MCP protocol", () => {
  it("lists four retriever-friendly tools and returns refusals as isError data", async () => {
    const server = createServer({ root: process.cwd(), scan: async () => { throw new Error("offline"); } });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([server.connect(a), client.connect(b)]);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["apply_recipe", "explain_tombstone", "plan_resurrection", "scan_dependencies"]);
    for (const t of tools) expect(t.description).toMatch(/Do not use/);

    const res = await client.callTool({ name: "plan_resurrection", arguments: { package: "moment", workspace: "/etc" } });
    expect(res.isError).toBe(true);
    expect(JSON.parse((res.content as { text: string }[])[0]!.text)).toMatchObject({ ok: false, error: { code: "outside-workspace" } });
    await client.close();
  });
});
