"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type BookingLog = {
  id: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
};

type BookingDetail = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  listing: {
    title: string;
    city: string;
    host: { first_name: string; last_name: string; email: string };
  };
  guest: { first_name: string; last_name: string; email: string; phone: string | null };
  logs: BookingLog[];
};

export default function AdminHomeStayBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/homestay/bookings/${params.id}`);
        const data = await res.json();
        if (res.ok) setBooking(data.booking ?? null);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) void load();
  }, [params.id]);

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Loading...</div>;
  if (!booking) return <div className="p-10 text-center text-red-500 font-bold">Booking not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">HomeStay Booking Audit</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">Booking ID: {booking.id}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        <p><b>Status:</b> {booking.status}</p>
        <p><b>Dates:</b> {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}</p>
        <p><b>Guest:</b> {booking.guest.first_name} {booking.guest.last_name} ({booking.guest.email})</p>
        <p><b>Host:</b> {booking.listing.host.first_name} {booking.listing.host.last_name} ({booking.listing.host.email})</p>
        <p><b>Listing:</b> {booking.listing.title} ({booking.listing.city})</p>
        <p><b>Total:</b> {Number(booking.totalPrice).toLocaleString()} UZS</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-900 mb-4">Audit Trail</h2>
        <div className="space-y-3">
          {booking.logs.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No status logs found</p>
          ) : (
            booking.logs.map((log) => (
              <div key={log.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-800">{log.fromStatus} → {log.toStatus}</p>
                  <p className="text-xs text-slate-500 font-semibold">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Actor: {log.actor ? `${log.actor.first_name} ${log.actor.last_name} (${log.actor.email})` : "System"} [{log.actorRole}]
                </p>
                {log.note ? <p className="text-sm text-slate-700 mt-1">{log.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
