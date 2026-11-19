import { createServer as createHttpServer, type Server } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import type { ToolDeps } from "./tools.js";

const LOCAL_HOST = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/;

/**
 * Optional streamable-HTTP transport. Stateless, loopback only, and it checks the Host header
 * so a web page cannot reach it through DNS rebinding.
 */
export function startHttp(port: number, deps?: ToolDeps): Promise<Server> {
  const http = createHttpServer(async (req, res) => {
    if (!LOCAL_HOST.test(req.headers.host ?? "")) {
      res.writeHead(403).end("Forbidden host");
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    const server = createServer(deps);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) res.writeHead(500).end();
    }
  });
  return new Promise((resolve, reject) => {
    http.once("error", reject);
    http.listen(port, "127.0.0.1", () => resolve(http));
  });
}
