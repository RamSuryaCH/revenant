import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { RESET_REPO, type NightlyRun } from "./types.js";

const run = promisify(execFile);

export function candidateDirs(env: NodeJS.ProcessEnv, configured?: string): string[] {
  const home = homedir();
  // An explicit override is the only candidate: nothing else may be touched by accident.
  if (env["REVENANT_CRYPT_DIR"]) return [env["REVENANT_CRYPT_DIR"]];
  return [configured, join(home, "revenant-crypt"), join(home, "Downloads", "Kiroween", "revenant-crypt")].filter((d): d is string => !!d);
}

type Exec = (file: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string }>;

/**
 * Run scripts/reset.sh in a local clone of RESET_REPO, and only there.
 * Guards: the clone's origin must be RESET_REPO, and the script must pin the same repo itself.
 */
export async function resetDemoRepo(o: { env?: NodeJS.ProcessEnv; configured?: string | undefined; exec?: Exec } = {}): Promise<NightlyRun["reset"]> {
  const env = o.env ?? process.env;
  const exec: Exec = o.exec ?? ((f, a, opts) => run(f, a, { ...opts, encoding: "utf8" }) as unknown as Promise<{ stdout: string }>);
  const dir = candidateDirs(env, o.configured).map((d) => resolve(d)).find((d) => existsSync(join(d, "scripts", "reset.sh")));
  if (!dir) return { status: "skipped", detail: `No local clone of ${RESET_REPO} with scripts/reset.sh. Set REVENANT_CRYPT_DIR.` };
  try {
    const origin = (await exec("git", ["-C", dir, "remote", "get-url", "origin"], { timeout: 15_000 })).stdout.trim();
    if (!new RegExp(`github\\.com[:/]${RESET_REPO.replace("/", "\\/")}(\\.git)?$`, "i").test(origin)) {
      return { status: "skipped", detail: `Refused: ${dir} has origin ${origin}, not ${RESET_REPO}.` };
    }
    const script = join(dir, "scripts", "reset.sh");
    if (!(await readFile(script, "utf8")).includes(`REPO="${RESET_REPO}"`)) {
      return { status: "skipped", detail: `Refused: ${script} does not pin ${RESET_REPO}.` };
    }
    // Safe by default: a live reset closes the demo PRs, so it needs an explicit opt-in.
    const dry = env["REVENANT_RESET_LIVE"] !== "1";
    const { stdout } = await exec("bash", [script], { cwd: dir, timeout: 120_000, env: { ...env, DRY_RUN: dry ? "1" : "0" } });
    const tail = stdout.trim().split("\n").slice(-3).join(" | ");
    return { status: dry ? "dry-run" : "done", detail: tail || "reset finished" };
  } catch (e) {
    return { status: "failed", detail: e instanceof Error ? (e.message.split("\n")[0] ?? "failed") : String(e) };
  }
}
