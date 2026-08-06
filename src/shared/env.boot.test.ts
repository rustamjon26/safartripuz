import { describe, expect, it } from "vitest";
import { assertSafeRuntimeEnv } from "./env";

function envOf(nodeEnv?: string, flag?: string): NodeJS.ProcessEnv {
  return {
    ...(nodeEnv !== undefined ? { NODE_ENV: nodeEnv } : {}),
    ...(flag !== undefined ? { PAYMENTS_MOCK_ENABLED: flag } : {}),
  } as NodeJS.ProcessEnv;
}

describe("assertSafeRuntimeEnv", () => {
  it("refuses to start production with mock payments enabled", () => {
    expect(() => assertSafeRuntimeEnv(envOf("production", "true"))).toThrow(
      /Refusing to start/,
    );
    expect(() => assertSafeRuntimeEnv(envOf("production", "true"))).toThrow(
      /PAYMENTS_MOCK_ENABLED/,
    );
  });

  it("allows production without the flag", () => {
    expect(() => assertSafeRuntimeEnv(envOf("production"))).not.toThrow();
    expect(() =>
      assertSafeRuntimeEnv(envOf("production", "false")),
    ).not.toThrow();
  });

  it("allows the flag outside production", () => {
    expect(() => assertSafeRuntimeEnv(envOf("development", "true"))).not.toThrow();
    expect(() => assertSafeRuntimeEnv(envOf("test", "true"))).not.toThrow();
  });
});
