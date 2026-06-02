import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import {
  appBaseUrl,
  getClickConfig,
  getPaymeConfig,
  getPaymentProvidersConfig,
} from "@/lib/payments/providerConfig";

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

    const providers = await getPaymentProvidersConfig();
    type GenericProviderCfg = {
      enabled?: boolean;
      merchantId?: string;
    };
    const genericConfig = (providers[String(provider).toLowerCase()] ?? {}) as GenericProviderCfg;

    if (provider === "CLICK" && !getClickConfig(providers).enabled) {
      return NextResponse.json({ error: "Ushbu to'lov tizimi o'chirilgan" }, { status: 400 });
    }
    if (provider === "PAYME" && !getPaymeConfig(providers).enabled) {
      return NextResponse.json({ error: "Ushbu to'lov tizimi o'chirilgan" }, { status: 400 });
    }
    if (
      provider !== "CLICK" &&
      provider !== "PAYME" &&
      provider !== "MOCK" &&
      provider !== "MANUAL" &&
      !genericConfig.enabled
    ) {
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
    const baseUrl = appBaseUrl();
    const returnUrl = baseUrl
      ? `${baseUrl}/payments/success?paymentId=${payment.id}`
      : `/payments/success?paymentId=${payment.id}`;

    let paymentUrl = "";
    if (provider === "CLICK") {
      const clickConfig = getClickConfig(providers);
      const amount = Number(plan.totalAmount);
      paymentUrl =
        `https://my.click.uz/services/pay` +
        `?service_id=${clickConfig.serviceId}` +
        `&merchant_id=${clickConfig.merchantId}` +
        `&amount=${amount}` +
        `&transaction_param=${payment.id}` +
        `&merchant_trans_id=${payment.id}` +
        `&return_url=${encodeURIComponent(returnUrl)}`;
    } else if (provider === "PAYME") {
      const paymeConfig = getPaymeConfig(providers);
      const amountTiyin = Math.round(Number(plan.totalAmount) * 100);
      const b64 = Buffer.from(
        `m=${paymeConfig.merchantId};ac.order_id=${payment.id};a=${amountTiyin}`,
      ).toString("base64");
      paymentUrl = `https://checkout.paycom.uz/${b64}`;
    } else if (provider === "UZUM") {
       paymentUrl = `https://uzumbank.uz/pay?merchant=${genericConfig.merchantId}&amount=${plan.totalAmount}&order=${payment.id}`;
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
