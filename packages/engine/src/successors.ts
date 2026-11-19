/**
 * Curated successor table. deps.dev, OSV, Scorecard, npm and GitHub do not publish
 * "successor of X", so this is hand-curated and labelled source "curated".
 * `recipeId` is set only where Revenant ships a tested migration recipe.
 */
export interface SuccessorEntry {
  name: string;
  reason: string;
  recipeId?: string;
  /** Only applies when the installed major version is below this (e.g. uuid<7). */
  belowMajor?: number;
  /** Maintainers themselves declare the project legacy/maintenance-only. */
  legacy?: boolean;
}

export const SUCCESSORS: Record<string, SuccessorEntry> = {
  moment: { name: "dayjs", reason: "moment is in maintenance mode; dayjs has a near-identical API in 2 kB", recipeId: "moment-to-dayjs", legacy: true },
  request: { name: "native fetch", reason: "request was deprecated in 2020; fetch ships in Node 18+", recipeId: "request-to-fetch" },
  uuid: { name: "crypto.randomUUID", reason: "uuid@3 is unsupported; randomUUID is built into Node 14.17+ and browsers", recipeId: "uuid3-to-randomuuid", belowMajor: 7 },
  "node-uuid": { name: "crypto.randomUUID", reason: "node-uuid was renamed to uuid and is deprecated" },
  "node-sass": { name: "sass", reason: "node-sass (LibSass) is deprecated in favour of Dart Sass" },
  "request-promise": { name: "native fetch", reason: "request-promise depends on the deprecated request" },
  "request-promise-native": { name: "native fetch", reason: "request-promise-native depends on the deprecated request" },
  tslint: { name: "typescript-eslint", reason: "TSLint was deprecated in 2019 in favour of ESLint" },
  "left-pad": { name: "String.prototype.padStart", reason: "left-pad is deprecated; padStart is built in" },
  "babel-core": { name: "@babel/core", reason: "Babel 6 packages were superseded by the @babel scope", belowMajor: 7 },
  "core-js": { name: "core-js@3", reason: "core-js@2 is unmaintained", belowMajor: 3 },
  istanbul: { name: "nyc", reason: "istanbul is deprecated in favour of nyc / c8" },
  gulp: { name: "gulp@4", reason: "gulp@3 is unsupported on modern Node", belowMajor: 4 },
  bower: { name: "npm", reason: "bower recommends migrating to npm/yarn" },
  querystring: { name: "URLSearchParams", reason: "the querystring package is deprecated; URLSearchParams is built in" },
  mkdirp: { name: "fs.mkdir({ recursive: true })", reason: "recursive mkdir is built into Node 10.12+" },
  rimraf: { name: "fs.rm({ recursive: true, force: true })", reason: "fs.rm is built into Node 14.14+" },
};

/** Parse "use X instead" style npm deprecation messages. Returns null when none is named. */
export function parseSuccessorFromDeprecation(message: string): string | null {
  const m =
    /(?:use|switch to|migrate to|replaced by|moved to|superseded by)\s+[`'"]?(@?[a-z0-9][\w./-]*)[`'"]?/i.exec(message) ??
    /(?:please use|renamed to)\s+[`'"]?(@?[a-z0-9][\w./-]*)[`'"]?/i.exec(message);
  const name = m?.[1]?.replace(/[.,;]+$/, "");
  return name && name.length > 1 ? name : null;
}

export function successorFor(name: string, version: string | null): SuccessorEntry | null {
  const e = SUCCESSORS[name];
  if (!e) return null;
  if (e.belowMajor !== undefined && version) {
    const major = Number.parseInt(version.split(".")[0] ?? "", 10);
    if (Number.isFinite(major) && major >= e.belowMajor) return null;
  }
  return e;
}
