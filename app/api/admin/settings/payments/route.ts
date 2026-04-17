import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

const schema = z.object({
  click: z.object({
    enabled: z.boolean(),
    merchantId: z.string().optional(),
    serviceId: z.string().optional(),
    secretKey: z.string().optional(),
  }).optional(),
  payme: z.object({
    enabled: z.boolean(),
    merchantId: z.string().optional(),
    secretKey: z.string().optional(),
  }).optional(),
  uzum: z.object({
    enabled: z.boolean(),
    merchantId: z.string().optional(),
    secretKey: z.string().optional(),
  }).optional(),
  manual: z.object({
    enabled: z.boolean(),
    cardNumber: z.string().optional(),
    cardHolder: z.string().optional(),
  }).optional()
});

export async function GET() {
  try {
    await requireRole(["super_admin", "admin"]);

    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" }
    });

    return NextResponse.json(settings?.value ?? {
      click: { enabled: false, merchantId: "", serviceId: "", secretKey: "" },
      payme: { enabled: false, merchantId: "", secretKey: "" },
      uzum: { enabled: false, merchantId: "", secretKey: "" },
      manual: { enabled: false, cardNumber: "", cardHolder: "" }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole(["super_admin", "admin"]);
    
    const json = await req.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }

    const payload = parsed.data;

    const saved = await prisma.systemSetting.upsert({
      where: { key: "payment_providers" },
      create: {
        key: "payment_providers",
        value: payload
      },
      update: {
        value: payload
      }
    });

    return NextResponse.json(saved.value);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
