import { describe, expect, it, vi } from "vitest";
import { PAYME_ERRORS } from "./errors";
import { validatePaymeAuth } from "./payme-auth";

const KEY = "KeyFromMerchantCabinet";
const CREDENTIAL = Buffer.from(`Paycom:${KEY}`).toString("base64");

/** Payme's own docs use exactly this header shape. */
const HEADER = `Basic ${CREDENTIAL}`;

describe("validatePaymeAuth", () => {
  it("accepts the documented Payme header", () => {
    expect(validatePaymeAuth(HEADER, KEY)).toEqual({ ok: true });
  });

  it("accepts any casing of the auth-scheme token (RFC 7235)", () => {
    for (const scheme of ["Basic", "basic", "BASIC", "BaSiC"]) {
      expect(validatePaymeAuth(`${scheme} ${CREDENTIAL}`, KEY)).toEqual({
        ok: true,
      });
    }
  });

  it("tolerates surrounding and separating whitespace", () => {
    expect(validatePaymeAuth(`  Basic   ${CREDENTIAL}  `, KEY)).toEqual({
      ok: true,
    });
    expect(validatePaymeAuth(`Basic\t${CREDENTIAL}`, KEY)).toEqual({ ok: true });
  });

  it("rejects a credential whose case differs (base64 is case-sensitive)", () => {
    const flipped = CREDENTIAL.toLowerCase();
    expect(flipped).not.toBe(CREDENTIAL);
    expect(validatePaymeAuth(`Basic ${flipped}`, KEY)).toEqual({
      ok: false,
      error: PAYME_ERRORS.AUTH_FAILED,
    });
  });

  it("rejects a credential built from the wrong key", () => {
    const other = Buffer.from("Paycom:WrongKey").toString("base64");
    expect(validatePaymeAuth(`Basic ${other}`, KEY)).toEqual({
      ok: false,
      error: PAYME_ERRORS.AUTH_FAILED,
    });
  });

  it("rejects the wrong login even with the right key", () => {
    const wrongLogin = Buffer.from(`paycom:${KEY}`).toString("base64");
    expect(validatePaymeAuth(`Basic ${wrongLogin}`, KEY)).toEqual({
      ok: false,
      error: PAYME_ERRORS.AUTH_FAILED,
    });
  });

  it("rejects a missing, empty or non-Basic header", () => {
    const fail = { ok: false, error: PAYME_ERRORS.AUTH_FAILED };
    expect(validatePaymeAuth(null, KEY)).toEqual(fail);
    expect(validatePaymeAuth(undefined, KEY)).toEqual(fail);
    expect(validatePaymeAuth("", KEY)).toEqual(fail);
    expect(validatePaymeAuth(`Bearer ${CREDENTIAL}`, KEY)).toEqual(fail);
    expect(validatePaymeAuth("Basic", KEY)).toEqual(fail);
  });

  it("fails closed when the secret key is not configured", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(validatePaymeAuth(HEADER, "")).toEqual({
      ok: false,
      error: PAYME_ERRORS.AUTH_FAILED,
    });
    spy.mockRestore();
  });
});
