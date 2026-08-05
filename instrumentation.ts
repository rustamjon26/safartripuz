export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Before anything serves a request: a missing DATABASE_URL or JWT secret
    // should stop the process here, not surface as a 500 on someone's checkout.
    const { assertBootEnvOrExit } = await import("./src/shared/env");
    assertBootEnvOrExit();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
