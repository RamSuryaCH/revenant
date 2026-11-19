export interface SourceFile {
  path: string;
  content: string;
}

export interface TransformResult {
  code: string;
  notes: string[];
}

export interface Recipe {
  id: string;
  /** npm package being retired. */
  package: string;
  replacement: string;
  title: string;
  /** Rewrites one JS/TS source file. Must be a no-op for files that do not use the package. */
  transform(file: SourceFile, ctx: RecipeContext): TransformResult;
  /** Extra files the migration adds (e.g. a compat shim). */
  extraFiles(ctx: RecipeContext): SourceFile[];
  /** Edit package.json text given whether any usage remains. */
  editPackageJson(text: string, ctx: RecipeContext): string;
  testFile: { path: string; content: string; deps: string[] };
  /** Honest limits of the recipe, copied into the spec and the UI. */
  limits: string[];
}

export interface RecipeContext {
  /** True when a file imported the package as ESM, used to pick shim import style. */
  esm: boolean;
  /** Set by the runner: paths of all files that will be edited. */
  stillUsed: boolean;
}

export const SOURCE_EXT = /\.(?:[cm]?[jt]sx?)$/;

export function relImport(fromPath: string, toPath: string): string {
  const from = fromPath.split("/").slice(0, -1);
  const to = toPath.split("/");
  let i = 0;
  while (i < from.length && i < to.length - 1 && from[i] === to[i]) i++;
  const up = from.slice(i).map(() => "..");
  const rest = to.slice(i);
  const rel = [...up, ...rest].join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}
