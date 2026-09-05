/**
 * Guest-AI geography: viloyat / tuman / landmark aliases → catalog hotel city.
 * Domain-only (no Prisma). Used so the model does not have to "remember" Uzbekistan.
 */

import { UZ_DIALOG_EXAMPLES } from "./uzbekistanDialogs";
import { UZ_LOCAL_PLACES, type UzLocalPlace } from "./uzbekistanLocalPlaces";
import { UZ_ROUTES, type UzRoute } from "./uzbekistanRoutes";
import { UZ_THEMES, type UzTheme } from "./uzbekistanThemes";
import { UZ_UNITS, type UzUnit } from "./uzbekistanUnits";

export type PlaceMap = {
  aliases: string[];
  catalogCity: string;
};

/** Fold Latin apostrophes so Farg'ona / Fargona match. */
export function foldUz(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ''`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tuman / shahar / mashhur joy → katalogdagi mehmonxona shahri.
 * `catalogCity` trip-builder destinations va Hotel.city bilan mos.
 */
export const UZ_PLACES: PlaceMap[] = [
  {
    catalogCity: "Samarqand",
    aliases: [
      "samarqand",
      "samarkand",
      "самарканд",
      "registon",
      "registan",
      "guri amir",
      "gur-e-amir",
      "shohi zinda",
      "shah-i-zinda",
      "bibi xonim",
      "bibi-khanym",
      "urgut",
      "jomboy",
      "payariq",
      "pastdargom",
      "nurobod",
      "kattakorgon",
      "kattakurgan",
      "bulungur",
      "ishtixon",
      "qoshrabot",
      "tayloq",
      "oqdaryo",
    ],
  },
  {
    catalogCity: "Buxoro",
    aliases: [
      "buxoro",
      "bukhara",
      "бухара",
      "lyabi hauz",
      "labi hovuz",
      "kalon minor",
      "kalyan",
      "buxoro ark",
      "chor minor",
      "gijduvon",
      "gijduvan",
      "kogon",
      "kagan",
      "romitan",
      "jondor",
      "vornak",
      "peshku",
      "shofirkon",
      "qorovulbozor",
      "olot",
    ],
  },
  {
    catalogCity: "Xiva",
    aliases: [
      "xiva",
      "khiva",
      "хива",
      "ichan qala",
      "ichan-qala",
      "xorazm",
      "khorezm",
      "urganch",
      "urgench",
      "xazorasp",
      "hazorasp",
      "xiva tumani",
      "bogot",
      "yangiariq",
      "shovot",
      "gurlan",
      "qoshkopir",
    ],
  },
  {
    catalogCity: "Toshkent",
    aliases: [
      "toshkent",
      "tashkent",
      "ташкент",
      "poytaxt",
      "chirchiq",
      "chirchik",
      "angren",
      "olmaliq",
      "almalyk",
      "bekobod",
      "parkent",
      "bostonliq",
      "bostanliq",
      "chimyon",
      "chimgan",
      "beldersoy",
      "charvak",
      "chorvoq",
      "yangiyol",
      "nurafshon",
      "ohangaron",
      "piskent",
      "quyichirchiq",
      "zangiota",
      "qibray",
      "amirsoy",
      "chorsu",
      "gazalkent",
    ],
  },
  {
    catalogCity: "Zomin",
    aliases: [
      "zomin",
      "zaamin",
      "forish",
      "baxmal",
      "gallaorol",
      "gallaaral",
      "zomin milliy",
    ],
  },
  {
    catalogCity: "Jizzax",
    aliases: [
      "jizzax",
      "jizzakh",
      "джизак",
      "zarbdor",
      "sharof rashidov",
      "paxtakor",
      "dustlik",
      "mirzachol",
      "yangiobod",
    ],
  },
  {
    catalogCity: "Qarshi",
    aliases: [
      "qarshi",
      "karshi",
      "qashqadaryo",
      "kashkadarya",
      "shahrisabz",
      "shakhrisabz",
      "kitob",
      "yakkabog",
      "qamashi",
      "guzor",
      "dehqonobod",
      "koson",
      "muborak",
      "nishon",
      "chiroqchi",
      "oqsaroy",
      "nasaf",
      "langar ota",
      "taxtaqoracha",
      "kokdala",
    ],
  },
  {
    catalogCity: "Termiz",
    aliases: [
      "termiz",
      "termez",
      "surxondaryo",
      "surkhandarya",
      "denov",
      "sherobod",
      "boysun",
      "jarqorgon",
      "qiziriq",
      "sariosiyo",
      "angor",
      "muzrabot",
      "fayoztepa",
      "kampirtepa",
      "sangardak",
      "omonxona",
    ],
  },
  {
    catalogCity: "Navoiy",
    aliases: ["navoiy", "navoi", "nurota", "konimex", "uchquduq", "zarafshon", "qiziltepa", "xatirchi", "karmana", "sentob", "sarmishsoy", "qizilqum", "gozgon"],
  },
  {
    catalogCity: "Farg'ona",
    aliases: [
      "fargona",
      "fergana",
      "фергана",
      "margilon",
      "margilan",
      "quva",
      "qoqon",
      "kokand",
      "rishton",
      "oltiariq",
      "buvayda",
      "dangara",
      "furqat",
      "beshariq",
      "uchkoprik",
      "yozyovon",
      "toshloq",
      "shohimardon",
      "shahimardan",
      "quvasoy",
      "sokh",
    ],
  },
  {
    catalogCity: "Andijon",
    aliases: [
      "andijon",
      "andijan",
      "андижан",
      "asaka",
      "xonobod",
      "shahrixon",
      "shakhrihan",
      "oltinkol",
      "baliqchi",
      "jalaquduq",
      "izboskan",
      "marhamat",
      "paxtaobod",
      "ulugnor",
      "qorasuv",
      "buloqboshi",
      "qorgontepa",
      "xojaobod",
      "bobur bogi",
    ],
  },
  {
    catalogCity: "Namangan",
    aliases: [
      "namangan",
      "наманган",
      "chortoq",
      "chust",
      "kosonsoy",
      "toraqorgon",
      "uychi",
      "yangiqorgon",
      "norin",
      "mingbuloq",
      "axsikent",
      "akhsikent",
      "haqqulobod",
      "chartak",
      "popga",
    ],
  },
  {
    catalogCity: "Guliston",
    aliases: ["guliston", "sirdaryo", "syrdarya", "sirdarya", "yangiyer", "shirin", "boyovut", "xovos", "mirzaobod", "oqoltin", "sardoba", "sayxunobod", "khavast"],
  },
  {
    catalogCity: "Nukus",
    aliases: [
      "nukus",
      "нукус",
      "qoraqalpogiston",
      "karakalpakstan",
      "moynoq",
      "muynak",
      "xorazm dengiz",
      "aral",
      "orol",
      "to'rtkol",
      "tortkol",
      "beruniy",
      "chimboy",
      "qonlikol",
      "kegeyli",
      "shumanay",
      "taxtakopir",
      "savitskiy",
      "mizdaxon",
      "chilpik",
      "ellikqala",
      "ustyurt",
    ],
  },
];

const THEME_CITIES = ["Samarqand", "Buxoro", "Xiva"] as const;

function tokens(folded: string): string[] {
  return folded.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
}

function aliasHits(haystackFolded: string, alias: string): boolean {
  const a = foldUz(alias);
  if (a.length < 4) return false;
  if (haystackFolded === a) return true;
  if (a.includes(" ")) return haystackFolded.includes(a);
  // "Urgutga" / "Xivada" — token prefix, not raw substring (avoids "ark" in "parkent")
  if (a.length < 6) {
    return tokens(haystackFolded).some((t) => t === a || t.startsWith(a));
  }
  return haystackFolded.includes(a);
}

/** Longest alias first so "toshkent viloyati" beats "kent". */
function sortedPlaces(): PlaceMap[] {
  return [...UZ_PLACES].sort((a, b) => {
    const la = Math.max(...a.aliases.map((x) => foldUz(x).length));
    const lb = Math.max(...b.aliases.map((x) => foldUz(x).length));
    return lb - la;
  });
}

export function matchLocalPlace(text: string): UzLocalPlace | null {
  const hay = foldUz(text);
  if (!hay) return null;
  const ranked: Array<{ place: UzLocalPlace; alias: string }> = [];
  for (const place of UZ_LOCAL_PLACES) {
    for (const alias of place.aliases) {
      ranked.push({ place, alias });
    }
  }
  ranked.sort((a, b) => foldUz(b.alias).length - foldUz(a.alias).length);
  for (const row of ranked) {
    if (aliasHits(hay, row.alias)) return row.place;
  }
  return null;
}

export function matchPlaceCity(text: string): string {
  const local = matchLocalPlace(text);
  if (local?.hotel_hub) return local.hotel_hub;

  const hay = foldUz(text);
  if (!hay) return "";
  for (const place of sortedPlaces()) {
    for (const alias of [...place.aliases].sort((a, b) => foldUz(b).length - foldUz(a).length)) {
      if (aliasHits(hay, alias)) return place.catalogCity;
    }
  }
  return "";
}

function cityInCatalog(city: string, catalogCities: string[]): string {
  const catalogFold = new Map(catalogCities.map((c) => [foldUz(c), c]));
  const exact = catalogFold.get(foldUz(city));
  if (exact) return exact;
  return (
    catalogCities.find(
      (c) => foldUz(c).includes(foldUz(city)) || foldUz(city).includes(foldUz(c)),
    ) ?? ""
  );
}

/** Longest unit alias first so «toshkent viloyati» beats «toshkent». */
function matchAliasTable<T extends { aliases: string[] }>(
  text: string,
  rows: T[],
): T | null {
  const hay = foldUz(text);
  if (!hay) return null;
  const ranked: Array<{ row: T; alias: string }> = [];
  for (const row of rows) {
    for (const alias of row.aliases) {
      ranked.push({ row, alias });
    }
  }
  ranked.sort((a, b) => foldUz(b.alias).length - foldUz(a.alias).length);
  for (const item of ranked) {
    if (aliasHits(hay, item.alias)) return item.row;
  }
  return null;
}

export function matchTheme(text: string): UzTheme | null {
  return matchAliasTable(text, UZ_THEMES);
}

export function matchRoute(text: string): UzRoute | null {
  return matchAliasTable(text, UZ_ROUTES);
}

export function matchUzUnit(text: string): UzUnit | null {
  const hay = foldUz(text);
  if (!hay) return null;
  const ranked: Array<{ unit: UzUnit; alias: string }> = [];
  for (const unit of UZ_UNITS) {
    for (const alias of unit.aliases) {
      ranked.push({ unit, alias });
    }
  }
  ranked.sort((a, b) => foldUz(b.alias).length - foldUz(a.alias).length);
  for (const row of ranked) {
    if (aliasHits(hay, row.alias)) return row.unit;
  }
  return null;
}

export function namedCatalogCity(text: string, catalogCities: string[]): string {
  const fromPlace = matchPlaceCity(text);
  if (fromPlace) {
    const inCatalog = cityInCatalog(fromPlace, catalogCities);
    if (inCatalog) return inCatalog;
  }
  const unit = matchUzUnit(text);
  if (unit?.hotel_hub) {
    const fromHub = cityInCatalog(unit.hotel_hub, catalogCities);
    if (fromHub) return fromHub;
  }
  return "";
}

export function isBroadHistoryTheme(text: string): boolean {
  const theme = matchTheme(text);
  return theme?.id === "ipak_yoli";
}

/** Theme/route without a specific viloyat/tuman/shahar — do not auto-pick one city. */
export function isAmbiguousDestinationPrompt(text: string, catalogCities: string[]): boolean {
  if (namedCatalogCity(text, catalogCities) !== "") return false;
  const theme = matchTheme(text);
  if (theme?.ask_first) return true;
  return matchRoute(text) !== null;
}

export function themeClarifyHint(): string {
  return THEME_CITIES.join(" / ");
}

/** Compact table for the LLM system prompt (not a dump of every tuman). */
export function geographyBrainForPrompt(catalogCities: string[]): string {
  const have = new Set(catalogCities.map((c) => foldUz(c)));
  const placeLines = UZ_PLACES.filter((p) => have.has(foldUz(p.catalogCity))).map((p) => {
    const extra = p.aliases.slice(0, 8).join(", ");
    return `- ${p.catalogCity}: ${extra}`;
  });
  const unitLines = UZ_UNITS.map((u) => {
    const hub = u.hotel_hub && have.has(foldUz(u.hotel_hub))
      ? `hub ${u.hotel_hub}`
      : `katalogda yo'q, yaqin ${u.nearest_hub}`;
    return `- ${u.name_uz} (${hub}, ${u.typical_days} kun): ${u.guest_blurb_uz}`;
  });
  const themeLines = UZ_THEMES.map(
    (t) => `- ${t.name_uz}: ${t.guest_blurb_uz}`,
  );
  const routeLines = UZ_ROUTES.map(
    (r) => `- ${r.name_uz} (${r.days} kun, ${r.stops.join(" → ")}): ${r.guest_blurb_uz}`,
  );
  const dialogLines = UZ_DIALOG_EXAMPLES.map(
    (d) => `Mijoz: ${d.guest}\nSen: ${d.reply}`,
  );
  return [
    "O'ZBEKISTON GEOGRAFIYASI (sen buni bilasan):",
    "Viloyat / respublika:",
    ...unitLines,
    "Mavzular (bir nechta shahar bo'lsa destination BO'SH, so'ra):",
    ...themeLines,
    "Marshrutlar:",
    ...routeLines,
    "Suhbat namunasi:",
    ...dialogLines,
    "Katalogdagi mehmonxona shaharlari va tuman/aliaslar:",
    ...placeLines,
    "Tuman/obidani tansang ham mehmonxona o'ylab topma. Katalogda yo'q bo'lsa destination bo'sh.",
  ]
    .filter(Boolean)
    .join("\n");
}
