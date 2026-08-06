export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Main: refuse unsafe combinations (e.g. mock payments in production).
    // Ops: full boot checklist — missing DATABASE_URL / JWT must stop here,
    // not surface as a 500 on someone's checkout.
    const { assertSafeRuntimeEnv, assertBootEnvOrExit } = await import(
      "./src/shared/env"
    );
    assertSafeRuntimeEnv();
    assertBootEnvOrExit();

    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
