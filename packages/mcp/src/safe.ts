import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** A failure the server reports to the model as data, never as a thrown protocol error. */
export class ToolError extends Error {
  constructor(
    public readonly code: "outside-workspace" | "invalid-input" | "not-found" | "no-recipe" | "nothing-to-migrate" | "exists" | "scan-failed" | "internal",
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

/** The directory every file operation is confined to: REVENANT_WORKSPACE, else the server's cwd. */
export function workspaceRoot(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  const raw = env["REVENANT_WORKSPACE"] || cwd;
  try {
    return realpathSync(resolve(raw));
  } catch {
    throw new ToolError("not-found", `Workspace root does not exist: ${raw}`);
  }
}

function inside(root: string, p: string): boolean {
  const rel = relative(root, p);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

/**
 * Resolve `candidate` (absolute, or relative to the root) to a real directory inside `root`.
 * Symlinks are resolved first, so a link that points outside is refused too.
 */
export function confineDir(root: string, candidate: string | undefined): string {
  const abs = resolve(root, candidate ?? ".");
  let real: string;
  try {
    real = realpathSync(abs);
  } catch {
    throw new ToolError("not-found", `Directory does not exist: ${candidate ?? "."}`);
  }
  if (!inside(root, real)) throw new ToolError("outside-workspace", `Refused: "${candidate}" is outside the workspace (${root}).`);
  if (!statSync(real).isDirectory()) throw new ToolError("invalid-input", `Not a directory: ${candidate}`);
  return real;
}

/** Resolve a path that may not exist yet (a file about to be written) and check its nearest existing parent. */
export function confineNew(root: string, ...parts: string[]): string {
  const abs = resolve(root, ...parts);
  if (!inside(root, abs)) throw new ToolError("outside-workspace", `Refused: ${parts.join("/")} escapes the workspace (${root}).`);
  // Walk up to the nearest existing ancestor and make sure symlinks do not lead out.
  let probe = abs;
  for (;;) {
    try {
      const real = realpathSync(probe);
      if (!inside(root, real)) throw new ToolError("outside-workspace", `Refused: ${parts.join("/")} resolves outside the workspace through a symlink.`);
      break;
    } catch (e) {
      if (e instanceof ToolError) throw e;
      const parent = resolve(probe, "..");
      if (parent === probe) break;
      probe = parent;
    }
  }
  return abs;
}

const NPM_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

export function validPackageName(name: string): string {
  if (name.length > 214 || !NPM_NAME.test(name)) throw new ToolError("invalid-input", `"${name}" is not a valid npm package name.`);
  return name;
}

/** `@scope/name` becomes `scope-name`, safe as a single path segment. */
export function packageSlug(name: string): string {
  return validPackageName(name).replace(/^@/, "").replace(/\//g, "-");
}

export function truncate(text: string, max: number): { text: string; truncated: boolean } {
  return text.length <= max ? { text, truncated: false } : { text: `${text.slice(0, max)}\n... [truncated ${text.length - max} characters]`, truncated: true };
}
