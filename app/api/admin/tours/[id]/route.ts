import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { title, description, destination, days, nights, price, category, imageUrl, highlights, status } = body;

    // Highlights processing: if it's an array, use it; otherwise split string if provided.
    const processedHighlights = highlights !== undefined 
      ? (Array.isArray(highlights) ? highlights : (highlights?.split(',').map((h: string) => h.trim()) || []))
      : undefined;

    const tour = await prisma.tourPackage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(destination !== undefined && { destination }),
        ...(days !== undefined && { days: Number(days) }),
        ...(nights !== undefined && { nights: Number(nights) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(category !== undefined && { category }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(processedHighlights !== undefined && { highlights: processedHighlights }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ tour });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.tourPackage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
