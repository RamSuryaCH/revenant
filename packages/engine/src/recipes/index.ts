import { createTwoFilesPatch } from "diff";
import { SCHEMA_VERSION, type Resurrection } from "../schema.js";
import { momentRecipe } from "./momentRecipe.js";
import { requestRecipe } from "./requestRecipe.js";
import { buildSpec } from "./spec.js";
import { SOURCE_EXT, type Recipe, type SourceFile } from "./types.js";
import { uuidRecipe } from "./uuidRecipe.js";

export type { Recipe, SourceFile } from "./types.js";

export const RECIPES: Record<string, Recipe> = {
  [momentRecipe.id]: momentRecipe,
  [requestRecipe.id]: requestRecipe,
  [uuidRecipe.id]: uuidRecipe,
};

export function recipeForPackage(name: string): Recipe | null {
  return Object.values(RECIPES).find((r) => r.package === name) ?? null;
}

function gitDiff(path: string, before: string, after: string, isNew: boolean): string {
  const lines = createTwoFilesPatch(isNew ? "/dev/null" : `a/${path}`, `b/${path}`, before, after, "", "", { context: 3 }).split("\n");
  const start = lines.findIndex((l) => l.startsWith("--- "));
  const body = lines
    .slice(start)
    .map((l) => (l.startsWith("--- ") || l.startsWith("+++ ") ? l.replace(/\t$/, "") : l))
    .join("\n");
  const head = `diff --git a/${path} b/${path}\n${isNew ? "new file mode 100644\n" : ""}`;
  return head + body;
}

const usesPackage = (code: string, pkg: string) => new RegExp(`(?:require\\(|from\\s+)\\s*['"]${pkg}(?:/[^'"]*)?['"]`).test(code);

export interface ResurrectInput {
  recipeId: string;
  /** Repository files: must include package.json plus candidate source files. */
  files: SourceFile[];
  fromVersion?: string | null;
  /** Evidence lines from the tombstone, shown in the spec context. */
  evidence?: string[];
  now?: Date;
}

export function resurrect(input: ResurrectInput): Resurrection {
  const recipe = RECIPES[input.recipeId];
  if (!recipe) throw new Error(`No curated recipe "${input.recipeId}".`);
  const pkgFile = input.files.find((f) => f.path === "package.json");
  const sources = input.files.filter((f) => SOURCE_EXT.test(f.path) && !/(^|\/)node_modules\//.test(f.path));
  const notes: string[] = [];
  const changed: { path: string; before: string; after: string }[] = [];
  for (const f of sources) {
    const r = recipe.transform(f, { esm: false, stillUsed: false });
    notes.push(...r.notes);
    if (r.code !== f.content) changed.push({ path: f.path, before: f.content, after: r.code });
  }
  const after = new Map(sources.map((f) => [f.path, changed.find((c) => c.path === f.path)?.after ?? f.content]));
  const stillUsed = [...after.values()].some((c) => usesPackage(c, recipe.package));
  const ctx = { esm: false, stillUsed };

  const fileDiffs: Resurrection["files"] = [];
  for (const c of changed) fileDiffs.push({ path: c.path, kind: "modify", diff: gitDiff(c.path, c.before, c.after, false) });
  if (changed.length > 0) {
    for (const extra of recipe.extraFiles(ctx)) fileDiffs.push({ path: extra.path, kind: "add", diff: gitDiff(extra.path, "", extra.content, true) });
    if (pkgFile) {
      const edited = recipe.editPackageJson(pkgFile.content, ctx);
      if (edited !== pkgFile.content) fileDiffs.push({ path: "package.json", kind: "modify", diff: gitDiff("package.json", pkgFile.content, edited, false) });
    }
  } else {
    notes.push(`No usage of "${recipe.package}" was found in the ${sources.length} scanned source files, so there is nothing to migrate.`);
  }
  if (stillUsed) notes.push(`"${recipe.package}" is still imported somewhere (unmigrated usage), so it stays in package.json.`);

  const spec = buildSpec({
    recipe,
    changedFiles: changed.map((c) => c.path),
    addedFiles: changed.length ? recipe.extraFiles(ctx).map((e) => e.path) : [],
    notes,
    scannedFiles: sources.length,
    fromVersion: input.fromVersion ?? null,
    evidence: input.evidence ?? [],
  });
  const patchName = `${spec.slug}.patch`;
  return {
    schemaVersion: SCHEMA_VERSION,
    recipeId: recipe.id,
    package: recipe.package,
    replacement: recipe.replacement,
    generatedAt: (input.now ?? new Date()).toISOString(),
    spec,
    patch: fileDiffs.map((f) => f.diff).join(""),
    files: fileDiffs,
    applyCommand: `git apply ${patchName}`,
    tests: { path: recipe.testFile.path, content: recipe.testFile.content, runCommand: `pnpm add -D ${recipe.testFile.deps.join(" ")} && npx vitest run ${recipe.testFile.path}` },
    notes,
    stats: { filesScanned: sources.length, filesChanged: changed.length },
  };
}
