import { describe, expect, it } from "vitest";
import { parseAiMatchIntent } from "./aiMatchParse";
import { UZ_DIALOG_EXAMPLES } from "./uzbekistanDialogs";
import {
  geographyBrainForPrompt,
  isAmbiguousDestinationPrompt,
  matchPlaceCity,
  matchRoute,
  matchTheme,
  namedCatalogCity,
} from "./uzbekistanPlaces";
import { UZ_ROUTES } from "./uzbekistanRoutes";
import { UZ_THEMES } from "./uzbekistanThemes";

const catalog = ["Samarqand", "Buxoro", "Xiva", "Toshkent", "Zomin", "Jizzax"];

describe("section 3 themes", () => {
  it("loads the theme table", () => {
    expect(UZ_THEMES.length).toBeGreaterThanOrEqual(5);
  });

  it("does not auto-pick a Silk Road city", () => {
    expect(isAmbiguousDestinationPrompt("Tarixiy shaharlar", catalog)).toBe(
      true,
    );
    expect(namedCatalogCity("Ipak yo'li", catalog)).toBe("");
    expect(parseAiMatchIntent("", catalog, "Silk road").destination).toBe("");
  });

  it("asks Zomin vs Toshkent for a mountain theme", () => {
    const theme = matchTheme("Tog'larga dam olamiz");
    expect(theme?.id).toBe("tog_tabiat");
    const intent = parseAiMatchIntent("", catalog, "Tog'larga dam");
    expect(intent.destination).toBe("");
    expect(intent.message).toMatch(/Zomin|Chimyon/i);
  });
});

describe("section 4 routes", () => {
  it("loads classic routes", () => {
    expect(UZ_ROUTES.some((r) => r.id === "classic_silk")).toBe(true);
  });

  it("describes the classic silk route without locking one city", () => {
    const route = matchRoute("Ipak yo'li marshruti");
    expect(route?.stops).toContain("Samarqand");
    const intent = parseAiMatchIntent("", catalog, "Klassik marshrut");
    expect(intent.destination).toBe("");
    expect(intent.days).toBeGreaterThanOrEqual(7);
    expect(intent.message).toMatch(/Samarqand/);
  });
});

describe("section 5 dialogs", () => {
  it("keeps short friend examples", () => {
    expect(UZ_DIALOG_EXAMPLES.length).toBeGreaterThanOrEqual(5);
    expect(UZ_DIALOG_EXAMPLES.every((d) => d.reply.length < 220)).toBe(true);
  });
});

describe("section 6 quality", () => {
  it("still maps places to catalog hubs", () => {
    expect(namedCatalogCity("Urgut", catalog)).toBe("Samarqand");
    expect(namedCatalogCity("Chimgan", catalog)).toBe("Toshkent");
    expect(matchPlaceCity("Ayaz kala")).toBe("Xiva");
    expect(matchPlaceCity("Muynak")).toBe("Nukus");
  });

  it("does not invent a Farg'ona hotel city", () => {
    const intent = parseAiMatchIntent("", catalog, "Farg'ona vodiysi");
    expect(intent.destination).toBe("");
    expect(intent.message).toMatch(/Farg/i);
  });

  it("keeps the LLM brain compact (no tuman dump)", () => {
    const brain = geographyBrainForPrompt(catalog);
    expect(brain).toMatch(/Ipak yo'li/);
    expect(brain).toMatch(/Klassik/);
    expect(brain).not.toMatch(/Bulung'ur tumani/);
    expect(brain.length).toBeLessThan(12000);
  });
});
