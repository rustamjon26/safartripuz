"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  guest?: { first_name: string; last_name: string };
};

type Availability = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean };

type GuideDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  meetingPoint: string | null;
  images: string[];
  languages: string[];
  pricePerHour: number;
  maxGroupSize: number;
  rating: number;
  reviewCount?: number;
  guide: {
    id: string;
    name: string;
    avatar: string | null;
    languages: string[];
    rating: number;
    totalBookings: number;
  };
  reviews: Review[];
  blockedSlots: Array<{ date: string }>;
  availabilities: Availability[];
};

type CheckAvailabilityResp = {
  available: boolean;
  totalPrice: number;
  hours: number;
  conflicts?: Array<{ message: string }>;
};

export default function GuideDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<GuideDetail | null>(null);
  const [mainImage, setMainImage] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [groupSize, setGroupSize] = useState(2);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckAvailabilityResp | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/guide/${params.id}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setListing(json.data);
          setMainImage(json.data.images?.[0] || "");
        }
      } finally {
        setLoading(false);
      }
    }
    if (params.id) void load();
  }, [params.id]);

  const blockedSet = useMemo(
    () => new Set((listing?.blockedSlots || []).map((b) => b.date.slice(0, 10))),
    [listing],
  );

  const availableDaySet = useMemo(() => {
    const set = new Set<number>();
    for (const row of listing?.availabilities || []) {
      if (row.isAvailable) set.add(row.dayOfWeek);
    }
    return set;
  }, [listing]);

  function dayColor(iso: string) {
    const day = new Date(iso).getDay();
    if (blockedSet.has(iso)) return "bg-red-100 text-red-700 border-red-300";
    if (!availableDaySet.has(day)) return "bg-slate-200 text-slate-700 border-slate-300";
    return "bg-green-100 text-green-700 border-green-300";
  }

  function daySelectable(iso: string) {
    const day = new Date(iso).getDay();
    return !blockedSet.has(iso) && availableDaySet.has(day);
  }

  const monthCursor = useMemo(() => {
    const d = date ? new Date(date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [date]);

  const daysInGrid = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const startWeekDay = start.getDay();
    const totalDays = end.getDate();
    const list: Array<{ iso: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < startWeekDay; i += 1) list.push({ iso: "", day: 0, inMonth: false });
    for (let d = 1; d <= totalDays; d += 1) {
      const dt = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
      list.push({ iso: dt.toISOString().slice(0, 10), day: d, inMonth: true });
    }
    while (list.length % 7 !== 0) list.push({ iso: "", day: 0, inMonth: false });
    return list;
  }, [monthCursor]);

  const ratingsBreakdown = useMemo(() => {
    const reviews = listing?.reviews || [];
    return [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: reviews.filter((x) => x.rating === r).length,
    }));
  }, [listing]);

  async function checkAvailability() {
    if (!listing || !date) {
      toast.error("Sanani tanlang");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/api/guide/${listing.id}/check-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime, endTime, groupSize }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Tekshirishda xatolik");
      setCheckResult(json.data as CheckAvailabilityResp);
    } catch (err) {
      setCheckResult(null);
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setChecking(false);
    }
  }

  async function bookNow() {
    if (!listing || !date) return;
    if (!checkResult?.available) {
      toast.error("Avval bo&apos;sh vaqtni tekshiring");
      return;
    }
    setBooking(true);
    try {
      const res = await fetch("/api/guide/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          date,
          startTime,
          endTime,
          groupSize,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/guide/${listing.id}`);
        return;
      }
      if (!res.ok || json.success === false) throw new Error(json.error || "Bron qilishda xatolik");
      toast.success("Bron yaratildi");
      router.push("/user/bookings/guide");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading || !listing ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400 font-bold">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="h-[360px] bg-slate-100">{mainImage ? <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" /> : null}</div>
                  <div className="p-3 flex gap-2 overflow-x-auto">
                    {(listing.images || []).map((img) => (
                      <button key={img} onClick={() => setMainImage(img)} className={`w-20 h-16 rounded-lg overflow-hidden border-2 ${mainImage === img ? "border-blue-500" : "border-transparent"}`}>
                        <img src={img} alt={listing.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black text-slate-900">{listing.title}</h1>
                    <span className="text-[10px] font-black px-2 py-1 rounded border bg-slate-100 border-slate-200">{listing.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600">{listing.guide.name.slice(0, 1)}</div>
                    <div>
                      <p className="font-bold text-slate-800">{listing.guide.name}</p>
                      <p className="text-xs text-slate-500">{listing.guide.totalBookings} tours</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-amber-600 font-black">
                      <Star size={14} fill="currentColor" />
                      {Number(listing.guide.rating).toFixed(1)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(listing.guide.languages || listing.languages || []).map((l) => (
                      <span key={l} className="text-[10px] font-black px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">{l.toUpperCase()}</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{listing.description}</p>
                  <p className="text-sm text-slate-600"><b>Meeting point:</b> {listing.meetingPoint || "Guide confirms later"}</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-black text-slate-900 mb-4">Weekly availability (read-only)</h2>
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                      <div key={w} className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center py-1">{w}</div>
                    ))}
                    {daysInGrid.map((d, idx) => (
                      <button key={`${d.iso}-${idx}`} type="button" disabled={!d.inMonth} className={`h-10 rounded-lg border text-xs font-bold ${d.inMonth ? dayColor(d.iso) : "border-transparent bg-transparent text-transparent"}`}>
                        {d.day || ""}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="px-2 py-1 rounded border bg-slate-200 border-slate-300">Gray = unavailable</span>
                    <span className="px-2 py-1 rounded border bg-green-100 border-green-300">Green = available</span>
                    <span className="px-2 py-1 rounded border bg-red-100 border-red-300">Red = booked</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-slate-900">Reviews</h2>
                    <div className="flex items-center gap-1 text-amber-600 font-black">
                      <Star size={14} fill="currentColor" />
                      {Number(listing.rating || 0).toFixed(1)} ({listing.reviews.length})
                    </div>
                  </div>
                  <div className="space-y-2">
                    {ratingsBreakdown.map((r) => (
                      <div key={r.rating} className="flex items-center gap-3">
                        <span className="w-8 text-sm font-bold text-slate-600">{r.rating}★</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-amber-500" style={{ width: `${listing.reviews.length ? (r.count / listing.reviews.length) * 100 : 0}%` }} />
                        </div>
                        <span className="w-8 text-xs text-slate-500 font-bold text-right">{r.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {listing.reviews.map((review) => (
                      <div key={review.id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800">{review.guest ? `${review.guest.first_name} ${review.guest.last_name}` : "Customer"}</p>
                          <p className="text-xs font-black text-amber-600">{review.rating}★</p>
                        </div>
                        {review.comment ? <p className="text-sm text-slate-600 mt-2">{review.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="xl:sticky xl:top-24">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="text-2xl font-black text-slate-900">
                    {Number(listing.pricePerHour).toLocaleString()}
                    <span className="text-xs font-bold text-slate-500 ml-1">UZS / hour</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!daySelectable(next)) {
                            toast.error("Bu kun guide uchun mavjud emas");
                            return;
                          }
                          setDate(next);
                        }}
                        className="h-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Start</label>
                        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-input" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">End</label>
                        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-input" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Group size</label>
                      <input type="number" min={1} max={listing.maxGroupSize} value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} className="h-input" />
                    </div>
                  </div>

                  <button onClick={() => void checkAvailability()} disabled={checking} className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black">
                    {checking ? "Checking..." : "Narx hisoblash"}
                  </button>

                  {checkResult ? (
                    <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${checkResult.available ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                      {checkResult.available ? (
                        <div>
                          <div>Hours: {checkResult.hours}</div>
                          <div>Total: {Number(checkResult.totalPrice).toLocaleString()} UZS</div>
                        </div>
                      ) : (
                        <div>Bu vaqt band{checkResult.conflicts?.[0]?.message ? `: ${checkResult.conflicts[0].message}` : ""}</div>
                      )}
                    </div>
                  ) : null}

                  <button onClick={() => void bookNow()} disabled={booking || !checkResult?.available} className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50">
                    {booking ? "Booking..." : "Bron qilish"}
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
