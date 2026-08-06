import { prisma, type Prisma } from "@/src/shared/db/prisma";
import { bpsToPercent, type HotelPromoView } from "../domain/promo";

type PromoRow = Prisma.HotelPromoGetPayload<Record<string, never>>;

function mapPromo(row: PromoRow): HotelPromoView {
  return {
    id: row.id,
    hotelId: row.hotelId,
    title: row.title,
    code: row.code,
    discountBps: row.discountBps,
    discountPercent: bpsToPercent(row.discountBps),
    type: row.type,
    isActive: row.isActive,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class MarketingRepository {
  async listPromos(hotelId: string): Promise<HotelPromoView[]> {
    const rows = await prisma.hotelPromo.findMany({
      where: { hotelId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapPromo);
  }

  async createPromo(input: {
    hotelId: string;
    title: string;
    code: string | null;
    discountBps: number;
    type: HotelPromoView["type"];
    startsAt: Date | null;
    endsAt: Date | null;
  }): Promise<HotelPromoView> {
    const row = await prisma.hotelPromo.create({ data: input });
    return mapPromo(row);
  }

  async findPromoById(id: string): Promise<HotelPromoView | null> {
    const row = await prisma.hotelPromo.findUnique({ where: { id } });
    return row ? mapPromo(row) : null;
  }

  /** Scoped by hotelId so one partner cannot patch another's campaign. */
  async updatePromo(
    id: string,
    hotelId: string,
    data: { isActive?: boolean; title?: string },
  ): Promise<HotelPromoView | null> {
    const changed = await prisma.hotelPromo.updateMany({
      where: { id, hotelId },
      data,
    });
    if (changed.count === 0) return null;
    return this.findPromoById(id);
  }

  async deletePromo(id: string, hotelId: string): Promise<boolean> {
    const deleted = await prisma.hotelPromo.deleteMany({ where: { id, hotelId } });
    return deleted.count > 0;
  }
}

export const marketingRepository = new MarketingRepository();
