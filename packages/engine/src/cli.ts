#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { classifyInput, scan, ScanError } from "./scan.js";
import { RECIPES, recipeForPackage, resurrect } from "./recipes/index.js";
import { openResurrectionPr, SANDBOX_REPO, type CryptVerification } from "./gravekeeper.js";
import { fetchRepoSources, readLocalSources } from "./repoFiles.js";
import { ScanResult } from "./schema.js";

const HELP = `revenant - resurrect abandoned open-source dependencies

Usage:
  revenant scan <github-url|dir|package.json> [--out file.json] [--transitive N] [--dev]
  revenant resurrect <scan.json> <package> [--from <dir|owner/repo>] [--out file.json] [--patch file.patch]
  revenant gravekeeper <recipe-id|package|all> [--verification file.json]
      Opens (or reuses) the pull request on ${SANDBOX_REPO}, branch revenant/<recipe-id>.
      Needs a write token: GITHUB_TOKEN=$(gh auth token). Never run this from a server.

Env: GITHUB_TOKEN raises GitHub API limits.`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function save(path: string | undefined, data: unknown) {
  const text = `${JSON.stringify(data, null, 2)}\n`;
  if (!path) return process.stdout.write(text);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
  process.stderr.write(`wrote ${path}\n`);
}

async function main(argv: string[]) {
  const [cmd, ...args] = argv;
  if (cmd === "scan" && args[0]) {
    const result = await scan(classifyInput(args[0]), {
      githubToken: process.env["GITHUB_TOKEN"],
      maxTransitive: Number(flag(args, "--transitive") ?? 0),
      includeDev: args.includes("--dev"),
      onProgress: (m) => process.stderr.write(`${m}\n`),
      onTombstone: (t) => process.stderr.write(`  ${t.status.padEnd(6)} ${t.name}\n`),
    });
    await save(flag(args, "--out"), result);
    return;
  }
  if (cmd === "resurrect" && args[0] && args[1]) {
    const scanned = ScanResult.parse(JSON.parse(await readFile(args[0], "utf8")));
    const tomb = scanned.tombstones.find((t) => t.name === args[1]);
    const recipe = recipeForPackage(args[1]);
    if (!recipe) throw new Error(`No curated recipe yet for "${args[1]}". Curated: moment, request, uuid@3.`);
    const from = flag(args, "--from") ?? scanned.source.ref;
    const files = /^[\w.-]+\/[\w.-]+$/.test(from) && !from.startsWith(".") ? (await fetchRepoSources(from, { token: process.env["GITHUB_TOKEN"] })).files : await readLocalSources(from);
    const evidence = tomb?.epitaphs.map((e) => `${e.text} (${e.evidence.map((x) => x.field).join(", ")})`) ?? [];
    const r = resurrect({ recipeId: recipe.id, files, fromVersion: tomb?.version, evidence });
    const patchOut = flag(args, "--patch");
    if (patchOut) await writeFile(patchOut, r.patch);
    await save(flag(args, "--out"), r);
    return;
  }
  if (cmd === "gravekeeper" && args[0]) {
    const token = process.env["GITHUB_TOKEN"];
    if (!token) throw new Error("GITHUB_TOKEN is required (for example GITHUB_TOKEN=$(gh auth token)).");
    const ids = args[0] === "all" ? Object.keys(RECIPES) : [RECIPES[args[0]]?.id ?? recipeForPackage(args[0])?.id];
    if (ids.some((id) => !id)) throw new Error(`No curated recipe "${args[0]}". Use one of: ${Object.keys(RECIPES).join(", ")}, or all.`);
    const vPath = flag(args, "--verification") ?? "apps/web/src/data/crypt-verification.json";
    const verification = (await readFile(vPath, "utf8").then((t) => JSON.parse(t) as CryptVerification).catch(() => null));
    if (!verification) process.stderr.write(`no verification file at ${vPath}; PR bodies will say the suites were not run\n`);
    for (const id of ids as string[]) {
      const pr = await openResurrectionPr({ repo: SANDBOX_REPO, recipeId: id, token, verification, appUrl: "https://revenant-beta.vercel.app" });
      process.stdout.write(`${id}\t${pr.reused ? "reused" : "opened"}\t#${pr.number}\t${pr.url}\n`);
    }
    return;
  }
  process.stdout.write(`${HELP}\n`);
  process.exitCode = cmd ? 1 : 0;
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`${e instanceof ScanError ? `[${e.code}] ` : ""}${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
