import { describe, expect, it } from "vitest";
import { deriveClaimLevel } from "./deriveClaimLevel";
import { normalizePublisherKey } from "./normalizePublisherKey";

describe("normalizePublisherKey", () => {
  it("lowercases and trims", () => {
    expect(normalizePublisherKey("  UNESCO  ")).toBe("unesco");
  });

  it("strips protocol and www from domains", () => {
    expect(normalizePublisherKey("https://www.unesco.org/en/list")).toBe("unesco.org");
    expect(normalizePublisherKey("www.unesco.org")).toBe("unesco.org");
  });
});

describe("deriveClaimLevel", () => {
  it("marks NIZOLI when sources back more than one position", () => {
    const level = deriveClaimLevel({
      isFolklore: false,
      positions: [{ id: "p1" }, { id: "p2" }],
      sources: [
        { tier: "A_RASMIY", publisherKey: "unesco", positionId: "p1" },
        { tier: "B_ILMIY", publisherKey: "institute", positionId: "p2" },
      ],
    });
    expect(level).toBe("NIZOLI");
  });

  it("does not pick a winner for a two-position dispute", () => {
    const level = deriveClaimLevel({
      isFolklore: false,
      positions: [{ id: "a" }, { id: "b" }],
      sources: [
        { tier: "A_RASMIY", publisherKey: "gov", positionId: "a" },
        { tier: "A_RASMIY", publisherKey: "museum", positionId: "b" },
      ],
    });
    expect(level).toBe("NIZOLI");
    expect(level).not.toBe("TASDIQLANGAN");
  });

  it("returns OGZAKI_RIVOYAT when folklore", () => {
    expect(
      deriveClaimLevel({
        isFolklore: true,
        positions: [],
        sources: [{ tier: "A_RASMIY", publisherKey: "unesco" }],
      }),
    ).toBe("OGZAKI_RIVOYAT");
  });

  it("one A source only → TASDIQLANMAGAN", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [{ tier: "A_RASMIY", publisherKey: "unesco" }],
      }),
    ).toBe("TASDIQLANMAGAN");
  });

  it("two distinct A publishers → TASDIQLANGAN", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [
          { tier: "A_RASMIY", publisherKey: "unesco" },
          { tier: "A_RASMIY", publisherKey: "gov.uz" },
        ],
      }),
    ).toBe("TASDIQLANGAN");
  });

  it("two A-tier sources from the same publisher → TASDIQLANMAGAN (not TASDIQLANGAN)", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [
          { tier: "A_RASMIY", publisherKey: normalizePublisherKey("UNESCO") },
          { tier: "A_RASMIY", publisherKey: normalizePublisherKey("unesco") },
        ],
      }),
    ).toBe("TASDIQLANMAGAN");
  });

  it("same publisherKey via www vs bare domain still counts once", () => {
    const a = normalizePublisherKey("https://www.unesco.org/page-a");
    const b = normalizePublisherKey("unesco.org");
    expect(a).toBe(b);
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [
          { tier: "A_RASMIY", publisherKey: a },
          { tier: "A_RASMIY", publisherKey: b },
        ],
      }),
    ).toBe("TASDIQLANMAGAN");
  });

  it("D-only claim stays TASDIQLANMAGAN", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [
          { tier: "D_IKKILAMCHI", publisherKey: "blog-a" },
          { tier: "D_IKKILAMCHI", publisherKey: "blog-b" },
        ],
      }),
    ).toBe("TASDIQLANMAGAN");
  });

  it("C-only claim stays TASDIQLANMAGAN", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [{ tier: "C_ENSIKLOPEDIK", publisherKey: "britannica" }],
      }),
    ).toBe("TASDIQLANMAGAN");
  });

  it("one B source → ILMIY_MANBA", () => {
    expect(
      deriveClaimLevel({
        isFolklore: false,
        positions: [],
        sources: [{ tier: "B_ILMIY", publisherKey: "orientology" }],
      }),
    ).toBe("ILMIY_MANBA");
  });
});
