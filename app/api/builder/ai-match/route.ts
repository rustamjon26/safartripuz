import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A smart heuristic that simulates an AI parser
// In the future this can be connected to OpenAI or DeepSeek API.

function extractKeywords(prompt: string) {
  const p = prompt.toLowerCase();
  
  // Detect destination
  const cities = ["samarqand", "buxoro", "xiva", "toshkent", "jizzax", "zomin"];
  let destination = "";
  for (const city of cities) {
    if (p.includes(city)) {
      destination = city.charAt(0).toUpperCase() + city.slice(1); // Title case
      break;
    }
  }

  // Detect pax (people count)
  let pax = 2; // default
  if (p.includes("oila") || p.includes("bolalar") || p.includes("farzand")) pax = 4;
  else if (p.includes("yolg'iz") || p.includes("bitta") || p.match(/\b1 kishi\b/)) pax = 1;
  else if (p.match(/\b(\d+)\s*kishi\b/)) {
    const match = p.match(/\b(\d+)\s*kishi\b/);
    if (match?.[1]) pax = parseInt(match[1]);
  }

  // Detect budget preference
  let budget: "cheap" | "expensive" | "any" = "any";
  if (p.includes("arzon") || p.includes("chegirma") || p.includes("ekonom")) budget = "cheap";
  if (p.includes("qimmat") || p.includes("vip") || p.includes("zo'r") || p.includes("lyuks") || p.includes("premium")) budget = "expensive";

  // Detect duration
  let days = 2;
  const daysMatch = p.match(/\b(\d+)\s*kun\b/);
  if (daysMatch?.[1]) days = parseInt(daysMatch[1]);
  else if (p.includes("hafta oxiri") || p.includes("dam olish")) days = 2;

  // Simple date generator based on days
  const startDate = new Date(Date.now() + 86400000 * 3); // starts in 3 days
  const endDate = new Date(startDate.getTime() + 86400000 * days);

  return { destination, pax, budget, days, startDate: startDate.toISOString().split("T")[0], endDate: endDate.toISOString().split("T")[0] };
}

export async function POST(req: Request) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };
    
    if (!prompt) {
      return NextResponse.json({ message: "Sorov bo'sh bo'lishi mumkin emas." }, { status: 400 });
    }

    const { destination, pax, budget, startDate, endDate, days } = extractKeywords(prompt);

    if (!destination) {
      return NextResponse.json({ message: "Men shaharni tushunmadim. 'Samarqand' yoki 'Buxoro' kabi shahar nomini aniqroq yozing." }, { status: 404 });
    }

    // Now, let's query the DB for this destination
    
    // 1. Hotels
    const hotels = await prisma.hotel.findMany({
      where: { city: destination, status: "active" },
      select: { id: true, name: true, city: true },
    });
    
    // We mock nightlyPrice because currently the schema for rooms doesn't easily expose it here directly
    // Ideally we would query `Room` but for the constructor we just need the hotel ID and a mock price.
    // In our previous builder iteration, we assigned mock prices per hotel. Let's do it logically.
    const mappedHotels = hotels.map(h => ({
      id: h.id,
      title: h.name,
      city: h.city,
      nightlyPrice: Math.floor(Math.random() * 500000) + 300000, 
    }));

    // Sort based on budget
    if (budget === "cheap") mappedHotels.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
    if (budget === "expensive") mappedHotels.sort((a, b) => b.nightlyPrice - a.nightlyPrice);

    // 2. Taxis
    const taxis = await prisma.taxiService.findMany({
      where: { isActive: true },
      select: { id: true, title: true, serviceType: true, price: true },
    });
    
    // For taxi, if pax > 4 we might prefer mini-van, but for now just find a matching type
    const mappedTaxis = taxis.map(t => ({
      id: t.id,
      title: t.title,
      type: t.serviceType,
      price: Number(t.price),
    }));

    if (budget === "cheap") mappedTaxis.sort((a, b) => a.price - b.price);
    if (budget === "expensive") mappedTaxis.sort((a, b) => b.price - a.price);


    // 3. Guides
    // Currently guide schema is GuideListing (title, language, region, pricePerDay)
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

    // Select the best matches (top 1)
    const bestHotel = mappedHotels.length > 0 ? mappedHotels[0] : null;
    let bestTaxi = null;
    
    // Smart heuristic for taxi: if destination is not Toshkent, we probably want an Intercity Transfer
    const preferredTaxiType = "INTERCITY_TRANSFER";
    bestTaxi = mappedTaxis.find(t => t.type === preferredTaxiType) || (mappedTaxis.length > 0 ? mappedTaxis[0] : null);

    const bestGuide = mappedGuides.length > 0 ? mappedGuides[0] : null;

    // Simulate AI response delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      data: {
        destination,
        startDate,
        endDate,
        pax,
        days,
        hotel: bestHotel,
        taxi: bestTaxi,
        guide: bestGuide,
        message: `Men siz aytgan ${destination} shahriga ${days} kunlik, ${pax} kishiga mos maxsus safar yig'dim. ${budget === 'cheap' ? 'Eng qulay (arzon) narsalarni tanladim.' : budget === 'expensive' ? 'Eng Premium xizmatlarni tanladim.' : ''}`
      }
    });

  } catch (error) {
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
