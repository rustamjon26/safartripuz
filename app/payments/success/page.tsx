"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">To&apos;lov muvaffaqiyatli!</h1>
      <p className="text-gray-500 font-medium mb-2">Broningiz tasdiqlandi.</p>
      {paymentId ? (
        <p className="text-gray-400 text-xs mb-8">To&apos;lov ID: {paymentId}</p>
      ) : null}
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Yuklanmoqda...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
