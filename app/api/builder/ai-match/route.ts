import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  buildAiMatchPrompt,
  chatCompletions,
  CITY_CLARIFY_MESSAGE,
  loadTripaiLlmConfig,
  parseAiMatchIntent,
} from "@/src/modules/tripai";

const bodySchema = z.object({
  prompt: z.string().max(2000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`ai-match:${ip}`, 10, 60_000))) {
    return NextResponse.json(
      { message: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urining." },
      { status: 429 },
    );
  }

  try {
    await requireUser();

    const rawBody = await req.text();
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { message: "JSON format noto'g'ri" },
        { status: 400 },
      );
    }

    const body = bodySchema.safeParse(json);
    if (!body.success) {
      return NextResponse.json(
        { message: "JSON format noto'g'ri" },
        { status: 400 },
      );
    }
    const prompt = body.data.prompt.trim();

    if (prompt.length < 2) {
      return NextResponse.json(
        {
          success: true,
          needsClarification: true,
          message: "Xabar yozing — qayerga va necha kunga sayohat qilmoqchisiz?",
        },
        { status: 200 },
      );
    }

    const hotelCities = await prisma.hotel.findMany({
      where: { status: "active" },
      select: { city: true },
      distinct: ["city"],
    });
    const availableCities = [
      ...new Set(
        hotelCities
          .map((h) => h.city)
          .filter((city): city is string => typeof city === "string" && city.trim().length > 0)
      ),
    ];

    const llmReady = Boolean(loadTripaiLlmConfig());
    if (!llmReady) {
      console.error("AI match: TRIPAI_LLM_* is not configured");
    }

    const rawLlm = llmReady
      ? await chatCompletions(
          [{ role: "user", content: buildAiMatchPrompt(prompt, availableCities) }],
          { temperature: 0.2, maxTokens: 800, timeoutMs: 25_000 },
        )
      : null;

    if (llmReady && !rawLlm) {
      console.error("AI match: LLM returned empty response");
    }

    const parsed = parseAiMatchIntent(rawLlm ?? "", availableCities, prompt);

    if (!parsed.destination) {
      // Conversational clarify — 200 so the client can show a chat bubble (not toast.error).
      return NextResponse.json(
        {
          success: true,
          needsClarification: true,
          message:
            typeof parsed.message === "string" && parsed.message.trim()
              ? parsed.message.trim()
              : CITY_CLARIFY_MESSAGE,
        },
        { status: 200 },
      );
    }

    const { destination, pax, budget, days, mood } = parsed;

    const startDate = new Date(Date.now() + 86400000 * 3);
    const endDate = new Date(startDate.getTime() + 86400000 * days);
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const hotels = await prisma.hotel.findMany({
      where: { city: destination, status: "active" },
      select: {
        id: true,
        name: true,
        city: true,
        roomTypes: {
          where: { isActive: true },
          orderBy: { basePrice: "asc" },
          take: 1,
          select: { id: true, basePrice: true, name: true },
        },
      },
    });

    const mappedHotels = hotels
      .filter((h) => h.roomTypes.length > 0)
      .map((h) => {
        const room = h.roomTypes[0];
        return {
          id: h.id,
          title: h.name,
          city: h.city,
          roomTypeId: room.id,
          roomTypeName: room.name,
          nightlyPrice: Number(room.basePrice),
        };
      });

    if (budget === "cheap") mappedHotels.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
    if (budget === "expensive") mappedHotels.sort((a, b) => b.nightlyPrice - a.nightlyPrice);

    const taxis = await prisma.taxiService.findMany({
      where: { isActive: true },
      select: { id: true, title: true, serviceType: true, price: true },
    });

    const mappedTaxis = taxis.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.serviceType,
      price: Number(t.price),
    }));

    if (budget === "cheap") mappedTaxis.sort((a, b) => a.price - b.price);
    if (budget === "expensive") mappedTaxis.sort((a, b) => b.price - a.price);

    const guides = await prisma.guideListing.findMany({
      where: { isActive: true, region: destination },
      select: {
        id: true,
        title: true,
        language: true,
        pricePerDay: true,
        pricePerHour: true,
      },
    });

    const mappedGuides = guides.map((g) => ({
      id: g.id,
      title: g.title,
      language: g.language,
      pricePerDay: Number(g.pricePerDay),
      pricePerHour: Number(g.pricePerHour),
    }));

    if (budget === "cheap") mappedGuides.sort((a, b) => a.pricePerDay - b.pricePerDay);
    if (budget === "expensive") mappedGuides.sort((a, b) => b.pricePerDay - a.pricePerDay);

    const bestHotel = mappedHotels[0] ?? null;
    const bestTaxi =
      mappedTaxis.find((t) => t.type === "INTERCITY_TRANSFER") ??
      mappedTaxis[0] ??
      null;
    const bestGuide = mappedGuides[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        destination,
        startDate: startStr,
        endDate: endStr,
        pax,
        days,
        mood,
        hotel: bestHotel,
        taxi: bestTaxi,
        guide: bestGuide,
        aiMessage: parsed.message,
        message: parsed.message,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("AI match error:", error);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
