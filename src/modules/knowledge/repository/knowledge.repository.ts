import {
  Prisma,
  type ClaimKind,
  type ClaimLevel,
  type SiteCategory,
  type SiteProminence,
  type SiteStatus,
  type SourceTier,
} from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";
import { deriveClaimLevel } from "../domain/deriveClaimLevel";
import { normalizePublisherKey } from "../domain/normalizePublisherKey";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export class KnowledgeRepository {
  async findSiteById(id: string, client: DbClient = prisma) {
    return client.site.findUnique({
      where: { id },
      include: {
        claims: {
          include: {
            sources: { include: { source: true } },
            positions: true,
          },
        },
      },
    });
  }

  async findPublishedSitesByRegion(regionCode: string, client: DbClient = prisma) {
    return client.site.findMany({
      where: { regionCode, status: "PUBLISHED" },
      include: {
        claims: {
          include: {
            sources: { include: { source: true } },
            positions: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findSiteBySlug(slug: string, client: DbClient = prisma) {
    return client.site.findUnique({ where: { slug } });
  }

  async listSites(
    params: {
      regionCode?: string;
      districtCode?: string;
      status?: SiteStatus;
      category?: SiteCategory;
      q?: string;
      take?: number;
      skip?: number;
    },
    client: DbClient = prisma,
  ) {
    const where: Prisma.SiteWhereInput = {};
    if (params.regionCode) where.regionCode = params.regionCode;
    if (params.districtCode) where.districtCode = params.districtCode;
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;
    const q = params.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { nameEn: { contains: q } },
        { slug: { contains: q } },
      ];
    }
    const take = params.take ?? 50;
    const skip = params.skip ?? 0;
    const [items, total] = await Promise.all([
      client.site.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      client.site.count({ where }),
    ]);
    return { items, total };
  }

  async createSite(
    data: {
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
      status?: SiteStatus;
    },
    client: DbClient = prisma,
  ) {
    return client.site.create({
      data: {
        slug: data.slug,
        name: data.name,
        nameRu: data.nameRu ?? null,
        nameEn: data.nameEn ?? null,
        regionCode: data.regionCode,
        districtCode: data.districtCode ?? null,
        category: data.category,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        openingHours: data.openingHours ?? undefined,
        dining: data.dining ?? undefined,
        sourceUrl: data.sourceUrl ?? null,
        prominence: data.prominence ?? null,
        status: data.status ?? "DRAFT",
      },
    });
  }

  async updateSiteStatus(
    id: string,
    status: SiteStatus,
    client: DbClient = prisma,
  ) {
    return client.site.update({
      where: { id },
      data: { status },
    });
  }

  async deleteSite(id: string, client: DbClient = prisma) {
    return client.site.delete({ where: { id } });
  }

  async updateSite(
    id: string,
    data: {
      name?: string;
      nameRu?: string | null;
      nameEn?: string | null;
      regionCode?: string;
      districtCode?: string | null;
      category?: SiteCategory;
      lat?: number | null;
      lng?: number | null;
      openingHours?: Prisma.InputJsonValue | typeof Prisma.DbNull | null;
      dining?: Prisma.InputJsonValue | typeof Prisma.DbNull | null;
      sourceUrl?: string | null;
      prominence?: SiteProminence | null;
    },
    client: DbClient = prisma,
  ) {
    const patch: Prisma.SiteUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.nameRu !== undefined) patch.nameRu = data.nameRu;
    if (data.nameEn !== undefined) patch.nameEn = data.nameEn;
    if (data.regionCode !== undefined) patch.regionCode = data.regionCode;
    if (data.districtCode !== undefined) patch.districtCode = data.districtCode;
    if (data.category !== undefined) patch.category = data.category;
    if (data.lat !== undefined) patch.lat = data.lat;
    if (data.lng !== undefined) patch.lng = data.lng;
    if (data.sourceUrl !== undefined) patch.sourceUrl = data.sourceUrl;
    if (data.prominence !== undefined) patch.prominence = data.prominence;
    if (data.openingHours !== undefined) {
      patch.openingHours =
        data.openingHours === null ? Prisma.DbNull : data.openingHours;
    }
    if (data.dining !== undefined) {
      patch.dining = data.dining === null ? Prisma.DbNull : data.dining;
    }
    return client.site.update({
      where: { id },
      data: patch,
    });
  }

  async upsertSource(
    data: {
      tier: SourceTier;
      publisher: string;
      title: string;
      url?: string | null;
      citation: string;
      retrievedAt: Date;
    },
    client: DbClient = prisma,
  ) {
    const publisherKey = normalizePublisherKey(data.publisher);
    if (data.url) {
      const existing = await client.source.findFirst({
        where: { url: data.url, publisherKey },
      });
      if (existing) return existing;
    }
    return client.source.create({
      data: {
        tier: data.tier,
        publisher: data.publisher,
        publisherKey,
        title: data.title,
        url: data.url ?? null,
        citation: data.citation,
        retrievedAt: data.retrievedAt,
      },
    });
  }

  async attachSourceToClaim(
    claimId: string,
    sourceId: string,
    opts: { quote?: string | null; supportsPositionId?: string | null } = {},
    client: DbClient = prisma,
  ) {
    return client.claimSource.create({
      data: {
        claimId,
        sourceId,
        quote: opts.quote ?? null,
        supportsPositionId: opts.supportsPositionId ?? null,
      },
    });
  }

  async findClaimForLevel(claimId: string, client: DbClient = prisma) {
    return client.claim.findUnique({
      where: { id: claimId },
      include: {
        sources: { include: { source: true } },
        positions: true,
      },
    });
  }

  async updateClaimLevel(claimId: string, level: ClaimLevel, client: DbClient = prisma) {
    return client.claim.update({
      where: { id: claimId },
      data: { level },
    });
  }

  async createClaim(
    data: {
      siteId: string;
      text: string;
      kind: ClaimKind;
      isFolklore?: boolean;
      recheckAfter?: Date | null;
    },
    client: DbClient = prisma,
  ) {
    return client.claim.create({
      data: {
        siteId: data.siteId,
        text: data.text,
        kind: data.kind,
        level: data.isFolklore ? "OGZAKI_RIVOYAT" : "TASDIQLANMAGAN",
        recheckAfter: data.recheckAfter ?? null,
      },
    });
  }

  async lockClaimLevel(
    data: {
      claimId: string;
      level: ClaimLevel;
      adminUserId: string;
      note: string;
    },
    client: DbClient = prisma,
  ) {
    return client.claim.update({
      where: { id: data.claimId },
      data: {
        level: data.level,
        levelLockedBy: data.adminUserId,
        levelLockedNote: data.note,
        version: { increment: 1 },
      },
    });
  }

  async clearClaimLevelLock(claimId: string, client: DbClient = prisma) {
    return client.claim.update({
      where: { id: claimId },
      data: {
        levelLockedBy: null,
        levelLockedNote: null,
      },
    });
  }

  async listNizoliClaims(client: DbClient = prisma) {
    return client.claim.findMany({
      where: { level: "NIZOLI" },
      include: {
        site: true,
        positions: true,
        sources: { include: { source: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async listDueRechecks(now: Date = new Date(), client: DbClient = prisma) {
    return client.claim.findMany({
      where: { recheckAfter: { lte: now } },
      include: { site: true },
      orderBy: { recheckAfter: "asc" },
    });
  }

  async listOpenAccuracyReports(client: DbClient = prisma) {
    return client.accuracyReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Recompute level from sources unless locked by an admin. */
  async refreshClaimLevel(claimId: string, client: DbClient = prisma) {
    const claim = await this.findClaimForLevel(claimId, client);
    if (!claim) return null;
    if (claim.levelLockedBy) return claim;

    const level = deriveClaimLevel({
      isFolklore: claim.kind === "RIVOYAT",
      positions: claim.positions.map((p) => ({ id: p.id })),
      sources: claim.sources.map((cs) => ({
        tier: cs.source.tier,
        publisherKey: cs.source.publisherKey,
        positionId: cs.supportsPositionId,
      })),
    });

    if (level === claim.level) return claim;
    return this.updateClaimLevel(claimId, level, client);
  }
}

export const knowledgeRepository = new KnowledgeRepository();
