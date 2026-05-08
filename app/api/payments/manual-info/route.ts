import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" }
    });
    
    // Default fallback when not configured
    const defaultData = { cardNumber: "8600 0000 0000 0000", cardHolder: "ADMINISTRATOR" };
    
    type ManualCfg = { enabled?: boolean; cardNumber?: string; cardHolder?: string };
    type PaymentProvidersJson = { manual?: ManualCfg };

    if (settings?.value) {
       const v = settings.value as PaymentProvidersJson;
       if (v.manual && v.manual.enabled) {
          return NextResponse.json({
             cardNumber: v.manual.cardNumber || defaultData.cardNumber,
             cardHolder: v.manual.cardHolder || defaultData.cardHolder
          });
       }
    }
    
    return NextResponse.json(defaultData);
  } catch (error) {
    return NextResponse.json({ error: "Xatolik ro'y berdi" }, { status: 500 });
  }
}
