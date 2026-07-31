import {
  Prisma,
  type Prisma as PrismaNs,
  type Site,
  type SiteCategory,
  type SiteProminence,
  type SiteStatus,
} from "@prisma/client";
import { parseOpenHours } from "../domain/parseOpenHours";
import { slugify } from "../domain/slugify";
import type { OpeningHours } from "../domain/types";
import type { TourismSiteInput } from "../domain/tourismData";
import { DINING_CATEGORIES } from "../domain/tourismData";

/** Built JSON payloads are JSON-serializable; Prisma's InputJsonValue is invariant. */
function asInputJson(value: OpeningHours | Record<string, unknown>): PrismaNs.InputJsonValue {
  return value as PrismaNs.InputJsonValue;
}

export type SeedKnowledgeReport = {
  created: number;
  updated: number;
  unchanged: number;
};

export type SeedSiteClient = {
  site: {
    findUnique: (args: {
      where: { slug: string };
    }) => Promise<Site | null>;
    upsert: (args: {
      where: { slug: string };
      create: PrismaNs.SiteCreateInput;
      update: PrismaNs.SiteUpdateInput;
    }) => Promise<Site>;
  };
};

/** Deep equality for JSON values — key order must not matter (MySQL reorders object keys). */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => sameJson(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) || Array.isArray(b)) return false;
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const k of keys) {
      if (!sameJson(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

/** Normalize dining for write/compare: Places null facets → [] (MySQL/Prisma round-trip). */
function normalizeDiningValue(
  dining: {
    cuisine: string[] | null;
    mealTypes: string[] | null;
    mustTry: string[] | null;
    priceBand?: string | null;
    note?: string | null;
  } | null,
): PrismaNs.InputJsonValue | null {
  if (dining == null) return null;
  return asInputJson({
    cuisine: dining.cuisine ?? [],
    mealTypes: dining.mealTypes ?? [],
    mustTry: dining.mustTry ?? [],
    ...(dining.priceBand != null ? { priceBand: dining.priceBand } : {}),
    ...(dining.note != null && dining.note !== "" ? { note: dining.note } : {}),
  });
}

type SitePayload = {
  name: string;
  nameRu: string | null;
  nameEn: string | null;
  regionCode: string;
  districtCode: string | null;
  category: SiteCategory;
  lat: number | null;
  lng: number | null;
  openingHours: PrismaNs.InputJsonValue | typeof Prisma.DbNull | null;
  dining: PrismaNs.InputJsonValue | typeof Prisma.DbNull | null;
  sourceUrl: string | null;
  prominence: SiteProminence | null;
  status: SiteStatus;
};

function isUnchanged(existing: Site, next: SitePayload): boolean {
  const nextHours = next.openingHours === Prisma.DbNull ? null : next.openingHours;
  const nextDining = next.dining === Prisma.DbNull ? null : next.dining;
  return (
    existing.name === next.name &&
    (existing.nameRu ?? null) === next.nameRu &&
    (existing.nameEn ?? null) === next.nameEn &&
    existing.regionCode === next.regionCode &&
    (existing.districtCode ?? null) === next.districtCode &&
    existing.category === next.category &&
    (existing.lat ?? null) === next.lat &&
    (existing.lng ?? null) === next.lng &&
    sameJson(existing.openingHours, nextHours) &&
    sameJson(existing.dining, nextDining) &&
    (existing.sourceUrl ?? null) === next.sourceUrl &&
    (existing.prominence ?? null) === next.prominence
    // status intentionally ignored: seed never publishes and must not demote PUBLISHED
  );
}

export function resolveSiteSlug(site: TourismSiteInput): string {
  if (site.slug) return site.slug;
  const slug = slugify(site.name);
  if (!slug) {
    throw new Error(`slugify produced empty slug for name "${site.name}"`);
  }
  return slug;
}

/** Seed may only write DRAFT; empty sourceUrl forbids PUBLISHED. */
export function assertSeedWriteAllowed(
  slug: string,
  status: SiteStatus,
  sourceUrl: string | null,
): void {
  if (status === "PUBLISHED") {
    throw new Error(`Site "${slug}": seed must not write PUBLISHED`);
  }
  if (!sourceUrl && status !== "DRAFT") {
    throw new Error(
      `Site "${slug}" has empty sourceUrl — status must be DRAFT (PUBLISHED blocked)`,
    );
  }
}

/**
 * Upsert Sites from validated tourism rows.
 * Create as DRAFT only. On update, never touch `status` (re-seed must not
 * demote PUBLISHED). Never writes PUBLISHED from seed.
 */
export async function seedKnowledgeSites(
  sites: TourismSiteInput[],
  client: SeedSiteClient,
): Promise<SeedKnowledgeReport> {
  const report: SeedKnowledgeReport = { created: 0, updated: 0, unchanged: 0 };

  for (const site of sites) {
    const slug = resolveSiteSlug(site);
    const sourceUrl = site.sourceUrl?.trim() ? site.sourceUrl.trim() : null;
    // Seed never publishes. Empty sourceUrl also forbids any non-DRAFT status.
    const status: SiteStatus = "DRAFT";
    assertSeedWriteAllowed(slug, status, sourceUrl);

    const isDining = (DINING_CATEGORIES as readonly string[]).includes(site.category);
    if (isDining && site.dining == null) {
      throw new Error(`Site "${slug}" (${site.category}) requires dining`);
    }

    // weekly at top level for isOpenAt; raw kept for DRAFT→PUBLISHED review.
    const hours = parseOpenHours(site.open_hours ?? null);
    const openingHoursValue: PrismaNs.InputJsonValue | null =
      hours.parsed == null
        ? null
        : asInputJson({
            ...hours.parsed,
            ...(hours.raw != null ? { raw: hours.raw } : {}),
          });

    const diningValue =
      isDining && site.dining != null ? normalizeDiningValue(site.dining) : null;

    const prominence: SiteProminence | null = site.prominence ?? null;

    const payload: SitePayload = {
      name: site.name,
      nameRu: site.nameRu ?? null,
      nameEn: site.nameEn ?? null,
      regionCode: site.regionCode,
      districtCode: site.districtCode ?? null,
      category: site.category as SiteCategory,
      lat: site.lat ?? null,
      lng: site.lng ?? null,
      openingHours: openingHoursValue,
      dining: diningValue,
      sourceUrl,
      prominence,
      status,
    };

    const existing = await client.site.findUnique({ where: { slug } });
    if (existing && isUnchanged(existing, payload)) {
      report.unchanged += 1;
      continue;
    }

    await client.site.upsert({
      where: { slug },
      create: {
        slug,
        name: payload.name,
        nameRu: payload.nameRu,
        nameEn: payload.nameEn,
        regionCode: payload.regionCode,
        districtCode: payload.districtCode,
        category: payload.category,
        lat: payload.lat,
        lng: payload.lng,
        openingHours: openingHoursValue ?? undefined,
        dining: diningValue ?? undefined,
        sourceUrl: payload.sourceUrl,
        prominence: payload.prominence,
        status: payload.status,
      },
      update: {
        name: payload.name,
        nameRu: payload.nameRu,
        nameEn: payload.nameEn,
        regionCode: payload.regionCode,
        districtCode: payload.districtCode,
        category: payload.category,
        lat: payload.lat,
        lng: payload.lng,
        openingHours: openingHoursValue ?? Prisma.DbNull,
        dining: diningValue ?? Prisma.DbNull,
        sourceUrl: payload.sourceUrl,
        prominence: payload.prominence,
        // Do not set status on update — preserves PUBLISHED / REVIEW.
      },
    });

    if (existing) {
      report.updated += 1;
    } else {
      report.created += 1;
    }
  }

  return report;
}
