import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PaymentProvider } from "@prisma/client";

const ALL: PaymentProvider[] = ["CLICK", "PAYME", "UZUM", "MANUAL", "MOCK"];

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" },
    });
    const v = (settings?.value as Record<string, { enabled?: boolean } | undefined> | null) ?? null;

    const enabled = ALL.filter((p) => {
      const key = p.toLowerCase() as keyof NonNullable<typeof v>;
      const cfg = v?.[key];
      if (p === "MOCK") {
        if (cfg == null) return true;
        return cfg.enabled !== false;
      }
      return Boolean(cfg?.enabled);
    });

    const list = enabled.length ? enabled : (["MOCK", "MANUAL"] as PaymentProvider[]);
    return NextResponse.json({ providers: list }, { status: 200 });
  } catch {
    return NextResponse.json({ providers: ["MOCK", "MANUAL"] as PaymentProvider[] }, { status: 200 });
  }
}
