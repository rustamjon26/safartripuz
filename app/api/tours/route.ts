import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tours = await prisma.tourPackage.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(tours);
  } catch (error) {
    console.error("Failed to fetch tours:", error);
    return NextResponse.json({ error: "Failed to fetch tours" }, { status: 500 });
  }
}
