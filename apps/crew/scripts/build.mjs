// Bundles everything the installed app needs into apps/crew itself, so
// `kirocrew app install apps/crew` works with only Node on the machine.
import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = { bundle: true, platform: "node", format: "esm", target: "node20", logLevel: "info", legalComments: "none" };
// CJS dependencies inside an ESM bundle need require().
const banner = { js: 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' };

await Promise.all([
  build({ ...node, banner, entryPoints: [`${root}/src/main.ts`], outfile: `${root}/backend/server.mjs` }),
  build({ ...node, banner, entryPoints: [`${root}/src/nightly.ts`], outfile: `${root}/bin/nightly.mjs` }),
  build({ ...node, banner, entryPoints: [resolve(root, "../../packages/mcp/src/cli.ts")], outfile: `${root}/bin/revenant-mcp.mjs` }),
  build({
    entryPoints: [`${root}/src/ui/App.tsx`],
    outfile: `${root}/ui/index.mjs`,
    bundle: true,
    format: "esm",
    target: "es2022",
    jsx: "automatic",
    minify: true,
    legalComments: "none",
    external: ["react", "react-dom", "react/jsx-runtime", "@kirocrew/app-sdk", "@kirocrew/app-sdk/ui", "lucide-react"],
    logLevel: "info",
  }),
]);
