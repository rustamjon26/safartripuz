import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClickSignString,
  md5Hex,
  verifyClickSignature,
} from "./sign";

const SECRET = "test_secret";
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..", "..");

function readRoute(relative: string): string {
  return readFileSync(path.join(repoRoot, relative), "utf8");
}

describe("click.webhook signatures", () => {
  it("valid Prepare (no merchant_prepare_id in string)", () => {
    const body = {
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: "pay_1",
      amount: 1000.5,
      action: 0,
      sign_time: "2026-01-01",
      sign_string: "",
    };
    const sign = md5Hex(buildClickSignString(body, SECRET, "prepare"));
    expect(
      verifyClickSignature({ ...body, sign_string: sign }, SECRET, "prepare"),
    ).toBe(true);
    const wrong = md5Hex(
      buildClickSignString(
        { ...body, merchant_prepare_id: "x" },
        SECRET,
        "complete",
      ),
    );
    expect(
      verifyClickSignature({ ...body, sign_string: wrong }, SECRET, "prepare"),
    ).toBe(false);
  });

  it("valid Complete includes merchant_prepare_id", () => {
    const body = {
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: "pay_1",
      merchant_prepare_id: "ptx_abc",
      amount: 1000.5,
      action: 1,
      sign_time: "2026-01-01",
      sign_string: "",
    };
    const sign = md5Hex(buildClickSignString(body, SECRET, "complete"));
    expect(
      verifyClickSignature({ ...body, sign_string: sign }, SECRET, "complete"),
    ).toBe(true);
  });

  it("tampered amount fails", () => {
    const body = {
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: "pay_1",
      merchant_prepare_id: "ptx_abc",
      amount: 1000.5,
      action: 1,
      sign_time: "2026-01-01",
      sign_string: "",
    };
    const sign = md5Hex(buildClickSignString(body, SECRET, "complete"));
    expect(
      verifyClickSignature(
        { ...body, amount: 999, sign_string: sign },
        SECRET,
        "complete",
      ),
    ).toBe(false);
  });

  it("duplicate delivery uses same sign_string (idempotent verify)", () => {
    const body = {
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: "pay_1",
      merchant_prepare_id: "ptx_abc",
      amount: 1000.5,
      action: 1,
      sign_time: "2026-01-01",
      sign_string: "",
    };
    const sign = md5Hex(buildClickSignString(body, SECRET, "complete"));
    const signed = { ...body, sign_string: sign };
    expect(verifyClickSignature(signed, SECRET, "complete")).toBe(true);
    expect(verifyClickSignature(signed, SECRET, "complete")).toBe(true);
  });
});

describe("click live routes call processClickShop", () => {
  it("prepare, complete, and legacy webhook routes import processClickShop", () => {
    for (const file of [
      "app/api/payments/webhook/click/prepare/route.ts",
      "app/api/payments/webhook/click/complete/route.ts",
      "app/api/payments/webhook/click/route.ts",
    ]) {
      const src = readRoute(file);
      expect(src).toContain("processClickShop");
      expect(src).not.toContain("clickHttpHandler");
    }
  });
});
