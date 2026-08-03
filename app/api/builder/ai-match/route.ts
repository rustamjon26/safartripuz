import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireEnv } from "@/src/shared/env";

async function parseWithClaude(prompt: string, availableCities: string[]) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": requireEnv("ANTHROPIC_API_KEY"),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Siz O'zbekiston bo'ylab sayohat rejalashtiruvchi 
yordamchisiz. Foydalanuvchi so'rovi: "${prompt}"

Mavjud shaharlar ro'yxati: ${availableCities.join(", ")}

MUHIM: destination FAQAT yuqoridagi ro'yxatdan bo'lishi kerak.
Agar foydalanuvchi Samarqand desa va ro'yxatda Samarqand bo'lsa,
destination = "Samarqand" deb yoz.

Faqat shu JSON ni qaytar, boshqa hech narsa yozma:
{"destination":"shahar_nomi","pax":2,"budget":"cheap|expensive|any","days":2,"mood":"romantic|family|adventure|relax|business|any","message":"o'zbek tilida 1 jumlali javob"}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return { destination: "", pax: 2, budget: "any" as const, days: 2, mood: "any", message: "API xato" };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          return {
            destination: "",
            pax: 2,
            budget: "any" as const,
            days: 2,
            mood: "any",
            message: "Tushunmadim, qayta yozing.",
          };
        }
      } else {
        return {
          destination: "",
          pax: 2,
          budget: "any" as const,
          days: 2,
          mood: "any",
          message: "Tushunmadim, qayta yozing.",
        };
      }
    }

    return result;
  } catch {
    return { destination: "", pax: 2, budget: "any" as const, days: 2, mood: "any", message: "Xato" };
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`ai-match:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { message: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urining." },
      { status: 429 },
    );
  }

  try {
    await requireUser();

    const rawBody = await req.text();

    let prompt: string;
    try {
      const parsed = JSON.parse(rawBody) as { prompt?: string };
      prompt = parsed.prompt ?? "";
    } catch {
      return NextResponse.json(
        { message: "JSON format noto'g'ri" },
        { status: 400 },
      );
    }

    if (!prompt || prompt.trim().length < 2) {
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

    const parsed = await parseWithClaude(prompt, availableCities);

    if (!parsed.destination) {
      // Conversational clarify — 200 so the client can show a chat bubble (not toast.error).
      return NextResponse.json(
        {
          success: true,
          needsClarification: true,
          message:
            typeof parsed.message === "string" && parsed.message.trim()
              ? parsed.message.trim()
              : "Shaharni aniqlay olmadim. Samarqand, Buxoro, Xiva yoki boshqa manzil nomini yozing.",
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
