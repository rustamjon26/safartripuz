import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getApprovedPartnerContextByUserId } from "@/lib/partner";
import { fail, handleApiError, ok } from "../_utils";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  serviceType: z.enum([
    "INTERCITY_TRANSFER",
    "HOTEL_TRANSFER",
    "TOUR_DAILY_TRANSPORT",
  ]),
  price: z.coerce.number().positive(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const items = await prisma.taxiService.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        partnerId: true,
        title: true,
        serviceType: true,
        price: true,
        isActive: true,
        createdAt: true,
      },
    });

    const data = await Promise.all(
      items.map(async (service) => {
        const [driverCount, reviewStats] = await Promise.all([
          prisma.taxiOrder.findMany({
            where: {
              serviceId: service.id,
              driverId: { not: null },
            },
            distinct: ["driverId"],
            select: { driverId: true },
          }),
          prisma.taxiReview.aggregate({
            where: {
              order: {
                serviceId: service.id,
              },
            },
            _avg: { rating: true },
          }),
        ]);

        return {
          ...service,
          driverCount: driverCount.length,
          avgRating: reviewStats._avg.rating ?? null,
        };
      }),
    );

    return ok({
      data,
      pagination: {
        page: 1,
        limit: data.length || 1,
        total: data.length,
        totalPages: 1,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["taxi"]);
    const partner = await getApprovedPartnerContextByUserId(actor.id, "taxi");
    if (!partner) {
      return fail("Tasdiqlangan taxi partner topilmadi", 404);
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Validation error", 400);
    }

    const item = await prisma.taxiService.create({
      data: {
        partnerId: partner.id,
        title: parsed.data.title,
        serviceType: parsed.data.serviceType,
        price: parsed.data.price,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        title: true,
        serviceType: true,
        price: true,
        isActive: true,
      },
    });

    return ok(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
