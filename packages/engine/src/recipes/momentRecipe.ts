import { MOMENT_TEST } from "./generated.js";
import type { Recipe, SourceFile, TransformResult } from "./types.js";

const PLUGINS: { name: string; module: string; test: RegExp }[] = [
  { name: "relativeTime", module: "dayjs/plugin/relativeTime", test: /\.(?:fromNow|toNow|from|to|humanize)\(/ },
  { name: "utc", module: "dayjs/plugin/utc", test: /\bdayjs\.utc\(|\.(?:utc|local)\(/ },
  { name: "duration", module: "dayjs/plugin/duration", test: /\bdayjs\.duration\(/ },
  { name: "isSameOrBefore", module: "dayjs/plugin/isSameOrBefore", test: /\.isSameOrBefore\(/ },
  { name: "isSameOrAfter", module: "dayjs/plugin/isSameOrAfter", test: /\.isSameOrAfter\(/ },
  { name: "isBetween", module: "dayjs/plugin/isBetween", test: /\.isBetween\(/ },
  { name: "objectSupport", module: "dayjs/plugin/objectSupport", test: /\bdayjs(?:\.utc)?\(\s*\{/ },
  { name: "calendar", module: "dayjs/plugin/calendar", test: /\.calendar\(/ },
  { name: "advancedFormat", module: "dayjs/plugin/advancedFormat", test: /format\(\s*['"`][^'"`]*(?:Do|Q|X|x|k|z)/ },
];

const MUTATORS = /^(\s*)([A-Za-z_$][\w$]*)\.(add|subtract|startOf|endOf|set|utc|local)\(.*\);?\s*$/;

function transform(file: SourceFile): TransformResult {
  const notes: string[] = [];
  let code = file.content;
  // 1. Imports. Capture the local binding so aliased imports migrate too.
  const decls: { local: string; esm: boolean }[] = [];
  code = code.replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]moment['"]\s*\)\s*;?/g, (_m, kw: string, local: string) => {
    decls.push({ local, esm: false });
    return `${kw} dayjs = require('dayjs');`;
  });
  code = code.replace(/\bimport\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from\s+['"]moment['"]\s*;?/g, (_m, local: string) => {
    decls.push({ local, esm: true });
    return "import dayjs from 'dayjs';";
  });
  if (decls.length === 0) return { code: file.content, notes };
  const esm = decls[0]!.esm;

  // 2. Identifier rewrites for the local binding.
  for (const { local } of decls) {
    if (local === "dayjs") continue;
    code = code.replace(new RegExp(`(?<![\\w$.])${local.replace("$", "\\$")}(?=\\s*[(.])`, "g"), "dayjs");
  }

  // 3. Flag semantic differences (mutation, timezone, locale) instead of hiding them.
  const lines = code.split("\n");
  const out: string[] = [];
  lines.forEach((line, i) => {
    const mut = MUTATORS.exec(line);
    if (mut) {
      out.push(`${mut[1]}// TODO(revenant): moment mutated in place; dayjs returns a new instance. Assign the result.`);
      notes.push(`${file.path}:${i + 1} mutating call result is discarded; assign it (dayjs is immutable).`);
    } else if (/\bdayjs\.tz\b|moment-timezone|\.tz\(/.test(line) || /require\(\s*['"]moment-timezone['"]/.test(line)) {
      out.push(`${line.match(/^\s*/)?.[0] ?? ""}// TODO(revenant): timezone support needs dayjs/plugin/timezone (requires utc). Review manually.`);
      notes.push(`${file.path}:${i + 1} timezone usage needs manual review.`);
    } else if (/\.locale\(|moment\.locale|\.localeData\(/.test(line)) {
      out.push(`${line.match(/^\s*/)?.[0] ?? ""}// TODO(revenant): dayjs locales are loaded from 'dayjs/locale/<id>'. Review manually.`);
      notes.push(`${file.path}:${i + 1} locale usage needs manual review.`);
    }
    out.push(line);
  });
  code = out.join("\n");

  // 4. Plugins required by what the file now uses.
  const need = PLUGINS.filter((p) => p.test.test(code));
  if (need.length > 0) {
    const importLine = /^.*(?:import dayjs from 'dayjs';|const dayjs = require\('dayjs'\);).*$/m;
    const imports = need.map((p) => (esm ? `import ${p.name} from '${p.module}';` : `const ${p.name} = require('${p.module}');`));
    const extend = need.map((p) => `dayjs.extend(${p.name});`);
    code = code.replace(importLine, (m) => `${m}\n${imports.join("\n")}\n${extend.join("\n")}`);
    notes.push(`${file.path}: enabled dayjs plugins ${need.map((p) => p.name).join(", ")}.`);
  }
  return { code, notes };
}

export const momentRecipe: Recipe = {
  id: "moment-to-dayjs",
  package: "moment",
  replacement: "dayjs",
  title: "Migrate moment to dayjs",
  transform: (file) => transform(file),
  extraFiles: () => [],
  editPackageJson(text) {
    const json = JSON.parse(text) as Record<string, Record<string, string> | undefined>;
    for (const key of ["dependencies", "devDependencies"]) {
      const sec = json[key];
      if (sec && "moment" in sec) {
        delete sec["moment"];
        sec["dayjs"] = "^1.11.13";
        json[key] = Object.fromEntries(Object.entries(sec).sort(([a], [b]) => a.localeCompare(b)));
      }
    }
    return `${JSON.stringify(json, null, 2)}\n`;
  },
  testFile: { path: "tests/revenant/moment-to-dayjs.differential.test.ts", content: MOMENT_TEST, deps: ["vitest", "fast-check", "moment", "dayjs"] },
  limits: [
    "moment mutates in place, dayjs is immutable: mutating calls whose result is discarded are flagged with a TODO, not rewritten.",
    "moment-timezone, locales and custom parsing formats need manual review (flagged with TODOs).",
    "Differential tests cover format, add/subtract, startOf/endOf, diff, comparison and ISO parsing for pure date maths; they do not prove plugin behaviour such as relativeTime wording.",
  ],
};
