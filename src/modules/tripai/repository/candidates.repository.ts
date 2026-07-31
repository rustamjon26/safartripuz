import type { ClaimKind, Prisma, SiteCategory } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";
import type { OpeningHours } from "@/src/modules/knowledge";
import { enrichClaims } from "../domain/enrich";
import { sortByProminence } from "../domain/prominence";
import type { CandidateSite } from "../domain/types";

export type DbClient = Prisma.TransactionClient | typeof prisma;

function asOpeningHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== "object") return null;
  return value as OpeningHours;
}

export class CandidatesRepository {
  async findPublishedCandidates(input: {
    regionCode: string;
    categories?: SiteCategory[] | null;
    claimKinds?: ClaimKind[] | null;
  }, client: DbClient = prisma): Promise<CandidateSite[]> {
    const where: Prisma.SiteWhereInput = {
      status: "PUBLISHED",
      regionCode: input.regionCode,
    };
    if (input.categories?.length) {
      where.category = { in: input.categories };
    }

    const sites = await client.site.findMany({
      where,
      include: {
        claims: {
          include: {
            positions: {
              include: {
                sources: {
                  include: { source: true },
                },
              },
            },
            sources: {
              include: { source: true },
            },
          },
        },
      },
      // Name order alone made plans alphabetical (Registon never reached).
      // Prominence sort is applied in memory so nulls rank as OPTIONAL.
    });

    const mapped = sites.map((site) => {
      let claims = site.claims;
      if (input.claimKinds?.length) {
        const kindSet = new Set(input.claimKinds);
        claims = claims.filter((c) => kindSet.has(c.kind));
      }

      const surfaced = enrichClaims(
        claims.map((c) => ({
          id: c.id,
          text: c.text,
          kind: c.kind,
          level: c.level,
          positions: c.positions.map((p) => ({
            id: p.id,
            label: p.label,
            text: p.text,
            sourceTitles: p.sources.map((cs) => cs.source.title),
          })),
        })),
      );

      return {
        id: site.id,
        slug: site.slug,
        name: site.name,
        nameRu: site.nameRu,
        nameEn: site.nameEn,
        regionCode: site.regionCode,
        category: site.category,
        prominence: site.prominence,
        lat: site.lat,
        lng: site.lng,
        openingHours: asOpeningHours(site.openingHours),
        visitMinutes: 90,
        claims: surfaced,
      };
    });

    return sortByProminence(mapped);
  }
}

export const candidatesRepository = new CandidatesRepository();
