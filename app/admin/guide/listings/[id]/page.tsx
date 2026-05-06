"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { formatDateTime } from "@/lib/formatDate";
import { AdminGuideListingStatusBadge } from "@/components/admin/guide/AdminGuideListingStatusBadge";
import { AdminGuideBookingStatusBadge } from "@/components/admin/guide/AdminGuideBookingStatusBadge";

type Host = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  isBlocked: boolean;
};

type BookingRow = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: unknown;
  createdAt: string;
  guest: { first_name: string; last_name: string; phone: string; email: string } | null;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  languages: string[];
  pricePerHour: unknown;
  minHours: number;
  maxHours: number;
  maxGroupSize: number;
  images: string[];
  meetingPoint: string | null;
  status: string;
  verificationNote: string | null;
  rating: number;
  totalBookings: number;
  createdAt: string;
  host: Host;
  bookings: BookingRow[];
};

type ActionKind = "approve" | "inactive" | "reject" | "block" | null;

const STATUS_FOR: Record<Exclude<ActionKind, null>, string> = {
  approve: "ACTIVE",
  inactive: "INACTIVE",
  reject: "REJECTED",
  block: "BLOCKED",
};

export default function AdminGuideListingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/guide/listings/${params.id}`);
      const json = await res.json();
      if (res.ok) setListing(json.listing ?? null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const recentBookings = useMemo(() => {
    if (!listing?.bookings) return [];
    return [...listing.bookings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [listing?.bookings]);

  const langBadges = useMemo(() => {
    if (!listing) return [];
    const s = new Set<string>([...(listing.languages ?? []), listing.language].filter(Boolean));
    return Array.from(s);
  }, [listing]);

  async function applyAction() {
    if (!listing || !action) return;
    const next = STATUS_FOR[action];
    if ((action === "reject" || action === "block") && !note.trim()) {
      toast.error("Izoh majburiy");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guide/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      setAction(null);
      setNote("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-slate-400 font-bold bg-white">
        Yuklanmoqda...
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-red-600 font-bold bg-white">
        Listing topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/guide/listings"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{listing.title}</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">ID: {listing.id}</p>
            <div className="mt-3">
              <AdminGuideListingStatusBadge status={listing.status} large />
            </div>
          </div>
        </div>
      </div>

      {listing.verificationNote ? (
        <div className="adm-card border-none shadow-xl bg-amber-50/80 border border-amber-100 p-4 text-sm">
          <div className="text-xs font-black text-amber-800 uppercase">Oldingi admin izohi</div>
          <p className="mt-1 font-bold text-amber-950 whitespace-pre-wrap">{listing.verificationNote}</p>
        </div>
      ) : null}

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Listing</span>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <p className="text-slate-700 whitespace-pre-wrap">{listing.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Kategoriya</div>
              <div className="font-black text-slate-900 mt-1">{listing.category}</div>
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Narx/soat</div>
              <div className="font-black text-slate-900 mt-1">
                {Number(listing.pricePerHour).toLocaleString()} {"so'm"}
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Min / max soat</div>
              <div className="font-black text-slate-900 mt-1">
                {listing.minHours} — {listing.maxHours}
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Maks guruh</div>
              <div className="font-black text-slate-900 mt-1">{listing.maxGroupSize}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-black text-slate-400 uppercase">Tillar</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {langBadges.map((l) => (
                  <span key={l} className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs font-black text-slate-400 uppercase">Uchrashuv nuqtasi</div>
              <div className="font-bold text-slate-800 mt-1">{listing.meetingPoint || "—"}</div>
            </div>
          </div>
          {listing.images?.length ? (
            <div>
              <div className="text-xs font-black text-slate-400 uppercase mb-2">Rasmlar</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {listing.images.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary listing URLs
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="w-40 h-28 shrink-0 rounded-xl object-cover bg-slate-100 border border-slate-200"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Guide</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Ism</div>
            <div className="font-black text-slate-900 mt-1">
              {listing.host.first_name} {listing.host.last_name}
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Email / telefon</div>
            <div className="font-bold text-slate-700 mt-1 text-xs">{listing.host.email}</div>
            <div className="font-bold text-slate-700 text-xs">{listing.host.phone}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Reyting</div>
            <div className="font-black text-slate-900 mt-1">{Number(listing.rating).toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Jami bronlar (listing)</div>
            <div className="font-black text-slate-900 mt-1">{listing.totalBookings}</div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Tasdiq va moderatsiya</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setNote(""); setAction("approve"); }}>
              Tasdiqlash
            </button>
            <button type="button" className="adm-btn" onClick={() => { setNote(""); setAction("inactive"); }}>
              Nofaol
            </button>
            <button type="button" className="adm-btn bg-rose-50 text-rose-800 border-rose-200" onClick={() => { setNote(""); setAction("reject"); }}>
              Rad etish
            </button>
            <button
              type="button"
              className="adm-btn bg-red-950 text-white border-red-950 hover:opacity-90"
              onClick={() => { setNote(""); setAction("block"); }}
            >
              Bloklash
            </button>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"So'nggi bronlar (10)"}</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz</th>
                <th>Sana / vaqt</th>
                <th>Soatlar</th>
                <th>Guruh</th>
                <th>Jami</th>
                <th className="pr-8">Holat</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    {"Bronlar yo'q"}
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "—"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-600">
                      {formatDateTime(b.date)} {b.startTime}–{b.endTime}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{b.hours}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{b.groupSize}</td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(b.totalPrice).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 pr-8">
                      <AdminGuideBookingStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!action}
        title={
          action === "approve"
            ? "Listingni tasdiqlash"
            : action === "inactive"
              ? "Nofaol qilish"
              : action === "reject"
                ? "Rad etish"
                : action === "block"
                  ? "Bloklash"
                  : ""
        }
        description={
          action === "approve"
            ? "Listing ACTIVE holatiga o'tkaziladi."
            : action === "inactive"
              ? "Listing INACTIVE (nofaol) qilinadi."
              : action === "reject"
                ? "Listing REJECTED holatiga o'tkaziladi. Izoh majburiy."
                : action === "block"
                  ? "Listing BLOCKED holatiga o'tkaziladi. Izoh majburiy."
                  : ""
        }
        subjectName={listing.title}
        confirmLoading={saving}
        confirmDanger={action === "reject" || action === "block"}
        onCancel={() => {
          setAction(null);
          setNote("");
        }}
        onConfirm={() => void applyAction()}
      >
        {action === "reject" || action === "block" ? (
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">Izoh (majburiy)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="h-input min-h-[100px] w-full mt-1" />
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
