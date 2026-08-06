import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isProductionRuntime,
  mockPaymentsEnabled,
  mockPaymentsMisconfigured,
  resetMockPaymentsWarningForTests,
} from "./mockGate";

/** `NODE_ENV` is readonly in @types/node; stubEnv is the supported way in. */
function setEnv(nodeEnv: string | undefined, flag: string | undefined): void {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("PAYMENTS_MOCK_ENABLED", flag);
}

beforeEach(() => {
  resetMockPaymentsWarningForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("mockPaymentsEnabled in production", () => {
  it("stays off even when the flag is explicitly true", () => {
    setEnv("production", "true");
    expect(mockPaymentsEnabled()).toBe(false);
  });

  it("stays off for every other flag value", () => {
    for (const flag of [undefined, "false", "TRUE", "1", "yes", ""]) {
      setEnv("production", flag);
      resetMockPaymentsWarningForTests();
      expect(mockPaymentsEnabled()).toBe(false);
    }
  });

  it("logs one loud alert when the flag is set, not one per call", () => {
    setEnv("production", "true");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockPaymentsEnabled();
    mockPaymentsEnabled();
    mockPaymentsEnabled();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain(
      "payments_mock_enabled_in_production",
    );
  });

  it("does not warn when the flag is absent", () => {
    setEnv("production", undefined);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPaymentsEnabled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("mockPaymentsEnabled outside production", () => {
  it("honours an explicit true in development", () => {
    setEnv("development", "true");
    expect(mockPaymentsEnabled()).toBe(true);
  });

  it("honours an explicit false in development", () => {
    setEnv("development", "false");
    expect(mockPaymentsEnabled()).toBe(false);
  });

  it("defaults to on when the flag is unset", () => {
    setEnv("development", undefined);
    expect(mockPaymentsEnabled()).toBe(true);
    setEnv("test", undefined);
    expect(mockPaymentsEnabled()).toBe(true);
  });
});

describe("production detection and misconfiguration signal", () => {
  it("keys off NODE_ENV", () => {
    setEnv("production", undefined);
    expect(isProductionRuntime()).toBe(true);
    setEnv("development", undefined);
    expect(isProductionRuntime()).toBe(false);
    setEnv(undefined, undefined);
    expect(isProductionRuntime()).toBe(false);
  });

  it("flags the unsafe combination only", () => {
    setEnv("production", "true");
    expect(mockPaymentsMisconfigured()).toBe(true);
    setEnv("production", "false");
    expect(mockPaymentsMisconfigured()).toBe(false);
    setEnv("development", "true");
    expect(mockPaymentsMisconfigured()).toBe(false);
  });
});
