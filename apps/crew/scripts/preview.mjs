// Local preview of the Graveyard Watch page outside Kiro Crew: serves ui/index.mjs with a
// stand-in for @kirocrew/app-sdk and proxies /api/apps/graveyard-watch/* to a running backend.
// Usage: node scripts/preview.mjs [backendPort=9101] [port=4319]
// React is bundled from this package's own node_modules by esbuild at start-up.
import { createServer, request } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = Number(process.argv[2] ?? 9101);
const port = Number(process.argv[3] ?? 4319);

// One bundle holds React, the SDK stand-in and the app, so there is a single React instance.
const entry = `
import { createElement } from "react"; import { createRoot } from "react-dom/client";
import App from "./ui/index.mjs";
createRoot(document.getElementById("root")).render(createElement(App));`;
const sdk = `
export const useAppApi = () => ({
  get: (p) => fetch(p).then((r) => r.json()),
  post: (p, b) => fetch(p, { method: "POST", body: JSON.stringify(b ?? {}) }).then((r) => r.json()),
});
export const useNotify = () => (m) => console.log("notify:", m);
export const useChatLauncher = () => ({ openChat: (o) => console.log("openChat", o) });`;
const ui = `
import { jsx, jsxs } from "react/jsx-runtime";
export const PageHeader = ({ title, subtitle }) => jsxs("div", { style: { padding: "20px 24px 12px" }, children: [
  jsx("h1", { style: { margin: 0, font: "600 20px Inter,system-ui,sans-serif" }, children: title }),
  jsx("p", { style: { margin: "4px 0 0", color: "#8a8f9c", font: "13px Inter,system-ui,sans-serif" }, children: subtitle })] });`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Graveyard Watch preview</title>
<style>body{margin:0;background:#0d0f14;color:#e6e6e6}#root{display:flex;flex-direction:column;min-height:100vh}</style></head>
<body><div id="root"></div><script type="module" src="/bundle.mjs"></script></body></html>`;

const virtual = {
  name: "sdk-stand-in",
  setup(b) {
    b.onResolve({ filter: /^@kirocrew\/app-sdk(\/ui)?$/ }, (a) => ({ path: a.path, namespace: "sdk" }));
    b.onLoad({ filter: /.*/, namespace: "sdk" }, (a) => ({ contents: a.path.endsWith("/ui") ? ui : sdk, loader: "js", resolveDir: root }));
  },
};
const bundled = await build({
  stdin: { contents: entry, resolveDir: root, loader: "js" },
  bundle: true, format: "esm", write: false, plugins: [virtual], define: { "process.env.NODE_ENV": '"production"' },
});
const bundle = bundled.outputFiles[0].text;

createServer(async (req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/api/apps/graveyard-watch")) {
    const p = request({ host: "127.0.0.1", port: backend, path: url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    p.on("error", () => res.writeHead(502).end());
    req.pipe(p);
    return;
  }
  const js = (body) => res.writeHead(200, { "content-type": "text/javascript" }).end(body);
  {
    if (url === "/") return res.writeHead(200, { "content-type": "text/html" }).end(html);
    if (url === "/bundle.mjs") return js(bundle);
  }
  res.writeHead(404).end();
}).listen(port, "127.0.0.1", () => console.log(`preview on http://127.0.0.1:${port}`));
