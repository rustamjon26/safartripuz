import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
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
    merchantKey: z.string().optional(),
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

/** Secrets are write-only: GET returns a mask, PUT with the mask keeps the stored value. */
const SECRET_MASK = "********";
const SECRET_FIELDS = ["secretKey", "merchantKey"] as const;

type ProviderConfig = Record<string, unknown>;
type SettingsValue = Record<string, ProviderConfig | undefined>;

function maskSecrets(value: SettingsValue): SettingsValue {
  const out: SettingsValue = {};
  for (const [provider, cfg] of Object.entries(value)) {
    if (!cfg || typeof cfg !== "object") continue;
    const masked: ProviderConfig = { ...cfg };
    for (const field of SECRET_FIELDS) {
      if (typeof masked[field] === "string" && masked[field]) {
        masked[field] = SECRET_MASK;
      }
    }
    out[provider] = masked;
  }
  return out;
}

function restoreMaskedSecrets(
  incoming: SettingsValue,
  existing: SettingsValue,
): SettingsValue {
  const out: SettingsValue = {};
  for (const [provider, cfg] of Object.entries(incoming)) {
    if (!cfg || typeof cfg !== "object") continue;
    const merged: ProviderConfig = { ...cfg };
    for (const field of SECRET_FIELDS) {
      if (merged[field] === SECRET_MASK) {
        merged[field] = existing[provider]?.[field] ?? "";
      }
    }
    out[provider] = merged;
  }
  return out;
}

export async function GET() {
  try {
    await requireRole(["super_admin", "admin"]);

    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" }
    });

    const value = (settings?.value as SettingsValue | null) ?? {
      click: { enabled: false, merchantId: "", serviceId: "", secretKey: "" },
      payme: { enabled: false, merchantId: "", secretKey: "" },
      uzum: { enabled: false, merchantId: "", secretKey: "" },
      manual: { enabled: false, cardNumber: "", cardHolder: "" }
    };

    return NextResponse.json(maskSecrets(value));
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

    const existing = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" },
    });
    const payload = restoreMaskedSecrets(
      parsed.data as SettingsValue,
      (existing?.value as SettingsValue | null) ?? {},
    );

    const saved = await prisma.systemSetting.upsert({
      where: { key: "payment_providers" },
      create: {
        key: "payment_providers",
        value: payload as Prisma.InputJsonValue
      },
      update: {
        value: payload as Prisma.InputJsonValue
      }
    });

    return NextResponse.json(maskSecrets(saved.value as SettingsValue));
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
