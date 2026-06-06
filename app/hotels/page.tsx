"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ServiceCard, { ServiceCardSkeleton } from "@/components/ui/ServiceCard";
import { MapPin, Calendar, Users, Search, Building2 } from "lucide-react";
import { loginWithNext } from "@/lib/authLinks";

type HotelRow = {
  id: string;
  name: string;
  city: string;
  stars: number;
  nightlyPrice: number;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
};

const fieldCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 [color-scheme:light]";

function HotelsSearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const city = searchParams.get("city") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = searchParams.get("guests") ?? "2";

  const [cityInput, setCityInput] = useState(city);
  const [checkInInput, setCheckInInput] = useState(checkIn);
  const [checkOutInput, setCheckOutInput] = useState(checkOut);
  const [guestsInput, setGuestsInput] = useState(guests);

  const [items, setItems] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (checkIn) p.set("checkIn", checkIn);
    if (checkOut) p.set("checkOut", checkOut);
    if (guests) p.set("guests", guests);
    p.set("limit", "24");
    return p.toString();
  }, [city, checkIn, checkOut, guests]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hotels?${qs}`);
        const json = (await res.json()) as {
          success?: boolean;
          data?: { data?: HotelRow[] };
          message?: string;
        };
        if (!res.ok || json.success === false) {
          throw new Error(json.message || "Xatolik");
        }
        const rows = json.data?.data ?? [];
        if (!cancelled) setItems(rows);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Xatolik");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  function applySearch() {
    const p = new URLSearchParams();
    if (cityInput) p.set("city", cityInput);
    if (checkInInput) p.set("checkIn", checkInInput);
    if (checkOutInput) p.set("checkOut", checkOutInput);
    if (guestsInput) p.set("guests", guestsInput);
    router.push(`/hotels?${p.toString()}`);
  }

  function nightsFor() {
    return checkIn && checkOut
      ? Math.max(0, Math.ceil((+new Date(checkOut) - +new Date(checkIn)) / 86400000))
      : 1;
  }
  const nights = nightsFor();

  return (
    <DashboardShell title="Mehmonxonalar" subtitle="O'zbekiston bo'ylab eng yaxshi mehmonxonalar">
      {/* Search bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Shahar"
              className={`${fieldCls} pl-10`}
            />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={checkInInput}
              onChange={(e) => setCheckInInput(e.target.value)}
              className={`${fieldCls} pl-10`}
            />
          </div>
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={checkOutInput}
              onChange={(e) => setCheckOutInput(e.target.value)}
              className={`${fieldCls} pl-10`}
            />
          </div>
          <div className="relative">
            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={1}
              value={guestsInput}
              onChange={(e) => setGuestsInput(e.target.value)}
              placeholder="Mehmonlar"
              className={`${fieldCls} pl-10`}
            />
          </div>
          <button
            type="button"
            onClick={applySearch}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Search size={16} /> Qidirish
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-700 mb-6">
        {loading
          ? "Qidirilmoqda..."
          : `${items.length} ta mehmonxona topildi${city ? ` · ${city}` : ""}`}
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-600 font-semibold text-sm">
          ⚠️ {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <Search size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 text-lg mb-2">Natija topilmadi</h3>
          <p className="text-slate-500 text-sm mb-4">Boshqa filtr yoki shaharni sinab ko&apos;ring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((h) => (
            <ServiceCard
              key={h.id}
              onClick={() =>
                router.push(
                  loginWithNext(`/trip-builder?dest=${encodeURIComponent(h.city || city || "zomin")}`),
                )
              }
              title={h.name}
              image={h.imageUrl}
              placeholderIcon={Building2}
              city={h.city}
              subtitle={nights > 1 ? `${nights} tun` : undefined}
              price={h.nightlyPrice}
              priceUnit="so'm/kecha"
              rating={h.rating}
              ratingCount={h.reviewCount}
              starCount={h.stars}
              actionLabel="Tanlash →"
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

export default function HotelsSearchPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Mehmonxonalar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        </DashboardShell>
      }
    >
      <HotelsSearchInner />
    </Suspense>
  );
}
