import { describe, expect, it } from "vitest";
import { enrichClaims, isEstablishedLevel } from "./enrich";

describe("enrichClaims", () => {
  it("never surfaces TASDIQLANMAGAN as established", () => {
    const [claim] = enrichClaims([
      {
        id: "c1",
        text: "Unverified rumour",
        kind: "TARIX",
        level: "TASDIQLANMAGAN",
      },
    ]);
    expect(claim!.established).toBe(false);
    expect(isEstablishedLevel("TASDIQLANMAGAN")).toBe(false);
  });

  it("marks TASDIQLANGAN as established", () => {
    const [claim] = enrichClaims([
      {
        id: "c2",
        text: "Confirmed fact",
        kind: "TARIX",
        level: "TASDIQLANGAN",
      },
    ]);
    expect(claim!.established).toBe(true);
  });

  it("keeps all NIZOLI positions without picking a winner", () => {
    const [claim] = enrichClaims([
      {
        id: "c3",
        text: "Disputed",
        kind: "TARIX",
        level: "NIZOLI",
        positions: [
          { id: "p1", label: "Rasmiy", text: "View A", sourceTitles: ["Gov"] },
          { id: "p2", label: "Rivoyat", text: "View B", sourceTitles: ["Oral"] },
        ],
      },
    ]);
    expect(claim!.established).toBe(false);
    expect(claim!.positions).toHaveLength(2);
  });

  it("labels OGZAKI_RIVOYAT as folklore", () => {
    const [claim] = enrichClaims([
      {
        id: "c4",
        text: "Folk tale",
        kind: "RIVOYAT",
        level: "OGZAKI_RIVOYAT",
      },
    ]);
    expect(claim!.folklore).toBe(true);
    expect(claim!.established).toBe(false);
  });
});
