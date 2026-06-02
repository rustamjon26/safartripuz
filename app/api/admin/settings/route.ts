import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import {
  DEFAULT_GENERAL_SETTINGS,
  GENERAL_SETTINGS_KEY,
  mergeGeneralSettings,
  type GeneralSettings,
} from "@/lib/admin/generalSettings";

const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(7).max(32),
  defaultCurrency: z.enum(["UZS", "USD", "EUR"]),
  enableNotifications: z.boolean(),
});

function authErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    await requireRole(["admin", "super_admin"]);

    const setting = await prisma.systemSetting.findUnique({
      where: { key: GENERAL_SETTINGS_KEY },
    });

    const settings = mergeGeneralSettings(setting?.value);

    return NextResponse.json({
      settings,
      updatedAt: setting?.updatedAt ?? null,
    });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Sozlamalarni yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);

    const json = await req.json();
    const parsed = settingsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const settings: GeneralSettings = parsed.data;

    const saved = await prisma.systemSetting.upsert({
      where: { key: GENERAL_SETTINGS_KEY },
      create: {
        key: GENERAL_SETTINGS_KEY,
        value: settings,
      },
      update: {
        value: settings,
      },
    });

    return NextResponse.json({
      settings: mergeGeneralSettings(saved.value),
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    return NextResponse.json({ error: "Sozlamalarni saqlab bo'lmadi" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}
