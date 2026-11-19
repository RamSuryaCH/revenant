/**
 * Verify each curated resurrection against the real sandbox repo and record the test output.
 * Output (apps/web/src/data/crypt-verification.json) is embedded in the Gravekeeper PR bodies.
 * Run: packages/engine/node_modules/.bin/tsx scripts/verify-crypt.mts
 * GitHub Actions is billing-locked, so this local run is the proof.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { stripVTControlCharacters } from "node:util";
import { dirname, join } from "node:path";
import { fetchRepoSources, pullRequestFiles, RECIPES, resurrect } from "../packages/engine/src/index.ts";

const REPO = "RamSuryaCH/revenant-crypt";
const sh = (cmd: string, args: string[], cwd: string) => {
  try {
    return { ok: true, out: execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 20_000_000 }) };
  } catch (e) {
    const x = e as { stdout?: string; stderr?: string };
    return { ok: false, out: `${x.stdout ?? ""}${x.stderr ?? ""}` };
  }
};
const tail = (s: string, n: number) => s.trim().split("\n").slice(-n).join("\n");
const summary = (s: string) => s.split("\n").filter((l) => /^(?:✔|✖|(?:#|ℹ) (?:tests|pass|fail|cancelled|skipped)\b)/.test(l)).join("\n");

const sha = execFileSync("gh", ["api", `repos/${REPO}/commits/HEAD`, "--jq", ".sha"], { encoding: "utf8" }).trim();
const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
const root = mkdtempSync(join(tmpdir(), "revenant-verify-"));
const base = join(root, "base");
mkdirSync(base);
execFileSync("bash", ["-c", `git -C ../revenant-crypt archive ${sha} | tar -x -C ${base}`], { cwd: process.cwd() });
console.log("npm ci (base)...");
sh("npm", ["ci", "--no-audit", "--no-fund"], base);
const baseline = sh("npm", ["test"], base);
console.log("baseline ok:", baseline.ok);

const { files } = await fetchRepoSources(REPO, { token });
const result: Record<string, unknown> = { repo: REPO, baseSha: sha, node: process.version, generatedAt: new Date().toISOString(), baseline: { ok: baseline.ok, summary: summary(baseline.out) }, recipes: {} };
for (const id of Object.keys(RECIPES)) {
  const dir = join(root, id);
  cpSync(base, dir, { recursive: true });
  const r = resurrect({ recipeId: id, files });
  for (const f of pullRequestFiles(files, r)) {
    mkdirSync(dirname(join(dir, f.path)), { recursive: true });
    writeFileSync(join(dir, f.path), f.content);
  }
  sh("npm", ["install", "--no-audit", "--no-fund"], dir); // package.json changed (e.g. dayjs added, dep removed)
  const t = sh("npm", ["test"], dir);
  const deps = RECIPES[id]!.testFile.deps;
  sh("npm", ["install", "--no-save", "--no-audit", "--no-fund", ...deps], dir);
  const d = sh("npx", ["vitest", "run", RECIPES[id]!.testFile.path], dir);
  console.log(id, "npm test:", t.ok, "differential:", d.ok);
  (result.recipes as Record<string, unknown>)[id] = {
    filesChanged: r.files.map((f) => f.path),
    npmTest: { ok: t.ok, summary: summary(t.out) || tail(t.out, 15) },
    differential: { ok: d.ok, command: `npm install --no-save ${deps.join(" ")} && npx vitest run ${RECIPES[id]!.testFile.path}`, output: tail(stripVTControlCharacters(d.out), 14) },
  };
}
mkdirSync("apps/web/src/data", { recursive: true });
writeFileSync("apps/web/src/data/crypt-verification.json", JSON.stringify(result, null, 2) + "\n");
rmSync(root, { recursive: true, force: true });
