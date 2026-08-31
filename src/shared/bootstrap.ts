import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { assertBootEnvOrExit } from "./env";

/**
 * PM2 starts processes with a near-empty env, so every Node entry point has to
 * read the dotenv files itself. Order is deliberate and matches what production
 * has always done: `.env` is applied last and therefore wins.
 */
export function loadServerEnv(cwd: string = process.cwd()): void {
  loadEnv({ path: resolve(cwd, ".env.local"), override: true });
  loadEnv({ path: resolve(cwd, ".env"), override: true });
}

/** Entry-point bootstrap: load dotenv files, then refuse to run on bad config. */
export function bootstrapProcess(cwd: string = process.cwd()): void {
  loadServerEnv(cwd);
  assertBootEnvOrExit();
}
