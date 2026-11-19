import { classifyInput, finish, parseGithubUrl, scan, ScanError, type ScanResult, type Tombstone } from "@revenant/engine";
import { allow, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BUDGET_MS = 48_000;

export type ScanEvent =
  | { type: "start"; source: string }
  | { type: "progress"; message: string }
  | { type: "tombstone"; data: Tombstone }
  | { type: "done"; data: ScanResult }
  | { type: "error"; code: string; message: string };

export async function GET(req: Request) {
  const repo = new URL(req.url).searchParams.get("repo")?.trim() ?? "";
  const gh = parseGithubUrl(repo);
  if (!gh) {
    return Response.json({ code: "bad-input", message: "Paste a GitHub repository URL like https://github.com/expressjs/express." }, { status: 400 });
  }
  if (!allow(clientIp(req), 8, 10 * 60_000)) {
    return Response.json({ code: "rate-limited", message: "Too many scans from your address. Try again in a few minutes." }, { status: 429 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ScanEvent) => controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      const collected: Tombstone[] = [];
      const started = Date.now();
      send({ type: "start", source: `${gh.owner}/${gh.repo}` });
      const timer = new Promise<"timeout">((r) => setTimeout(() => r("timeout"), BUDGET_MS));
      try {
        const run = scan(classifyInput(repo), {
          githubToken: process.env["GITHUB_TOKEN"],
          maxDirect: 30,
          maxTransitive: 8,
          onProgress: (message) => send({ type: "progress", message }),
          onTombstone: (t) => {
            collected.push(t);
            send({ type: "tombstone", data: t });
          },
        });
        const winner = await Promise.race([run, timer]);
        if (winner === "timeout") {
          send({ type: "done", data: finish({ kind: "github", ref: `${gh.owner}/${gh.repo}` }, "npm", new Date(), collected, [`Live scan stopped after ${Math.round((Date.now() - started) / 1000)}s to respect serverless limits; showing what was found.`], true, false) });
        } else {
          send({ type: "done", data: winner });
        }
      } catch (e) {
        if (e instanceof ScanError) send({ type: "error", code: e.code, message: e.message });
        else send({ type: "error", code: "unreachable", message: "The scan failed unexpectedly." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
