export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Hotel, Wallet } from "lucide-react";
import { PaymeButton } from "@/components/PaymeButton";
import { bookingRepository } from "@/src/modules/booking";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "To'lov kutilmoqda",
    className: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  PAID: {
    label: "To'langan",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  },
  CANCELLED: {
    label: "Bekor qilingan",
    className: "bg-red-50 text-red-800 ring-red-100",
  },
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatUzs(amountTiyin: number): string {
  return `${(amountTiyin / 100).toLocaleString("uz-UZ")} so'm`;
}

export default async function PaymeBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { bookingId } = await params;
  const { status } = await searchParams;

  const booking = await bookingRepository.findPaymeBookingWithHotel(bookingId);

  if (!booking) notFound();

  const statusStyle = STATUS_STYLES[booking.status] ?? {
    label: booking.status,
    className: "bg-slate-50 text-slate-700 ring-slate-100",
  };

  const isSuccess = status === "success" || booking.status === "PAID";
  const isFailed = status === "failed";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href="/bookings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Bronlar ro&apos;yxati
        </Link>

        {isSuccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900">
                To&apos;lov muvaffaqiyatli amalga oshirildi
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {booking.hotel.name} uchun bron tasdiqlandi.
              </p>
            </div>

            <dl className="mt-8 space-y-4 border-t border-slate-100 pt-6 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Mehmonxona</dt>
                <dd className="font-semibold text-slate-900">{booking.hotel.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Summa</dt>
                <dd className="font-semibold text-slate-900">{formatUzs(booking.amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-500">Holat</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle.className}`}
                  >
                    {statusStyle.label}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bron</p>
                <h1 className="mt-1 text-2xl font-black text-slate-900">{booking.hotel.name}</h1>
                {booking.hotel.city ? (
                  <p className="mt-1 text-sm text-slate-500">{booking.hotel.city}</p>
                ) : null}
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle.className}`}
              >
                {statusStyle.label}
              </span>
            </div>

            {isFailed ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                To&apos;lov yakunlanmadi. Qayta urinib ko&apos;ring.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <CalendarDays size={16} />
                  <span className="text-xs font-bold uppercase">Kirish</span>
                </div>
                <p className="font-semibold text-slate-900">{formatDate(booking.checkInDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <CalendarDays size={16} />
                  <span className="text-xs font-bold uppercase">Chiqish</span>
                </div>
                <p className="font-semibold text-slate-900">{formatDate(booking.checkOutDate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <div className="mb-2 flex items-center gap-2 text-slate-500">
                  <Wallet size={16} />
                  <span className="text-xs font-bold uppercase">To&apos;lov summasi</span>
                </div>
                <p className="text-xl font-black text-slate-900">{formatUzs(booking.amount)}</p>
              </div>
            </div>

            {booking.status === "PENDING" ? (
              <div className="mt-6">
                <PaymeButton
                  bookingId={booking.id}
                  amount={booking.amount}
                  hotelName={booking.hotel.name}
                />
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Hotel size={16} />
                Ushbu bron uchun onlayn to&apos;lov talab qilinmaydi.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
