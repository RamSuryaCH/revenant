import type { IncomingMessage, ServerResponse } from "node:http";
import { loadState, normalizeRepo, updateState } from "./core/store.js";
import { rescan, type ScanFn } from "./core/watch.js";
import { APP_NAME } from "./core/types.js";

const PREFIX = `/api/apps/${APP_NAME}`;
const MAX_BODY = 4096;

export interface Runtime {
  scanning: Set<string>;
  errors: Map<string, string>;
}

function send(res: ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) throw new Error("Request body too large.");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  const v: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function createHandler(opts: { scanFn?: ScanFn; dir?: string } = {}) {
  const rt: Runtime = { scanning: new Set(), errors: new Map() };
  const scanArgs = { ...(opts.scanFn ? { scanFn: opts.scanFn } : {}), ...(opts.dir ? { dir: opts.dir } : {}) };

  const startScan = (repo: string) => {
    if (rt.scanning.has(repo)) return;
    rt.scanning.add(repo);
    rt.errors.delete(repo);
    rescan(repo, scanArgs)
      .catch((e: unknown) => rt.errors.set(repo, e instanceof Error ? e.message : String(e)))
      .finally(() => rt.scanning.delete(repo));
  };

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) || "/" : url.pathname;
      if (req.method === "GET" && path === "/health") return send(res, 200, { status: "ok", app: APP_NAME });
      if (req.method === "GET" && (path === "/state" || path === "/")) {
        const s = await loadState(opts.dir);
        return send(res, 200, { ...s, scanning: [...rt.scanning], errors: Object.fromEntries(rt.errors) });
      }
      if (req.method === "POST" && path === "/watch") {
        const repo = normalizeRepo(String(((await readJson(req))["repo"]) ?? ""));
        if (!repo) return send(res, 400, { error: "Enter a GitHub repository as owner/name or a github.com URL." });
        await updateState((s) => {
          if (!s.watched.includes(repo)) s.watched.push(repo);
        }, opts.dir);
        startScan(repo);
        return send(res, 202, { repo });
      }
      if (req.method === "POST" && path === "/unwatch") {
        const repo = normalizeRepo(String(((await readJson(req))["repo"]) ?? ""));
        if (!repo) return send(res, 400, { error: "Unknown repository." });
        await updateState((s) => {
          s.watched = s.watched.filter((r) => r !== repo);
          delete s.snapshots[repo];
        }, opts.dir);
        return send(res, 200, { repo });
      }
      if (req.method === "POST" && path === "/scan") {
        const body = await readJson(req);
        const state = await loadState(opts.dir);
        const only = typeof body["repo"] === "string" ? normalizeRepo(body["repo"]) : null;
        const targets = only ? state.watched.filter((r) => r === only) : state.watched;
        targets.forEach(startScan);
        return send(res, 202, { scanning: targets });
      }
      return send(res, 404, { error: "not found" });
    } catch (e) {
      return send(res, 500, { error: e instanceof Error ? e.message : "internal error" });
    }
  };
  return { handler, rt, startScan };
}
