import { describe, expect, it, vi } from "vitest";
import {
  demotePartnerIfRoleLeft,
  ensureApprovedGuidePartner,
  ensureApprovedTaxiPartner,
  roleNeedsApprovedPartner,
} from "./partner";

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

describe("demotePartnerIfRoleLeft", () => {
  it("demotes approved partner when role becomes support", async () => {
    const tx = {
      partner: {
        findUnique: vi.fn().mockResolvedValue({ id: "p9", status: "approved" }),
        update: vi.fn().mockResolvedValue({ id: "p9", status: "pending" }),
      },
    };
    await demotePartnerIfRoleLeft(tx as never, "u9", "support");
    expect(roleNeedsApprovedPartner("support")).toBe(false);
    expect(tx.partner.update).toHaveBeenCalledWith({
      where: { id: "p9" },
      data: { status: "pending" },
    });
  });

  it("no-ops for taxi roles", async () => {
    const tx = {
      partner: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    await demotePartnerIfRoleLeft(tx as never, "u9", "taxi");
    expect(tx.partner.findUnique).not.toHaveBeenCalled();
  });
});

describe("ensureApprovedGuidePartner", () => {
  it("converts hotel partner type to guide", async () => {
    const existing = {
      id: "p2",
      userId: "u2",
      type: "hotel" as const,
      status: "approved" as const,
      displayName: "Gid",
      contactEmail: "g@x.com",
      contactPhone: null,
    };
    const updated = { ...existing, type: "guide" as const };
    const tx = {
      partner: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue(updated),
      },
    };

    const result = await ensureApprovedGuidePartner(tx as never, {
      userId: "u2",
      displayName: "Gid",
      contactEmail: "g@x.com",
      contactPhone: null,
    });

    expect(result.type).toBe("guide");
    expect(tx.partner.update).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: expect.objectContaining({ type: "guide", status: "approved" }),
    });
  });
});
