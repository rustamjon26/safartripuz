export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PaymentManualConfirmButton } from "@/components/admin/payments/PaymentManualConfirmButton";

const BADGE: Record<string, string> = {
  HOTEL: "bg-sky-50 text-sky-800 ring-sky-100",
  HOMESTAY: "bg-amber-50 text-amber-900 ring-amber-100",
  TAXI: "bg-orange-50 text-orange-900 ring-orange-100",
  GUIDE: "bg-violet-50 text-violet-900 ring-violet-100",
};

type LinkedRow = {
  kind: keyof typeof BADGE | "PLAN_ITEM";
  label: string;
  refId: string;
  amount: number;
  status: string;
};

export default async function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      travelPlan: {
        include: {
          user: { select: { first_name: true, last_name: true, email: true } },
          items: { orderBy: { createdAt: "asc" } },
          homeStayBookings: { select: { id: true, totalPrice: true, status: true } },
          taxiOrders: {
            select: { id: true, status: true, estimatedPrice: true, finalPrice: true },
          },
          guideBookings: { select: { id: true, totalPrice: true, status: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  const plan = payment.travelPlan;
  const hotelRows = plan
    ? await prisma.hotelBooking.findMany({
        where: {
          note: { contains: plan.id },
          source: "SAFARTRIP",
        },
        select: { id: true, totalAmount: true, status: true },
      })
    : [];

  const linked: LinkedRow[] = [];

  for (const b of hotelRows) {
    linked.push({
      kind: "HOTEL",
      label: "Hotel",
      refId: b.id,
      amount: Number(b.totalAmount),
      status: b.status,
    });
  }

  if (plan) {
    for (const b of plan.homeStayBookings) {
      linked.push({
        kind: "HOMESTAY",
        label: "Uy Mehmonxona",
        refId: b.id,
        amount: Number(b.totalPrice),
        status: b.status,
      });
    }
    for (const o of plan.taxiOrders) {
      linked.push({
        kind: "TAXI",
        label: "Taxi",
        refId: o.id,
        amount: Number(o.finalPrice ?? o.estimatedPrice),
        status: o.status,
      });
    }
    for (const b of plan.guideBookings) {
      linked.push({
        kind: "GUIDE",
        label: "Ekskursiya",
        refId: b.id,
        amount: Number(b.totalPrice),
        status: b.status,
      });
    }

    for (const it of plan.items) {
      const hasBooking =
        (it.type === "HOTEL" && hotelRows.length > 0) ||
        (it.type === "TAXI" && plan.taxiOrders.length > 0) ||
        (it.type === "GUIDE" && plan.guideBookings.length > 0);
      if (!hasBooking && (it.type === "HOTEL" || it.type === "TAXI" || it.type === "GUIDE")) {
        linked.push({
          kind: "PLAN_ITEM",
          label: `Reja: ${it.title}`,
          refId: it.id,
          amount: Number(it.totalPrice),
          status: "REJA",
        });
      }
    }
  }

  const canManualConfirm =
    payment.provider === "MANUAL" && (payment.status === "PENDING" || payment.status === "INITIATED");

  const S = payment.status;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/payments"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">To&apos;lov</h1>
            <p className="text-sm font-bold text-slate-400 mt-1 font-mono">{payment.id}</p>
          </div>
        </div>
        <PaymentManualConfirmButton paymentId={payment.id} hidden={!canManualConfirm} />
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50 flex items-center gap-2">
          <CreditCard size={18} className="text-slate-400" />
          <span className="text-lg font-black text-slate-900 tracking-tight">Asosiy</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Mijoz</div>
            <div className="font-black text-slate-900 mt-1">
              {plan ? `${plan.user.first_name} ${plan.user.last_name}` : "—"}
            </div>
            <div className="text-xs text-slate-500 mt-1">{plan?.user.email}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Manzil</div>
            <div className="font-bold text-slate-800 mt-1">{plan?.destination ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Miqdor</div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {Number(payment.amount).toLocaleString()} {payment.currency}
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Provider / Status</div>
            <div className="font-bold text-slate-800 mt-1">
              {payment.provider} · {S}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"Bog'liq bronlar"}</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Turi</th>
                <th>Ref ID</th>
                <th>Miqdor</th>
                <th className="pr-8">Holat</th>
              </tr>
            </thead>
            <tbody>
              {linked.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 font-bold">
                    Bog&apos;liq bron topilmadi
                  </td>
                </tr>
              ) : (
                linked.map((row) => {
                  const cls = row.kind === "PLAN_ITEM" ? "bg-slate-50 text-slate-700 ring-slate-200" : BADGE[row.kind] ?? BADGE.HOTEL;
                  const badgeLabel =
                    row.kind === "HOTEL"
                      ? "Hotel"
                      : row.kind === "HOMESTAY"
                        ? "Uy Mehmonxona"
                        : row.kind === "TAXI"
                          ? "Taxi"
                          : row.kind === "GUIDE"
                            ? "Guide"
                            : "Reja";
                  return (
                    <tr key={`${row.kind}-${row.refId}`}>
                      <td className="py-4 pl-8">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${cls}`}>
                          {badgeLabel}
                        </span>
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-600">{row.refId}</td>
                      <td className="py-4 font-black text-slate-900">{row.amount.toLocaleString()} UZS</td>
                      <td className="py-4 pr-8 text-xs font-bold text-slate-600">{row.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
