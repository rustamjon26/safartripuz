import { describe, expect, it } from "vitest";
import { assertInvoiceTransition, canTransition, InvoiceStatusError } from "./status";

describe("invoice status machine", () => {
  it("allows draft → issued → sent → paid", () => {
    expect(canTransition("DRAFT", "ISSUED")).toBe(true);
    expect(canTransition("ISSUED", "SENT")).toBe(true);
    expect(canTransition("SENT", "PAID")).toBe(true);
  });

  it("blocks paid → anything", () => {
    expect(canTransition("PAID", "VOID")).toBe(false);
    expect(canTransition("PAID", "DRAFT")).toBe(false);
  });

  it("throws on illegal transition", () => {
    expect(() => assertInvoiceTransition("VOID", "DRAFT")).toThrow(
      InvoiceStatusError,
    );
  });
});
