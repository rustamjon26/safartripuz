import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: ["src/test/vitest.setup.ts"],
    include: [
      "src/**/*.{test,spec}.ts",
      "lib/**/*.{test,spec}.ts",
      "app/**/*.{test,spec}.ts",
      "components/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
      "public/**/*.{test,spec}.ts",
      // Root-level modules (middleware.ts, server.ts, eslint config) live here, not in a folder.
      "*.{test,spec}.ts",
    ],
    exclude: ["node_modules/**", ".next/**"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
