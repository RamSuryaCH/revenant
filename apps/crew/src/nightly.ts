import { runNightly } from "./core/nightly.js";

runNightly()
  .then(({ run, report }) => {
    process.stdout.write(`${report}\n`);
    process.exitCode = run.ok ? 0 : 1;
  })
  .catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
