import { prisma } from "@/lib/prisma";
import { GUIDE_ERRORS } from "@/lib/guide/errors";
import { fail, handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../_utils";

type ProfileUpdateInput = {
  bio?: string;
  languages?: string[];
  phone?: string;
};

export async function GET() {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const [partner, listings] = await Promise.all([
      prisma.partner.findUnique({
        where: { id: actor.partnerId },
        select: {
          id: true,
          displayName: true,
          bio: true,
          contactEmail: true,
          contactPhone: true,
          meta: true,
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.guideListing.findMany({
        where: { hostId: actor.id },
        include: {
          _count: { select: { bookings: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!partner) return fail(GUIDE_ERRORS.PROFILE_NOT_FOUND, 404);

    const totalBookings = listings.reduce((sum, item) => sum + item._count.bookings, 0);
    const allRatings = listings.flatMap((item) => item.reviews.map((review) => review.rating));
    const avgRating =
      allRatings.length === 0
        ? null
        : allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;

    const languages = Array.isArray((partner.meta as { languages?: unknown } | null)?.languages)
      ? ((partner.meta as { languages?: string[] }).languages ?? [])
      : [];

    return ok({
      partner,
      listings: listings.map((listing) => ({
        ...listing,
        _count: undefined,
        reviews: undefined,
      })),
      stats: {
        avgRating,
        totalBookings,
      },
      languages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    const body = (await req.json()) as ProfileUpdateInput;

    if (!body.bio && !body.languages && !body.phone) {
      return fail("Kamida bitta maydon yuborilishi kerak", 400);
    }

    if (body.languages && !Array.isArray(body.languages)) {
      return fail("languages massiv bo'lishi kerak", 400);
    }

    const existing = await prisma.partner.findUnique({
      where: { id: actor.partnerId },
      select: { id: true, meta: true },
    });
    if (!existing) return fail(GUIDE_ERRORS.PROFILE_NOT_FOUND, 404);

    const meta = (existing.meta as Record<string, unknown> | null) ?? {};

    const [updatedPartner, updatedUser] = await prisma.$transaction([
      prisma.partner.update({
        where: { id: actor.partnerId },
        data: {
          bio: body.bio ?? undefined,
          contactPhone: body.phone ?? undefined,
          meta:
            body.languages !== undefined
              ? { ...meta, languages: body.languages }
              : undefined,
        },
      }),
      body.phone
        ? prisma.user.update({
            where: { id: actor.id },
            data: { phone: body.phone },
            select: { id: true, phone: true },
          })
        : prisma.user.findUniqueOrThrow({
            where: { id: actor.id },
            select: { id: true, phone: true },
          }),
    ]);

    return ok({
      partner: updatedPartner,
      user: updatedUser,
      languages:
        body.languages ??
        (Array.isArray((meta as { languages?: unknown }).languages)
          ? ((meta as { languages?: string[] }).languages ?? [])
          : []),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
