"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  region: string;
  pricePerNight: number;
  maxGuests: number;
  rooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "BLOCKED";
  verificationNote: string | null;
  host: { first_name: string; last_name: string; email: string; phone: string };
  bookings: Array<{ id: string; status: string; totalPrice: number; checkIn: string; checkOut: string }>;
};

export default function AdminHomeStayListingReviewPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<ListingDetail | null>(null);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/homestay/listings/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setItem(data.listing);
        setNote(data.listing?.verificationNote || "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  async function setStatus(status: "ACTIVE" | "REJECTED" | "BLOCKED") {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/homestay/listings/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik");
      toast.success(`Listing ${status}`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></div>;
  if (!item) return <div className="py-20 text-center text-slate-400 font-bold">Listing topilmadi</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Listing Review</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">ID: {item.id}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-3">{item.title}</h2>
            <p className="text-sm font-semibold text-slate-500 mb-2">{item.address}, {item.city}, {item.region}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <Stat label="Price/night" value={Number(item.pricePerNight).toLocaleString()} />
              <Stat label="Max Guests" value={item.maxGuests} />
              <Stat label="Rooms" value={item.rooms} />
              <Stat label="Beds/Baths" value={`${item.beds}/${item.bathrooms}`} />
            </div>
            <div className="mt-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {item.amenities.map((a) => <span key={a} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{a}</span>)}
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {item.images.map((img) => (
                  <img key={img} src={img} alt={item.title} className="w-full h-28 object-cover rounded-xl border border-slate-100" />
                ))}
              </div>
            </div>
          </div>

          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h3 className="text-base font-black text-slate-900 mb-3">Booking History</h3>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="pl-4">ID</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th className="pr-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {item.bookings.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-400 font-bold">No bookings</td></tr>
                  ) : item.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="pl-4 py-3 text-xs font-black text-slate-500">{b.id.slice(0, 8)}...</td>
                      <td className="py-3 text-sm font-semibold text-slate-600">{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</td>
                      <td className="py-3 text-xs font-black">{b.status}</td>
                      <td className="pr-4 py-3 text-right font-black">{Number(b.totalPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h3 className="text-base font-black text-slate-900 mb-2">Host Contact</h3>
            <p className="text-sm font-bold text-slate-700">{item.host.first_name} {item.host.last_name}</p>
            <p className="text-sm text-slate-500">{item.host.email}</p>
            <p className="text-sm text-slate-500">{item.host.phone}</p>
            <div className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Current status</div>
            <div className="mt-1 text-sm font-black text-slate-800">{item.status}</div>
          </div>

          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h3 className="text-base font-black text-slate-900 mb-3">Verification</h3>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 min-h-[120px]" />
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button onClick={() => void setStatus("ACTIVE")} disabled={saving} className="adm-btn adm-btn-primary disabled:opacity-50">Approve</button>
              <button onClick={() => void setStatus("REJECTED")} disabled={saving} className="adm-btn disabled:opacity-50">Reject</button>
              <button onClick={() => void setStatus("BLOCKED")} disabled={saving} className="adm-btn disabled:opacity-50">Block</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}
