#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { classifyInput, scan, ScanError } from "./scan.js";
import { recipeForPackage, resurrect } from "./recipes/index.js";
import { fetchRepoSources, readLocalSources } from "./repoFiles.js";
import { ScanResult } from "./schema.js";

const HELP = `revenant - resurrect abandoned open-source dependencies

Usage:
  revenant scan <github-url|dir|package.json> [--out file.json] [--transitive N] [--dev]
  revenant resurrect <scan.json> <package> [--from <dir|owner/repo>] [--out file.json] [--patch file.patch]

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
  process.stdout.write(`${HELP}\n`);
  process.exitCode = cmd ? 1 : 0;
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`${e instanceof ScanError ? `[${e.code}] ` : ""}${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
