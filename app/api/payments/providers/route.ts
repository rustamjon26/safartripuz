import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PaymentProvider } from "@prisma/client";
import { mockPaymentsEnabled } from "@/lib/payments/mockGate";

const ALL: PaymentProvider[] = ["CLICK", "PAYME", "UZUM", "MANUAL", "MOCK"];

export async function GET() {
  const mockOk = mockPaymentsEnabled();
  const fallback = (
    mockOk ? ["MOCK", "MANUAL"] : ["MANUAL"]
  ) as PaymentProvider[];
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" },
    });
    const v = (settings?.value as Record<string, { enabled?: boolean } | undefined> | null) ?? null;

    const enabled = ALL.filter((p) => {
      const key = p.toLowerCase() as keyof NonNullable<typeof v>;
      const cfg = v?.[key];
      if (p === "MOCK") {
        // MOCK never appears in production unless PAYMENTS_MOCK_ENABLED=true.
        if (!mockOk) return false;
        if (cfg == null) return true;
        return cfg.enabled !== false;
      }
      return Boolean(cfg?.enabled);
    });

    const list = enabled.length ? enabled : fallback;
    return NextResponse.json({ providers: list }, { status: 200 });
  } catch {
    return NextResponse.json({ providers: fallback }, { status: 200 });
  }
}
