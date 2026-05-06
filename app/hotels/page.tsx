"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { MapPin, Star, Loader2 } from "lucide-react";
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
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Mehmonxonalar</h1>
            <p className="text-sm text-slate-600 mt-1">
              {city ? (
                <>
                  <span className="font-bold">{city}</span>
                  {checkIn && checkOut ? (
                    <>
                      {" "}
                      · {checkIn} — {checkOut}
                    </>
                  ) : null}
                  {guests ? (
                    <>
                      {" "}
                      · {guests} mehmon
                    </>
                  ) : null}
                </>
              ) : (
                "Shahar, sanalar va mehmonlar soni bo'yicha qidiring."
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
              <p className="font-bold text-slate-800 mb-2">Natija topilmadi</p>
              <p className="text-sm mb-4">Boshqa sanalar yoki shaharni sinab ko&apos;ring.</p>
              <Link href={loginWithNext("/trip-builder")} className="inline-flex font-black text-teal-700 underline">
                Safar tuzishga o&apos;tish
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {items.map((h) => (
                <div
                  key={h.id}
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col"
                >
                  <div className="h-44 bg-slate-200 relative">
                    {h.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-black text-slate-900 leading-tight">{h.name}</h2>
                      <div className="flex items-center gap-0.5 text-amber-600 text-sm font-black shrink-0">
                        <Star size={14} fill="currentColor" />
                        {h.rating != null ? h.rating.toFixed(1) : "—"}
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <MapPin size={12} />
                      {h.city || "—"} · {h.stars}★
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-auto">
                      {formatUzInteger(h.nightlyPrice)} so&apos;m / tun
                    </p>
                    <Link
                      href={loginWithNext(
                        `/trip-builder?dest=${encodeURIComponent(h.city || city || "zomin")}`,
                      )}
                      className="mt-2 inline-flex justify-center rounded-xl bg-slate-900 text-white text-sm font-black py-2.5 hover:bg-slate-800"
                    >
                      Safarga qo&apos;shish
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function HotelsSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <HotelsSearchInner />
    </Suspense>
  );
}
