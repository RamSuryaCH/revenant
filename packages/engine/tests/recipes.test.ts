import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { RECIPES, recipeForPackage, resurrect } from "../src/recipes/index.js";
import { Resurrection, ScanResult } from "../src/schema.js";
import { parseSuccessorFromDeprecation } from "../src/successors.js";

const pkg = JSON.stringify({ name: "x", dependencies: { moment: "^2.19.0", request: "^2.88.2", uuid: "^3.4.0", express: "^4" } }, null, 2);
const run = (recipeId: string, files: { path: string; content: string }[]) => resurrect({ recipeId, files: [{ path: "package.json", content: pkg }, ...files] });

describe("recipes: transforms", () => {
  it("moment: rewrites require, aliased imports and adds plugins", () => {
    const r = run("moment-to-dayjs", [
      { path: "a.js", content: "const m = require('moment');\nconst x = m().add(1, 'day');\nx.fromNow();\n" },
      { path: "b.ts", content: "import moment from 'moment';\nexport const f = (d: Date) => moment(d).format('YYYY');\n" },
    ]);
    expect(r.stats.filesChanged).toBe(2);
    expect(r.patch).toContain("+const dayjs = require('dayjs');");
    expect(r.patch).toContain("+dayjs().add(1, 'day')".replace("+dayjs", "+const x = dayjs")); // const x = dayjs().add(...)
    expect(r.patch).toContain("dayjs/plugin/relativeTime");
    expect(r.patch).toContain('+    "dayjs": "^1.11.13"');
    expect(r.patch).not.toMatch(/\+.*require\('moment'\)/);
  });

  it("moment: flags discarded mutations instead of hiding them", () => {
    const r = run("moment-to-dayjs", [{ path: "a.js", content: "const moment = require('moment');\nconst d = moment();\nd.add(1, 'day');\n" }]);
    expect(r.patch).toContain("TODO(revenant)");
    expect(r.notes.join(" ")).toMatch(/immutable/);
  });

  it("request: points imports at the shim with a correct relative path and adds the shim", () => {
    const r = run("request-to-fetch", [
      { path: "src/deep/a.js", content: "const request = require('request');\nrequest('http://x', () => {});\n" },
      { path: "src/b.js", content: "import req from 'request';\n" },
    ]);
    expect(r.patch).toContain("require('../../lib/request-compat.cjs')");
    expect(r.patch).toContain("from '../lib/request-compat.cjs'");
    expect(r.files.some((f) => f.path === "lib/request-compat.cjs" && f.kind === "add")).toBe(true);
    expect(r.patch).toContain("new file mode 100644");
  });

  it("request: flags pipe/streams", () => {
    const r = run("request-to-fetch", [{ path: "a.js", content: "const request = require('request');\nrequest(u).pipe(out);\n" }]);
    expect(r.notes.join(" ")).toMatch(/streaming/);
  });

  it("uuid: migrates v4 in every supported import shape", () => {
    const shapes = [
      "const uuidv4 = require('uuid/v4');\nconst a = uuidv4();\n",
      "import uuidv4 from 'uuid/v4';\nconst a = uuidv4();\n",
      "const { v4: id } = require('uuid');\nconst a = id();\n",
      "import { v4 as id } from 'uuid';\nconst a = id();\n",
      "const uuid = require('uuid');\nconst a = uuid.v4();\n",
    ];
    for (const content of shapes) {
      const r = run("uuid3-to-randomuuid", [{ path: "a.js", content }]);
      expect(r.patch, content).toContain("+const a = randomUUID();");
      expect(r.patch, content).toMatch(/\+(?:const \{ randomUUID \} = require|import \{ randomUUID \} from)/);
      expect(r.files.some((f) => f.path === "package.json"), content).toBe(true);
    }
  });

  it("uuid: leaves files alone when v4 gets arguments or other versions are used", () => {
    const withArgs = run("uuid3-to-randomuuid", [{ path: "a.js", content: "const v4 = require('uuid/v4');\nv4({ random: [1] });\n" }]);
    expect(withArgs.stats.filesChanged).toBe(0);
    expect(withArgs.notes.join(" ")).toMatch(/arguments/);
    const mixed = run("uuid3-to-randomuuid", [{ path: "a.js", content: "const uuid = require('uuid');\nuuid.v1();\nuuid.v4();\n" }]);
    expect(mixed.stats.filesChanged).toBe(0);
  });

  it("reports honestly when nothing uses the package", () => {
    const r = run("moment-to-dayjs", [{ path: "a.js", content: "console.log(1)\n" }]);
    expect(r.stats.filesChanged).toBe(0);
    expect(r.patch).toBe("");
    expect(r.notes.join(" ")).toMatch(/nothing to migrate/);
  });

  it("every recipe is a no-op on arbitrary code that does not mention the package", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }).filter((s) => !/moment|request|uuid/.test(s)), (code) => {
        for (const id of Object.keys(RECIPES)) {
          const r = resurrect({ recipeId: id, files: [{ path: "package.json", content: pkg }, { path: "x.js", content: code }] });
          expect(r.stats.filesChanged).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output validates against the Resurrection schema and carries a Kiro spec with EARS + mermaid + traceability", () => {
    const r = run("moment-to-dayjs", [{ path: "a.js", content: "const moment = require('moment');\nmoment();\n" }]);
    expect(() => Resurrection.parse(r)).not.toThrow();
    expect(r.spec.requirements).toMatch(/WHEN .* THE SYSTEM SHALL/);
    expect(r.spec.design).toContain("```mermaid");
    expect(r.spec.tasks).toMatch(/_Requirements: R/);
    expect(r.tests.content).toContain("fast-check");
  });

  it("recipeForPackage maps curated packages only", () => {
    expect(recipeForPackage("moment")?.id).toBe("moment-to-dayjs");
    expect(recipeForPackage("left-pad")).toBeNull();
  });

  it("parses successors from npm deprecation text", () => {
    expect(parseSuccessorFromDeprecation("Please use got instead")).toBe("got");
    expect(parseSuccessorFromDeprecation("This package is dead")).toBeNull();
  });
});

describe("cached samples", () => {
  it("the committed ScanResult sample matches the frozen schema and cites evidence everywhere", () => {
    const s = ScanResult.parse(JSON.parse(readFileSync(new URL("../../../apps/web/public/samples/cursed.scan.json", import.meta.url), "utf8")));
    expect(s.tombstones.length).toBeGreaterThan(10);
    for (const t of s.tombstones) for (const e of t.epitaphs) expect(e.evidence.length).toBeGreaterThan(0);
  });
});

import { applyResurrection } from "../src/recipes/index.js";
describe("applyResurrection", () => {
  it("reproduces the migrated files from the diffs", () => {
    const files = [
      { path: "package.json", content: '{\n  "name": "x",\n  "dependencies": {\n    "uuid": "3.4.0"\n  }\n}\n' },
      { path: "src/ids.js", content: 'const uuid = require("uuid/v4");\nmodule.exports = () => uuid();\n' },
    ];
    const r = resurrect({ recipeId: "uuid3-to-randomuuid", files });
    const out = applyResurrection(files, r);
    expect(out.length).toBe(r.files.length);
    expect(out.find((f) => f.path === "src/ids.js")?.content).not.toContain('require("uuid/v4")');
  });
});
