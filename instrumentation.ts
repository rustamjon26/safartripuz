export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Boot gate: refuse to start on an unsafe env combination rather than
    // discovering it when a payment route is hit.
    const { assertSafeRuntimeEnv } = await import("./src/shared/env");
    assertSafeRuntimeEnv();

    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
