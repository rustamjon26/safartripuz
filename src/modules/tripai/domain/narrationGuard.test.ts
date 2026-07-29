import { describe, expect, it } from "vitest";
import {
  findDisallowedMentions,
  narrationIsValid,
  buildTemplateNarration,
} from "./narrationGuard";

describe("narrationGuard", () => {
  it("rejects a narration that invents Registon when schedule is Zomin-only", () => {
    const allowed = ["Zomin ko‘li", "Qizilsoy"];
    const narration =
      "Ertalab Zomin ko‘lini ko‘ring, keyin mashhur Registon maydoniga boring.";
    expect(narrationIsValid(narration, allowed)).toBe(false);
    expect(findDisallowedMentions(narration, allowed)).toContain("Registon");
  });

  it("allows narration that only names scheduled sites", () => {
    const allowed = ["Zomin ko‘li", "Qizilsoy"];
    const narration = "1-kun: Zomin ko‘li. 2-kun: Qizilsoy.";
    expect(narrationIsValid(narration, allowed)).toBe(true);
  });

  it("buildTemplateNarration only uses provided slot names", () => {
    const text = buildTemplateNarration({
      regionDisplay: "Zomin",
      lang: "uz",
      days: [
        {
          day: 1,
          slots: [{ siteName: "Zomin ko‘li", startTime: "09:00" }],
        },
      ],
    });
    expect(text).toContain("Zomin ko‘li");
    expect(text.toLowerCase()).not.toContain("registon");
  });
});
