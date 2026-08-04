import type {
  ClaimKind,
  ClaimLevel,
  Prisma,
  SiteCategory,
  SiteProminence,
  SiteStatus,
  SourceTier,
} from "@prisma/client";
import { deriveClaimLevel } from "../domain/deriveClaimLevel";
import { normalizePublisherKey } from "../domain/normalizePublisherKey";
import {
  adminSiteCreateSchema,
  adminSiteUpdateSchema,
  type AdminSiteCreateInput,
  type AdminSiteUpdateInput,
} from "../domain/adminSite";
import { DINING_CATEGORIES } from "../domain/tourismData";
import { parseOpenHours } from "../domain/parseOpenHours";
import { slugify } from "../domain/slugify";
import {
  evaluatePublishEligibility,
  formatPublishBlockedMessage,
  type PublishEligibility,
} from "../domain/publishPolicy";
import { knowledgeRepository } from "../repository/knowledge.repository";

export type CreateSiteInput = {
  slug: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  regionCode: string;
  districtCode?: string | null;
  category: SiteCategory;
  lat?: number | null;
  lng?: number | null;
  openingHours?: Prisma.InputJsonValue | null;
  dining?: Prisma.InputJsonValue | null;
  sourceUrl?: string | null;
  prominence?: SiteProminence | null;
  /** Seed / intake must stay DRAFT until sources exist. */
  status?: SiteStatus;
};

export type AttachSourceInput = {
  claimId: string;
  tier: SourceTier;
  publisher: string;
  title: string;
  url?: string | null;
  citation: string;
  retrievedAt?: Date;
  quote?: string | null;
  supportsPositionId?: string | null;
};

