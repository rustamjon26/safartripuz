import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function parseWithClaude(prompt: string, availableCities: string[]) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
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
      const err = await res.text();
      console.error("Anthropic API error:", res.status, err);
      return { destination: "", pax: 2, budget: "any" as const, days: 2, mood: "any", message: "API xato" };
    }

    const data = await res.json();
    console.log("API response:", JSON.stringify(data));

    const text = data.content?.[0]?.text ?? "{}";
    console.log("Text:", text);

    const cleaned = text.replace(/```json|```/g, "").trim();
    console.log("Cleaned text:", cleaned);

    // JSON parse o'rniga try-catch bilan xavfsiz parse
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse failed, raw text:", text);

      // Claude ba'zan JSON ni text ichiga yashiradi
      // regex bilan ajratib olishga harakat qil
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Regex extract also failed");
          return {
            destination: "",
            pax: 2,
            budget: "any" as const,
            days: 2,
            mood: "any",
            message: "Tushunmadim, qayta yozing."
          };
        }
      } else {
        return {
          destination: "",
          pax: 2,
          budget: "any" as const,
          days: 2,
          mood: "any",
          message: "Tushunmadim, qayta yozing."
        };
      }
    }

    return result;
  } catch (e) {
    console.error("parseWithClaude error:", e);
    return { destination: "", pax: 2, budget: "any" as const, days: 2, mood: "any", message: "Xato" };
  }
}

export async function POST(req: Request) {
  try {
    // req.json() o'rniga req.text() bilan o'qi
    const rawBody = await req.text();
    console.log("Raw body received:", rawBody);

    let prompt: string;
    try {
      const parsed = JSON.parse(rawBody) as { prompt?: string };
      prompt = parsed.prompt ?? "";
    } catch (e) {
      console.error("Body parse error:", e);
      return NextResponse.json(
        { message: "JSON format noto'g'ri" },
        { status: 400 }
      );
    }

    if (!prompt || prompt.trim().length < 5) {
      return NextResponse.json(
        { message: "Iltimos, safar haqida batafsilroq yozing." },
        { status: 400 }
      );
    }

    console.log("Prompt received:", prompt);

    // DB dan mavjud shaharlarni ol
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

    // Claude bilan tahlil qil
    const parsed = await parseWithClaude(prompt, availableCities);

    if (!parsed.destination) {
      return NextResponse.json(
        {
          message:
            parsed.message ||
            "Shaharni aniqlay olmadim. Samarqand, Buxoro yoki Xiva kabi shahar nomini yozing.",
        },
        { status: 404 }
      );
    }

    const { destination, pax, budget, days, mood } = parsed;

    const startDate = new Date(Date.now() + 86400000 * 3);
    const endDate = new Date(startDate.getTime() + 86400000 * days);
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    // Hotels
    const hotels = await prisma.hotel.findMany({
      where: { city: destination, status: "active" },
      select: { id: true, name: true, city: true },
    });

    const mappedHotels = hotels.map((h) => ({
      id: h.id,
      title: h.name,
      city: h.city,
      nightlyPrice: budget === "cheap"
        ? 300000
        : budget === "expensive"
        ? 900000
        : 500000,
    }));

    if (budget === "cheap") mappedHotels.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
    if (budget === "expensive") mappedHotels.sort((a, b) => b.nightlyPrice - a.nightlyPrice);

    // Taxis
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

    // Guides
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
    console.error("AI match error:", error);
    console.error("Error details:", JSON.stringify(error));
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
  