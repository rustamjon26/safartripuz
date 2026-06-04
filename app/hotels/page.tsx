"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { MapPin, Star, Loader2, Search, ChevronRight } from "lucide-react";
import { formatUzInteger } from "@/lib/displayHelpers";
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

const inputCls =
  "bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50 [color-scheme:dark]";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );
}

function HotelCard({
  hotel: h,
  city,
  checkIn,
  checkOut,
}: {
  hotel: HotelRow;
  city: string;
  checkIn: string;
  checkOut: string;
}) {
  const nights =
    checkIn && checkOut
      ? Math.max(0, Math.ceil((+new Date(checkOut) - +new Date(checkIn)) / 86400000))
      : 1;

  return (
    <div className="group bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm shadow-slate-900/20 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50 flex flex-col">
      <div className="relative h-52 bg-slate-900 overflow-hidden">
        {h.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={h.imageUrl}
            alt={h.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl">🏨</span>
            <span className="text-slate-600 text-xs font-bold">{h.city}</span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-amber-400 text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
          {"★".repeat(Math.min(h.stars || 3, 5))}
        </div>

        {h.rating != null && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            {h.rating.toFixed(1)}
            <span className="text-slate-400">({h.reviewCount || 0})</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-black text-white text-sm leading-tight mb-1 line-clamp-2">{h.name}</h3>
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
          <MapPin size={11} /> {h.city || "—"}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-black text-amber-400">{formatUzInteger(h.nightlyPrice)}</span>
            <span className="text-xs text-slate-500 ml-1">so&apos;m / tun</span>
            {nights > 1 && (
              <p className="text-[10px] text-slate-600 mt-0.5">
                {nights} tun = {formatUzInteger(h.nightlyPrice * nights)} so&apos;m
              </p>
            )}
          </div>
          <Link
            href={loginWithNext(`/trip-builder?dest=${encodeURIComponent(h.city || city || "zomin")}`)}
            className="bg-amber-500 hover:bg-amber-400 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            Tanlash <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function HotelsSearchInner() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guests = searchParams.get("guests") ?? "2";

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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      <section className="relative bg-slate-900 pt-20 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
            🏨 Premium Mehmonxonalar
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Eng yaxshi <span className="text-amber-400">mehmonxonalar</span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mb-8">
            O&apos;zbekiston bo&apos;ylab 4-5 yulduzli mehmonxonalar. Qulay narxlar, onlayn bron.
          </p>

          <form action="/hotels" method="get" className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 flex flex-wrap gap-2 max-w-3xl backdrop-blur-sm">
            <input
              name="city"
              defaultValue={city}
              placeholder="🏙️ Shahar (Samarqand, Buxoro...)"
              className="flex-1 min-w-[150px] bg-transparent text-white placeholder:text-slate-500 text-sm font-medium outline-none px-3 py-2"
            />
            <input type="date" name="checkIn" defaultValue={checkIn} className={inputCls} aria-label="Kirish" />
            <input type="date" name="checkOut" defaultValue={checkOut} className={inputCls} aria-label="Chiqish" />
            <input
              type="number"
              name="guests"
              min={1}
              defaultValue={guests}
              placeholder="Mehmonlar"
              className="w-28 bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
            >
              <Search size={16} /> Qidirish
            </button>
          </form>
        </div>
      </section>

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        {!loading && items.length > 0 && (
          <p className="text-slate-500 text-sm mb-6">
            <span className="text-white font-bold">{items.length}</span> ta mehmonxona topildi
            {city ? (
              <>
                {" "}
                · <span className="text-amber-400">{city}</span>
              </>
            ) : null}
          </p>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="h-52 bg-slate-700/50" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-700/50 rounded w-3/4" />
                  <div className="h-3 bg-slate-700/50 rounded w-1/3" />
                  <div className="flex justify-between mt-4">
                    <div className="h-6 bg-slate-700/50 rounded w-1/3" />
                    <div className="h-8 bg-slate-700/50 rounded-xl w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 text-red-400 font-semibold text-sm">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="font-black text-white text-lg mb-2">Natija topilmadi</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-6">Boshqa filtr yoki shaharni sinab ko&apos;ring</p>
            <Link
              href={loginWithNext("/trip-builder")}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              Safar Tuzish →
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((h) => (
              <HotelCard key={h.id} hotel={h} city={city} checkIn={checkIn} checkOut={checkOut} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function HotelsSearchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HotelsSearchInner />
    </Suspense>
  );
}
