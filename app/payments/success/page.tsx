export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import { getOptionalUser } from "@/lib/authz";
import {
  paymentService,
  type PaymentReturnOutcome,
} from "@/src/modules/payment";
import { PaymentReturnPoller } from "./PaymentReturnPoller";

function OutcomeCard({
  icon,
  iconWrap,
  title,
  body,
  paymentId,
  extra,
}: {
  icon: ReactNode;
  iconWrap: string;
  title: string;
  body: string;
  paymentId?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div
        className={`w-20 h-20 border-2 rounded-full flex items-center justify-center mb-6 ${iconWrap}`}
      >
        {icon}
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 font-medium mb-2">{body}</p>
      {paymentId ? (
        <p className="text-gray-400 text-xs mb-8">To&apos;lov ID: {paymentId}</p>
      ) : (
        <div className="mb-8" />
      )}
      {extra}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/user/bookings"
          className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-gray-800"
        >
          Bronlarim
        </Link>
        <Link
          href="/payments"
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm hover:bg-gray-200"
        >
          To&apos;lovlar
        </Link>
      </div>
    </div>
  );
}

function ReturnView({
  outcome,
  paymentId,
}: {
  outcome: PaymentReturnOutcome;
  paymentId?: string;
}) {
  if (outcome === "captured") {
    return (
      <OutcomeCard
        icon={<CheckCircle2 className="w-10 h-10" />}
        iconWrap="bg-emerald-50 border-emerald-200 text-emerald-600"
        title="To'lov muvaffaqiyatli!"
        body="Broningiz tasdiqlandi."
        paymentId={paymentId}
      />
    );
  }

  if (outcome === "pending") {
    return (
      <OutcomeCard
        icon={<Clock className="w-10 h-10" />}
        iconWrap="bg-amber-50 border-amber-200 text-amber-600"
        title="To'lov tasdiqlanmoqda"
        body="To'lov hali tasdiqlanmadi. Bu odatda bir necha soniya davom etadi — sahifani yangilab ko'ring."
        paymentId={paymentId}
        extra={paymentId ? <PaymentReturnPoller paymentId={paymentId} /> : null}
      />
    );
  }

  if (outcome === "failed") {
    return (
      <OutcomeCard
        icon={<XCircle className="w-10 h-10" />}
        iconWrap="bg-red-50 border-red-200 text-red-600"
        title="To'lov amalga oshmadi"
        body="To'lov bekor qilindi yoki muvaffaqiyatsiz tugadi. Qayta urinib ko'ring."
        paymentId={paymentId}
      />
    );
  }

  return (
    <OutcomeCard
      icon={<HelpCircle className="w-10 h-10" />}
      iconWrap="bg-slate-50 border-slate-200 text-slate-500"
      title="To'lov topilmadi"
      body="Bu havola noto'g'ri yoki muddati o'tgan. To'lov holatini bronlaringizdan tekshiring."
    />
  );
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const { paymentId: rawId } = await searchParams;
  const paymentId = rawId?.trim() ?? "";

  if (!paymentId) {
    return <ReturnView outcome="not_found" />;
  }

  const actor = await getOptionalUser();
  const { outcome } = await paymentService.getReturnView(
    paymentId,
    actor?.id ?? null,
  );

  return (
    <ReturnView
      outcome={outcome}
      paymentId={outcome === "not_found" ? undefined : paymentId}
    />
  );
}