function asInputJson(
  value: Record<string, unknown>,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function openingHoursFromFreeText(
  openHours: string | null | undefined,
): Prisma.InputJsonValue | null {
  if (openHours == null) return null;
  const trimmed = openHours.trim();
  if (!trimmed) return null;
  const hours = parseOpenHours(trimmed);
  if (hours.parsed == null) return null;
  return asInputJson({
    ...hours.parsed,
    ...(hours.raw != null ? { raw: hours.raw } : {}),
  });
}

function normalizeDiningForWrite(
  dining: AdminSiteCreateInput["dining"] | AdminSiteUpdateInput["dining"],
): Prisma.InputJsonValue | null {
  if (dining == null) return null;
  return asInputJson({
    cuisine: dining.cuisine ?? [],
    mealTypes: dining.mealTypes ?? [],
    mustTry: dining.mustTry ?? [],
    ...(dining.priceBand != null ? { priceBand: dining.priceBand } : {}),
    ...(dining.note != null && dining.note !== "" ? { note: dining.note } : {}),
  });
}

export class KnowledgeService {
  async listSites(params: {
    regionCode?: string;
    districtCode?: string;
    status?: SiteStatus;
    category?: SiteCategory;
    q?: string;
    take?: number;
    skip?: number;
  }) {
    return knowledgeRepository.listSites(params);
  }

  async getSite(id: string) {
    return knowledgeRepository.findSiteById(id);
  }

  /** Hard-delete site (+ cascaded claims). AccuracyReports unlink (SetNull). */
  async deleteSite(id: string) {
    const existing = await knowledgeRepository.findSiteById(id);
    if (!existing) {
      throw new Error(`Site not found: ${id}`);
    }
    await knowledgeRepository.deleteSite(id);
    return { id: existing.id, slug: existing.slug, name: existing.name };
  }

  async createSite(input: CreateSiteInput) {
    return knowledgeRepository.createSite({
      ...input,
      status: input.status ?? "DRAFT",
    });
  }

  /**
   * Admin intake: Zod-validated create. Always DRAFT.
   * Parses free-text `open_hours` like the seed path.
   */
  async createSiteFromAdmin(raw: unknown) {
    const parsed = adminSiteCreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid site: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
    }
    const input = parsed.data;
    const slug =
      input.slug?.trim() ||
      (() => {
        const s = slugify(input.name);
        if (!s) throw new Error(`slugify produced empty slug for "${input.name}"`);
        return s;
      })();

    const existing = await knowledgeRepository.findSiteBySlug(slug);
    if (existing) {
      throw new Error(`Site slug already exists: ${slug}`);
    }

    const isDining = (DINING_CATEGORIES as readonly string[]).includes(
      input.category,
    );

    return knowledgeRepository.createSite({
      slug,
      name: input.name.trim(),
      nameRu: input.nameRu ?? null,
      nameEn: input.nameEn ?? null,
      regionCode: input.regionCode.trim().toLowerCase(),
      districtCode: input.districtCode ?? null,
      category: input.category,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      openingHours: openingHoursFromFreeText(input.open_hours),
      dining: isDining ? normalizeDiningForWrite(input.dining) : null,
      sourceUrl: input.sourceUrl ?? null,
      prominence: input.prominence ?? null,
      status: "DRAFT",
    });
  }

  /**
   * Admin edit. Does not change status (use publishSite / archive later).
   */
  async updateSiteFromAdmin(id: string, raw: unknown) {
    const existing = await knowledgeRepository.findSiteById(id);
    if (!existing) {
      throw new Error(`Site not found: ${id}`);
    }

    const parsed = adminSiteUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid update: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
    }
    const input = parsed.data;
    const nextCategory = input.category ?? existing.category;
    const isDining = (DINING_CATEGORIES as readonly string[]).includes(
      nextCategory,
    );

    let openingHours: Prisma.InputJsonValue | null | undefined = undefined;
    if (input.clearOpeningHours) {
      openingHours = null;
    } else if (input.open_hours !== undefined) {
      openingHours = openingHoursFromFreeText(input.open_hours);
    }

    let dining: Prisma.InputJsonValue | null | undefined = undefined;
    if (!isDining) {
      dining = null;
    } else if (input.clearDining) {
      dining = null;
    } else if (input.dining !== undefined) {
      dining = normalizeDiningForWrite(input.dining);
    }

    return knowledgeRepository.updateSite(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.nameRu !== undefined ? { nameRu: input.nameRu } : {}),
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
      ...(input.regionCode !== undefined
        ? { regionCode: input.regionCode.trim().toLowerCase() }
        : {}),
      ...(input.districtCode !== undefined
        ? { districtCode: input.districtCode }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.lat !== undefined ? { lat: input.lat } : {}),
      ...(input.lng !== undefined ? { lng: input.lng } : {}),
      ...(openingHours !== undefined ? { openingHours } : {}),
      ...(dining !== undefined ? { dining } : {}),
      ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl } : {}),
      ...(input.prominence !== undefined ? { prominence: input.prominence } : {}),
    });
  }

  /**
   * Assess whether a site may leave DRAFT/REVIEW for PUBLISHED.
   * Does not write. Seed never calls this.
   */
  async assessPublishEligibility(siteId: string): Promise<PublishEligibility> {
    const site = await knowledgeRepository.findSiteById(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }
    return evaluatePublishEligibility({
      status: site.status,
      category: site.category,
      sourceUrl: site.sourceUrl,
      lat: site.lat,
      lng: site.lng,
      openingHours: site.openingHours,
      dining: site.dining,
      prominence: site.prominence,
    });
  }

  /**
   * Human/ops publish gate. Seed never calls this.
   *
   * Dining (RESTORAN/CHAYXONA/KAFE): planner-grade diningJson + usable hours.
   * Non-dining incl. BOSHQA: same base gates; dining JSON must be null —
   * no auto-publish shortcut for the catch-all category.
   */
  async publishSite(siteId: string): Promise<{
    site: NonNullable<Awaited<ReturnType<typeof knowledgeRepository.findSiteById>>>;
    eligibility: PublishEligibility;
  }> {
    const site = await knowledgeRepository.findSiteById(siteId);
    if (!site) {
      throw new Error(`Site not found: ${siteId}`);
    }

    if (site.status === "PUBLISHED") {
      return {
        site,
        eligibility: { ok: false, reasons: ["already_published"] },
      };
    }

    const eligibility = evaluatePublishEligibility({
      status: site.status,
      category: site.category,
      sourceUrl: site.sourceUrl,
      lat: site.lat,
      lng: site.lng,
      openingHours: site.openingHours,
      dining: site.dining,
      prominence: site.prominence,
    });

    if (!eligibility.ok) {
      throw new Error(formatPublishBlockedMessage(site.slug, eligibility.reasons));
    }

    const updated = await knowledgeRepository.updateSiteStatus(
      siteId,
      "PUBLISHED",
    );
    return {
      site: { ...site, ...updated, status: "PUBLISHED" },
      eligibility,
    };
  }

  async createClaim(input: {
    siteId: string;
    text: string;
    kind: ClaimKind;
    recheckAfter?: Date | null;
  }) {
    return knowledgeRepository.createClaim({
      siteId: input.siteId,
      text: input.text,
      kind: input.kind,
      isFolklore: input.kind === "RIVOYAT",
      recheckAfter: input.recheckAfter,
    });
  }

  async attachSource(input: AttachSourceInput) {
    const source = await knowledgeRepository.upsertSource({
      tier: input.tier,
      publisher: input.publisher,
      title: input.title,
      url: input.url,
      citation: input.citation,
      retrievedAt: input.retrievedAt ?? new Date(),
    });
    await knowledgeRepository.attachSourceToClaim(input.claimId, source.id, {
      quote: input.quote,
      supportsPositionId: input.supportsPositionId,
    });
    return knowledgeRepository.refreshClaimLevel(input.claimId);
  }

  /** Preview derived level without writing (admin UI live badge). */
  previewLevel(input: {
    sources: { tier: SourceTier; publisher: string; positionId?: string | null }[];
    positions: { id: string }[];
    isFolklore: boolean;
  }): ClaimLevel {
    return deriveClaimLevel({
      isFolklore: input.isFolklore,
      positions: input.positions,
      sources: input.sources.map((s) => ({
        tier: s.tier,
        publisherKey: normalizePublisherKey(s.publisher),
        positionId: s.positionId,
      })),
    });
  }

  async lockClaimLevel(input: {
    claimId: string;
    level: ClaimLevel;
    adminUserId: string;
    note: string;
  }) {
    const note = input.note.trim();
    if (!note) {
      throw new Error("levelLockedNote is required to override derived level");
    }
    return knowledgeRepository.lockClaimLevel({
      claimId: input.claimId,
      level: input.level,
      adminUserId: input.adminUserId,
      note,
    });
  }

  async unlockClaimLevel(claimId: string) {
    await knowledgeRepository.clearClaimLevelLock(claimId);
    return knowledgeRepository.refreshClaimLevel(claimId);
  }

  async listDisputes() {
    return knowledgeRepository.listNizoliClaims();
  }

  async listRecheckQueue() {
    return knowledgeRepository.listDueRechecks();
  }

  async listOpenReports() {
    return knowledgeRepository.listOpenAccuracyReports();
  }
}

export const knowledgeService = new KnowledgeService();
