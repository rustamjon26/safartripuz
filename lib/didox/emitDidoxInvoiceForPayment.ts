import { prisma } from "@/lib/prisma";
import {
  extractDidoxDocumentId,
  sendDidoxInvoice,
} from "@/lib/didox/didox.service";

function formatContractDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function buildProductName(input: {
  destination: string;
  tourTitle?: string | null;
  hotelName?: string | null;
  homeStayTitle?: string | null;
  guideTitle?: string | null;
  paymentId: string;
}): string {
  if (input.hotelName) {
    return `Mehmonxona bron — ${input.hotelName} (${input.destination})`;
  }
  if (input.homeStayTitle) {
    return `HomeStay bron — ${input.homeStayTitle} (${input.destination})`;
  }
  if (input.guideTitle) {
    return `Gid xizmati — ${input.guideTitle} (${input.destination})`;
  }
  if (input.tourTitle) {
    return `Tur paket — ${input.tourTitle}`;
  }
  return `SafarTrip booking #${input.paymentId.slice(-8)} — ${input.destination}`;
}

export async function emitDidoxInvoiceForPayment(paymentId: string): Promise<void> {
  if (!process.env.DIDOX_PARTNER_TOKEN) return;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        travelPlan: {
          include: {
            tourPackage: { select: { title: true } },
            user: { select: { first_name: true, last_name: true } },
            homeStayBookings: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { listing: { select: { title: true } } },
            },
            guideBookings: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { listing: { select: { title: true } } },
            },
          },
        },
      },
    });

    if (!payment || payment.status !== "SUCCESS") return;
    if (payment.didoxDocumentId) return;

    const plan = payment.travelPlan;
    const hotelBooking = await prisma.hotelBooking.findFirst({
      where: { note: { contains: payment.travelPlanId } },
      include: { hotel: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const buyerName =
      hotelBooking?.hotel.name ??
      plan.homeStayBookings[0]?.listing.title ??
      plan.guideBookings[0]?.listing.title ??
      (`${plan.user.first_name} ${plan.user.last_name}`.trim() || "Mehmon");

    const productName = buildProductName({
      destination: plan.destination,
      tourTitle: plan.tourPackage?.title,
      hotelName: hotelBooking?.hotel.name,
      homeStayTitle: plan.homeStayBookings[0]?.listing.title,
      guideTitle: plan.guideBookings[0]?.listing.title,
      paymentId: payment.id,
    });

    const draft = await sendDidoxInvoice({
      contractNumber: payment.id,
      contractDate: formatContractDate(payment.paidAt ?? new Date()),
      sellerTin: process.env.DIDOX_TAX_ID!,
      sellerName: process.env.DIDOX_SELLER_NAME ?? "SafarTrip MCHJ",
      sellerAddress: process.env.DIDOX_SELLER_ADDRESS ?? "Toshkent sh.",
      sellerBankAccount: process.env.DIDOX_SELLER_BANK_ACCOUNT ?? "",
      sellerBankId: process.env.DIDOX_SELLER_BANK_ID ?? "",
      buyerTin: "000000000",
      buyerName,
      productName,
      amount: Number(payment.amount),
      catalogCode: process.env.DIDOX_CATALOG_CODE ?? "10523001001000000",
    });

    const documentId = extractDidoxDocumentId(draft);
    if (documentId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { didoxDocumentId: documentId },
      });
    }
  } catch (err) {
    console.error("[Didox] Invoice sending failed:", err);
  }
}
