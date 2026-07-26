import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    // Vitest 4: poolOptions removed; single-worker isolation via maxWorkers.
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: ["src/test/vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
