import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { DEFAULT_COMMISSION_RATES } from "@/src/modules/commission";

const ratesSchema = z.object({
  HOTEL: z.number().min(0).max(50),
  HOMESTAY: z.number().min(0).max(50),
  GUIDE: z.number().min(0).max(50),
  TAXI: z.number().min(0).max(50),
});

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "commission_rates" },
    });

    const stored =
      typeof setting?.value === "object" && setting.value !== null && !Array.isArray(setting.value)
        ? (setting.value as Record<string, number>)
        : {};

    const rates = { ...DEFAULT_COMMISSION_RATES, ...stored };

    return NextResponse.json({ rates });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);

    const json = await req.json();
    const parsed = z.object({ rates: ratesSchema }).safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const { rates } = parsed.data;

    await prisma.systemSetting.upsert({
      where: { key: "commission_rates" },
      update: { value: rates },
      create: { key: "commission_rates", value: rates },
    });

    return NextResponse.json({ success: true, rates });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
