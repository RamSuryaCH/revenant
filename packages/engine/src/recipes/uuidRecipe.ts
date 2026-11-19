import { UUID_TEST } from "./generated.js";
import type { Recipe, SourceFile, TransformResult } from "./types.js";

const esc = (s: string) => s.replace(/[$]/g, "\\$");

function transform(file: SourceFile): TransformResult {
  const notes: string[] = [];
  let code = file.content;
  const v4Names = new Set<string>();
  const nsNames = new Set<string>();
  let esm = false;
  let touched = false;

  const decl = (cjs: string, esmLine: string) => (esm ? esmLine : cjs);

  // uuid/v4 default imports
  code = code.replace(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]uuid\/v4['"]\s*\)\s*;?/g, (_m, n: string) => {
    v4Names.add(n);
    touched = true;
    return "__REVENANT_IMPORT__";
  });
  code = code.replace(/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]uuid\/v4['"]\s*;?/g, (_m, n: string) => {
    v4Names.add(n);
    esm = true;
    touched = true;
    return "__REVENANT_IMPORT__";
  });
  // { v4 } named
  code = code.replace(/\b(?:const|let|var)\s*\{\s*v4(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*\}\s*=\s*require\(\s*['"]uuid['"]\s*\)\s*;?/g, (_m, n?: string) => {
    v4Names.add(n ?? "v4");
    touched = true;
    return "__REVENANT_IMPORT__";
  });
  code = code.replace(/\bimport\s*\{\s*v4(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*\}\s*from\s+['"]uuid['"]\s*;?/g, (_m, n?: string) => {
    v4Names.add(n ?? "v4");
    esm = true;
    touched = true;
    return "__REVENANT_IMPORT__";
  });
  // namespace imports used only as ns.v4()
  const nsCjs = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]uuid['"]\s*\)\s*;?/g;
  const nsEsm = /\bimport\s+(?:\*\s+as\s+)?([A-Za-z_$][\w$]*)\s+from\s+['"]uuid['"]\s*;?/g;
  for (const [re, isEsm] of [[nsCjs, false], [nsEsm, true]] as const) {
    for (const m of file.content.matchAll(re)) {
      const ns = m[1]!;
      const uses = [...file.content.matchAll(new RegExp(`(?<![\\w$.])${esc(ns)}\\.(\\w+)`, "g"))].map((x) => x[1]);
      if (uses.length > 0 && uses.every((u) => u === "v4")) {
        nsNames.add(ns);
        if (isEsm) esm = true;
        code = code.replace(m[0], "__REVENANT_IMPORT__");
        touched = true;
      } else if (uses.some((u) => u !== "v4")) {
        notes.push(`${file.path}: uses uuid.${[...new Set(uses.filter((u) => u !== "v4"))].join(", uuid.")}; only v4 is migrated, uuid stays installed for the rest.`);
      }
    }
  }
  if (!touched) return { code: file.content, notes };

  // Calls with arguments (options/buffer) cannot be expressed by randomUUID: bail out for this file.
  const names = [...v4Names, ...[...nsNames].map((n) => `${n}.v4`)];
  const withArgs = names.find((n) => new RegExp(`(?<![\\w$.])${esc(n).replace(".", "\\.")}\\(\\s*[^)\\s]`).test(code));
  if (withArgs) {
    notes.push(`${file.path}: ${withArgs}(...) is called with arguments (options or buffer); crypto.randomUUID() takes none. File left unchanged.`);
    return { code: file.content, notes };
  }
  for (const n of v4Names) code = code.replace(new RegExp(`(?<![\\w$.])${esc(n)}\\(\\s*\\)`, "g"), "randomUUID()");
  for (const n of nsNames) code = code.replace(new RegExp(`(?<![\\w$.])${esc(n)}\\.v4\\(\\s*\\)`, "g"), "randomUUID()");
  // Any remaining reference (e.g. passed as a callback) would break: keep it working.
  const leftover = [...v4Names].find((n) => new RegExp(`(?<![\\w$.])${esc(n)}(?![\\w$])`).test(code.replace("__REVENANT_IMPORT__", "")));
  const importLine = decl("const { randomUUID } = require('node:crypto');", "import { randomUUID } from 'node:crypto';");
  if (leftover) {
    code = code.replace("__REVENANT_IMPORT__", `${importLine}\nconst ${leftover} = randomUUID; // TODO(revenant): ${leftover} used as a value; prefer calling randomUUID() directly.`);
    notes.push(`${file.path}: ${leftover} is referenced as a value; aliased to randomUUID.`);
  } else {
    code = code.replace("__REVENANT_IMPORT__", importLine);
  }
  code = code.replace(/__REVENANT_IMPORT__\n?/g, "");
  return { code, notes };
}

export const uuidRecipe: Recipe = {
  id: "uuid3-to-randomuuid",
  package: "uuid",
  replacement: "crypto.randomUUID",
  title: "Replace uuid@3 v4() with crypto.randomUUID()",
  transform: (file) => transform(file),
  extraFiles: () => [],
  editPackageJson(text, ctx) {
    if (ctx.stillUsed) return text;
    const json = JSON.parse(text) as Record<string, unknown>;
    for (const key of ["dependencies", "devDependencies"]) {
      const sec = json[key] as Record<string, string> | undefined;
      if (sec) delete sec["uuid"];
    }
    return `${JSON.stringify(json, null, 2)}\n`;
  },
  testFile: { path: "tests/revenant/uuid3-to-randomuuid.differential.test.ts", content: UUID_TEST, deps: ["vitest", "fast-check", "uuid@3"] },
  limits: [
    "Only v4() is migrated. v1/v3/v5 stay on uuid and the dependency is kept when they are used.",
    "Calls that pass options or a buffer to v4() cannot be expressed with randomUUID(); those files are left unchanged and reported.",
    "Differential tests compare format, version and variant bits and uniqueness; randomness quality is delegated to the platform CSPRNG.",
  ],
};
