import { Prisma, type Prisma as PrismaNs, type Site, type SiteCategory, type SiteStatus } from "@prisma/client";
import { parseOpenHours } from "../domain/parseOpenHours";
import { slugify } from "../domain/slugify";
import type { TourismSiteInput } from "../domain/tourismData";
import { DINING_CATEGORIES } from "../domain/tourismData";

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

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
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
    existing.status === next.status
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
 * Upsert Sites from validated tourism rows. Always writes DRAFT.
 * Never writes PUBLISHED from seed. Empty sourceUrl forces DRAFT.
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

    const hours = parseOpenHours(site.open_hours ?? null);
    const openingHoursValue =
      hours.raw == null && hours.parsed == null
        ? null
        : ({
            raw: hours.raw,
            parsed: hours.parsed,
          } satisfies Record<string, unknown>);

    const diningValue = isDining && site.dining != null ? site.dining : null;

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
        status: payload.status,
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
