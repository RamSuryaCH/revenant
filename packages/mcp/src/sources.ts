import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { SourceFile } from "@revenant/engine";

const SRC = /\.(?:[cm]?[jt]sx?)$/;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|coverage|vendor|\.git|\.kiro)(\/|$)/;

/**
 * Read package.json plus candidate JS/TS sources from a directory, capped.
 * A local twin of the engine's reader, kept here because the engine does not export it.
 * Symlinked entries are skipped so a link cannot pull in files from outside the workspace.
 */
export async function readWorkspaceSources(dir: string, maxFiles = 200): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  const walk = async (d: string): Promise<void> => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      const rel = relative(dir, p).split("\\").join("/");
      if (SKIP.test(rel) || e.isSymbolicLink()) continue;
      if (e.isDirectory()) await walk(p);
      else if ((SRC.test(e.name) || rel === "package.json") && out.length < maxFiles && (await stat(p)).size < 200_000) out.push({ path: rel, content: await readFile(p, "utf8") });
    }
  };
  await walk(dir);
  return out;
}
