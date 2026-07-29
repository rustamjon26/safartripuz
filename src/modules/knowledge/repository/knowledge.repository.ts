import type {
  ClaimKind,
  ClaimLevel,
  Prisma,
  SiteCategory,
  SiteStatus,
  SourceTier,
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

  async listSites(
    params: {
      regionCode?: string;
      districtCode?: string;
      status?: SiteStatus;
      take?: number;
      skip?: number;
    },
    client: DbClient = prisma,
  ) {
    const where: Prisma.SiteWhereInput = {};
    if (params.regionCode) where.regionCode = params.regionCode;
    if (params.districtCode) where.districtCode = params.districtCode;
    if (params.status) where.status = params.status;
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
        status: data.status ?? "DRAFT",
      },
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
