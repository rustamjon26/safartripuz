import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { z } from "zod";
import { PaymentProvider } from "@prisma/client";

const schema = z.object({
  planId: z.string(),
  provider: z.nativeEnum(PaymentProvider)
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const json = await req.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot kiritildi" }, { status: 400 });
    }

    const { planId, provider } = parsed.data;

    const plan = await prisma.travelPlan.findFirst({
      where: { id: planId, userId: actor.id },
      select: { id: true, status: true, totalAmount: true }
    });

    if (!plan) return NextResponse.json({ error: "Sayohat topilmadi" }, { status: 404 });
    if (plan.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "Faqat PENDING_PAYMENT holatida to'lov qilinadi" }, { status: 400 });

    const settings = await prisma.systemSetting.findUnique({
      where: { key: "payment_providers" }
    });
    
    type ProviderCfg = {
      enabled?: boolean;
      serviceId?: string;
      merchantId?: string;
    };
    type PaymentProvidersValue = Record<string, ProviderCfg | undefined>;
    const raw = settings?.value;
    const providers =
      typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? (raw as PaymentProvidersValue)
        : {};
    const config = providers[String(provider).toLowerCase()] ?? {};
    if (!config.enabled && provider !== "MOCK") {
      return NextResponse.json({ error: "Ushbu to'lov tizimi o'chirilgan" }, { status: 400 });
    }

    // Har qanday to'lov provayderi uchun avval bazaga To'lov yozuvini yaratamiz
    const payment = await prisma.payment.create({
      data: {
        travelPlanId: plan.id,
        provider,
        status: "INITIATED",
        amount: plan.totalAmount,
        currency: "UZS",
      }
    });

    // Mock link yoki haqiqiy generatsiya qilingan gateway URL
    let paymentUrl = "";
    if (provider === "CLICK") {
      // url format: https://my.click.uz/services/pay?service_id=xxx&merchant_id=yyy&amount=zzz&transaction_param=www
       paymentUrl = `https://my.click.uz/services/pay?service_id=${config.serviceId}&merchant_id=${config.merchantId}&amount=${plan.totalAmount}&transaction_param=${payment.id}`;
    } else if (provider === "PAYME") {
      // Payme is somewhat base64 encoded string: 
      const amountTipiy = Number(plan.totalAmount) * 100;
      const b64 = Buffer.from(`m=${config.merchantId};ac.order_id=${payment.id};a=${amountTipiy}`).toString('base64');
      paymentUrl = `https://checkout.paycom.uz/${b64}`;
    } else if (provider === "UZUM") {
       paymentUrl = `https://uzumbank.uz/pay?merchant=${config.merchantId}&amount=${plan.totalAmount}&order=${payment.id}`;
    } else if (provider === "MANUAL") {
       paymentUrl = `/payments/manual/${payment.id}`;
    } else {
       // Mock payment for local testing
       paymentUrl = `/payments/mock/${payment.id}`;
    }

    return NextResponse.json({ paymentId: payment.id, paymentUrl }, { status: 201 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error";
    console.error("PAYMENT CREATE ERROR:", error);
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
    }
    return NextResponse.json({ error: `To'lovni shakllantirishda xatolik: ${msg}` }, { status: 500 });
  }
}
