import Link from "next/link";
import type { HotelDashboardStats } from "@/lib/hotel/getHotelDashboardStats";

type RecentBookingsProps = {
  bookings: HotelDashboardStats["recent_bookings"];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  title: string;
  viewAllLabel: string;
  emptyLabel: string;
  retryLabel: string;
  labels: {
    guest: string;
    room: string;
    type: string;
    checkIn: string;
    checkOut: string;
    status: string;
    price: string;
  };
};

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-100",
  CHECKED_IN: "bg-green-50 text-green-700 border-green-100",
  CHECKED_OUT: "bg-slate-100 text-slate-600 border-slate-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
  NO_SHOW: "bg-orange-50 text-orange-700 border-orange-100",
};

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-50 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex gap-4">
          <div className="h-4 bg-gray-100 rounded flex-1" />
          <div className="h-4 bg-gray-100 rounded w-16 hidden sm:block" />
          <div className="h-4 bg-gray-100 rounded w-20 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

export default function RecentBookings({
  bookings,
  loading,
  error,
  onRetry,
  title,
  viewAllLabel,
  emptyLabel,
  retryLabel,
  labels,
}: RecentBookingsProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-extrabold text-[var(--primary)] text-[15px]">{title}</h3>
        <Link
          href="/hotel/bookings"
          className="text-[11px] font-bold text-[var(--accent)] bg-[var(--bg-light-blue)] px-2.5 py-1 rounded-md uppercase tracking-wider"
        >
          {viewAllLabel}
        </Link>
      </div>

      {error ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-slate-600 mb-4">{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2 bg-slate-100 font-bold text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : loading ? (
        <TableSkeleton />
      ) : bookings.length === 0 ? (
        <div className="p-10 text-center text-sm font-semibold text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {[labels.guest, labels.room, labels.type, labels.checkIn, labels.checkOut, labels.status, labels.price].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 text-[13px] font-bold text-slate-800">{booking.guest_name}</td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-slate-600">
                    {booking.room_number ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-slate-600">
                    {booking.room_type ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-slate-600 tabular-nums">
                    {booking.check_in}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-semibold text-slate-600 tabular-nums">
                    {booking.check_out}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                        STATUS_STYLES[booking.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {booking.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[13px] font-black text-slate-800 tabular-nums whitespace-nowrap">
                    {booking.total_price.toLocaleString("uz-UZ")} so&apos;m
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
