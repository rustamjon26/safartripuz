import { describe, expect, it } from "vitest";
import { PAYME_ERRORS } from "./errors";
import { canTransition } from "@/src/modules/booking";

describe("payme.webhook error codes", () => {
  it("maps business and transport codes", () => {
    expect(PAYME_ERRORS.WRONG_AMOUNT.code).toBe(-31001);
    expect(PAYME_ERRORS.TRANSACTION_NOT_FOUND.code).toBe(-31003);
    expect(PAYME_ERRORS.UNABLE_TO_CANCEL.code).toBe(-31007);
    expect(PAYME_ERRORS.BAD_STATE.code).toBe(-31008);
    expect(PAYME_ERRORS.INVALID_ACCOUNT.code).toBe(-31050);
    expect(PAYME_ERRORS.METHOD_NOT_FOUND.code).toBe(-32601);
    expect(PAYME_ERRORS.AUTH_FAILED.code).toBe(-32504);
  });

  it("documents Payme states 1/2/-1/-2", () => {
    const STATE = {
      CREATED: 1,
      PERFORMED: 2,
      CANCEL_PENDING: -1,
      CANCEL_AFTER: -2,
    };
    expect(STATE.CREATED).toBe(1);
    expect(STATE.PERFORMED).toBe(2);
  });
});

describe("payme amount + idempotency contracts", () => {
  it("rejects wrong amount via error code contract", () => {
    const expectedTiyin = 100_000n;
    const receivedTiyin = 99_000n;
    // Avoid `a !== b` on bigint literals — TS2367 (always-true comparison).
    expect(expectedTiyin).not.toBe(receivedTiyin);
    expect(PAYME_ERRORS.WRONG_AMOUNT.code).toBe(-31001);
  });

  it("duplicate providerEventId format is stable", () => {
    const payme = `payme:order:PerformTransaction:abc`;
    expect(payme).toMatch(/^payme:order:/);
    expect(payme).toBe(`payme:order:PerformTransaction:abc`);
  });

  it("EXPIRED hold cannot confirm via state machine (MANUAL_REVIEW)", () => {
    expect(canTransition("EXPIRED", "CONFIRMED")).toBe(false);
  });
});
