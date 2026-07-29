/**
 * Region / city normalization for Site.regionCode matching.
 * Budget aliases intentionally omitted — pricing is out of this phase.
 */

export type NormalizedRegion = {
  /** Canonical Site.regionCode, e.g. "samarqand". */
  regionCode: string;
  display: string;
};

const REGIONS: Array<{
  regionCode: string;
  display: string;
  aliases: string[];
}> = [
  {
    regionCode: "samarqand",
    display: "Samarqand",
    aliases: ["samarqand", "samarkand", "самарканд"],
  },
  {
    regionCode: "toshkent",
    display: "Toshkent",
    aliases: ["toshkent", "tashkent", "ташкент"],
  },
  {
    regionCode: "buxoro",
    display: "Buxoro",
    aliases: ["buxoro", "bukhara", "бухара"],
  },
  {
    regionCode: "xiva",
    display: "Xiva",
    aliases: ["xiva", "khiva", "хива"],
  },
  {
    regionCode: "zomin",
    display: "Zomin",
    aliases: ["zomin", "zaamin", "зомин"],
  },
];

export function normalizeRegion(input = ""): NormalizedRegion {
  const raw = String(input).trim();
  const lower = raw.toLowerCase();

  for (const region of REGIONS) {
    if (
      region.aliases.some((alias) => lower === alias || lower.includes(alias))
    ) {
      return { regionCode: region.regionCode, display: region.display };
    }
  }

  const display = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const regionCode =
    lower.replace(/[^a-z0-9а-яё]+/gi, "_").replace(/^_|_$/g, "") || "unknown";

  return {
    display: display || raw || "Unknown",
    regionCode,
  };
}
