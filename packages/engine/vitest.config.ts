import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts", "recipes/**/*.test.ts"], testTimeout: 60000 },
});
