import type {
  ClaimKind,
  ClaimLevel,
  Prisma,
  SiteCategory,
  SiteStatus,
  SourceTier,
} from "@prisma/client";
import { deriveClaimLevel } from "../domain/deriveClaimLevel";
import { normalizePublisherKey } from "../domain/normalizePublisherKey";
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

export class KnowledgeService {
  async listSites(params: {
    regionCode?: string;
    districtCode?: string;
    status?: SiteStatus;
    take?: number;
    skip?: number;
  }) {
    return knowledgeRepository.listSites(params);
  }

  async getSite(id: string) {
    return knowledgeRepository.findSiteById(id);
  }

  async createSite(input: CreateSiteInput) {
    return knowledgeRepository.createSite({
      ...input,
      status: input.status ?? "DRAFT",
    });
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
