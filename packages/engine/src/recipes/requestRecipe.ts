import { REQUEST_SHIM, REQUEST_TEST } from "./generated.js";
import { relImport, type Recipe, type SourceFile, type TransformResult } from "./types.js";

export const SHIM_PATH = "lib/request-compat.cjs";
const TEST_PATH = "tests/revenant/request-to-fetch.differential.test.ts";

function transform(file: SourceFile): TransformResult {
  const notes: string[] = [];
  if (file.path === SHIM_PATH) return { code: file.content, notes };
  const rel = relImport(file.path, SHIM_PATH);
  let code = file.content;
  let local: string | null = null;
  code = code.replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]request['"]\s*\)\s*;?/g, (_m, kw: string, name: string) => {
    local = name;
    return `${kw} ${name} = require('${rel}');`;
  });
  code = code.replace(/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]request['"]\s*;?/g, (_m, name: string) => {
    local = name;
    return `import ${name} from '${rel}';`;
  });
  if (local === null) return { code: file.content, notes };
  const name: string = local;
  const lines = code.split("\n");
  const out: string[] = [];
  lines.forEach((line, i) => {
    const ind = line.match(/^\s*/)?.[0] ?? "";
    if (new RegExp(`\\b${name}\\.(?:jar|cookie)\\b|\\bjar\\s*:`).test(line)) {
      out.push(`${ind}// TODO(revenant): cookie jars are not supported by request-compat. Review manually.`);
      notes.push(`${file.path}:${i + 1} cookie jar usage needs manual review.`);
    } else if (/\.pipe\(|\.on\(\s*['"](?:data|response|error)['"]/.test(line) && new RegExp(`\\b${name}\\b`).test(line)) {
      out.push(`${ind}// TODO(revenant): request streams / .pipe() are not supported by request-compat. Use fetch + stream.pipeline.`);
      notes.push(`${file.path}:${i + 1} streaming usage needs manual review.`);
    } else if (/\bformData\s*:|\bmultipart\s*:|\bproxy\s*:/.test(line)) {
      out.push(`${ind}// TODO(revenant): multipart/proxy options are not supported by request-compat.`);
      notes.push(`${file.path}:${i + 1} multipart or proxy option needs manual review.`);
    }
    out.push(line);
  });
  return { code: out.join("\n"), notes };
}

export const requestRecipe: Recipe = {
  id: "request-to-fetch",
  package: "request",
  replacement: "native fetch (request-compat shim)",
  title: "Replace request with native fetch",
  transform: (file) => transform(file),
  extraFiles: () => [{ path: SHIM_PATH, content: REQUEST_SHIM }],
  editPackageJson(text) {
    const json = JSON.parse(text) as Record<string, unknown>;
    for (const key of ["dependencies", "devDependencies"]) {
      const sec = json[key] as Record<string, string> | undefined;
      if (sec) delete sec["request"];
    }
    const engines = (json["engines"] ?? {}) as Record<string, string>;
    if (!engines["node"]) engines["node"] = ">=18";
    json["engines"] = engines;
    return `${JSON.stringify(json, null, 2)}\n`;
  },
  testFile: { path: TEST_PATH, content: REQUEST_TEST.replace('"./request-compat.cjs"', JSON.stringify(relImport(TEST_PATH, SHIM_PATH))), deps: ["vitest", "fast-check", "request"] },
  limits: [
    "The shim covers the common callback API: uri/url, method, qs, headers, body, json, form, auth, timeout, followRedirect, encoding: null, plus get/post/put/patch/del/head/defaults.",
    "Streams and .pipe(), cookie jars, multipart, proxies and nested qs objects are not supported; call sites are flagged with TODOs.",
    "fetch refuses WHATWG bad ports (for example 1, 25, 6000); the shim then probes the socket and reports its error code, or ERR_BLOCKED_PORT if the port is open.",
    "Differential tests run both clients against a local HTTP server; they do not cover TLS, redirects across hosts or retry behaviour.",
  ],
};
