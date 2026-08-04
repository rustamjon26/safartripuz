import { describe, expect, it, vi } from "vitest";
import { ensureApprovedTaxiPartner } from "./partner";

describe("ensureApprovedTaxiPartner", () => {
  it("creates a taxi partner when none exists", async () => {
    const created = {
      id: "p1",
      userId: "u1",
      type: "taxi" as const,
      status: "approved" as const,
      displayName: "Ali",
      contactEmail: "a@b.c",
      contactPhone: null,
    };
    const tx = {
      partner: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn(),
      },
    };

    const result = await ensureApprovedTaxiPartner(tx as never, {
      userId: "u1",
      displayName: "Ali",
      contactEmail: "a@b.c",
      contactPhone: null,
    });

    expect(result.type).toBe("taxi");
    expect(tx.partner.create).toHaveBeenCalledOnce();
    expect(tx.partner.update).not.toHaveBeenCalled();
  });

  it("converts hotel-linked partner type to taxi (does not no-op)", async () => {
    const existing = {
      id: "p1",
      userId: "u1",
      type: "hotel" as const,
      status: "approved" as const,
      displayName: "Nuriya",
      contactEmail: "n@x.com",
      contactPhone: null,
    };
    const updated = { ...existing, type: "taxi" as const };
    const tx = {
      partner: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(updated),
      },
    };

    const result = await ensureApprovedTaxiPartner(tx as never, {
      userId: "u1",
      displayName: "Nuriya",
      contactEmail: "n@x.com",
      contactPhone: null,
    });

    expect(result.type).toBe("taxi");
    expect(tx.partner.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ type: "taxi", status: "approved" }),
    });
  });
});
