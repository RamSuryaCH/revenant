import { createServer } from "node:http";
import { loadState } from "./core/store.js";
import { APP_NAME } from "./core/types.js";
import { createHandler } from "./server.js";

const port = Number(process.env["PORT"] ?? 9100);
const { handler, startScan } = createHandler();
createServer((req, res) => void handler(req, res)).listen(port, "127.0.0.1", () => {
  process.stdout.write(`${APP_NAME} backend on ${port}\n`);
  // First run: scan anything that has no snapshot yet.
  void loadState().then((s) => s.watched.filter((r) => !s.snapshots[r]).forEach(startScan));
});
