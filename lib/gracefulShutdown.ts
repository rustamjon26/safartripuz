import type { Server as HttpServer } from "node:http";

export type ShutdownDeps = {
  httpServer: HttpServer;
  /** Close realtime connections before draining HTTP. */
  closeRealtime?: () => void | Promise<void>;
  /** Next.js app teardown. */
  closeApp?: () => Promise<void>;
  /** Release the database pool once nothing is in flight. */
  closeDatabase?: () => Promise<void>;
  timeoutMs?: number;
  log?: Pick<Console, "log" | "error">;
  exit?: (code: number) => void;
};

/** PM2 sends SIGINT and then SIGKILL, so the drain has to finish well before that. */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Stop taking new work, let in-flight requests finish, then drop the DB pool.
 *
 * Without this a deploy restart kills requests mid-transaction — including
 * Payme/Click webhooks — and leaves MySQL connections to time out on their own.
 */
export function createShutdownHandler(deps: ShutdownDeps): (signal: string) => Promise<void> {
  const log = deps.log ?? console;
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const timeoutMs = deps.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

  let started = false;

  return async function shutdown(signal: string): Promise<void> {
    if (started) return;
    started = true;
    log.log(`[shutdown] ${signal} received; draining...`);

    const force = setTimeout(() => {
      log.error(
        `[shutdown] in-flight requests still open after ${timeoutMs}ms; exiting anyway`,
      );
      exit(1);
    }, timeoutMs);
    force.unref();

    try {
      await deps.closeRealtime?.();
      await new Promise<void>((resolve) => {
        deps.httpServer.close(() => resolve());
        // Idle keep-alive sockets would hold `close` open indefinitely;
        // connections with a request in flight are left to finish.
        deps.httpServer.closeIdleConnections();
      });
      await deps.closeApp?.();
      await deps.closeDatabase?.();
      log.log("[shutdown] drained cleanly");
      clearTimeout(force);
      exit(0);
    } catch (err) {
      log.error("[shutdown] failed", err);
      clearTimeout(force);
      exit(1);
    }
  };
}

export function installSignalHandlers(
  shutdown: (signal: string) => Promise<void>,
  signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"],
): void {
  for (const signal of signals) {
    process.on(signal, () => void shutdown(signal));
  }
}
