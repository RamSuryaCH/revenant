import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { getJson, getText, pool } from "./http.js";
import type { SourceFile } from "./recipes/types.js";

const SRC = /\.(?:[cm]?[jt]sx?)$/;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|coverage|vendor|\.git)(\/|$)/;

/** Read candidate source files (and package.json) from a local directory. Capped. */
export async function readLocalSources(dir: string, maxFiles = 200): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      const rel = relative(dir, p).split("\\").join("/");
      if (SKIP.test(rel)) continue;
      if (e.isDirectory()) await walk(p);
      else if ((SRC.test(e.name) || rel === "package.json") && out.length < maxFiles && (await stat(p)).size < 200_000) out.push({ path: rel, content: await readFile(p, "utf8") });
    }
  };
  await walk(dir);
  return out;
}

interface Tree {
  tree?: { path: string; type: string; size?: number }[];
  truncated?: boolean;
}

/** Fetch package.json and capped JS/TS sources from a GitHub repo (tree API + raw downloads). */
export async function fetchRepoSources(repo: string, o: { token?: string; fetchImpl?: typeof fetch; maxFiles?: number } = {}): Promise<{ files: SourceFile[]; truncated: boolean }> {
  const max = o.maxFiles ?? 60;
  const headers: Record<string, string> = o.token ? { authorization: `Bearer ${o.token}` } : {};
  const tree = await getJson<Tree>(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, { headers, fetchImpl: o.fetchImpl, timeoutMs: 10000 });
  const all = (tree?.tree ?? []).filter((t) => t.type === "blob" && SRC.test(t.path) && !SKIP.test(t.path) && (t.size ?? 0) < 120_000 && !/\.d\.ts$|\.min\.|\.test\.|\.spec\.|(^|\/)(test|tests|__tests__|fixtures?)\//.test(t.path));
  // Prefer source over config; cap fan-out.
  all.sort((a, b) => a.path.split("/").length - b.path.split("/").length);
  const picked = all.slice(0, max);
  const base = `https://raw.githubusercontent.com/${repo}/HEAD`;
  const files = (
    await pool(["package.json", ...picked.map((p) => p.path)], 10, async (p) => {
      const content = await getText(`${base}/${p}`, { fetchImpl: o.fetchImpl, timeoutMs: 8000 }).catch(() => null);
      return content === null ? null : { path: p, content };
    })
  ).filter((f): f is SourceFile => f !== null);
  return { files, truncated: all.length > max || tree?.truncated === true };
}
