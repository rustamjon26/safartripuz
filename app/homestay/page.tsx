"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, SlidersHorizontal, Star } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  city: string;
  images: string[];
  pricePerNight: number;
  avgRating: number | null;
  reviewCount: number;
  amenities: string[];
  rooms: number;
};

export default function HomeStaySearchPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Listing[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState({
    city: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
    minPrice: 0,
    maxPrice: 2_000_000,
    page: 1,
    limit: 12,
    minRooms: 1,
    amenities: [] as string[],
  });

  const amenityOptions = ["wifi", "parking", "kitchen", "AC", "TV", "washing machine", "pool", "BBQ"];

  async function runSearch(patch?: Partial<typeof query>) {
    const q = { ...query, ...patch };
    setQuery(q);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.city) params.set("city", q.city);
      if (q.checkIn) params.set("checkIn", q.checkIn);
      if (q.checkOut) params.set("checkOut", q.checkOut);
      if (q.guests) params.set("guests", String(q.guests));
      if (q.minPrice) params.set("minPrice", String(q.minPrice));
      if (q.maxPrice) params.set("maxPrice", String(q.maxPrice));
      params.set("page", String(q.page));
      params.set("limit", String(q.limit));

      const res = await fetch(`/api/homestay?${params.toString()}`);
      const json = await res.json();
      const apiItems = (json?.data?.data || []) as Listing[];

      const filtered = apiItems.filter((item) => {
        const roomPass = item.rooms >= q.minRooms;
        const amenityPass = q.amenities.every((a) => item.amenities.includes(a));
        return roomPass && amenityPass;
      });

      setItems(filtered);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const patch: Partial<typeof query> = {};
    const city = sp.get("city");
    if (city) patch.city = city;
    const checkIn = sp.get("checkIn");
    if (checkIn) patch.checkIn = checkIn;
    const checkOut = sp.get("checkOut");
    if (checkOut) patch.checkOut = checkOut;
    const guestsRaw = sp.get("guests");
    if (guestsRaw) patch.guests = Math.max(1, Number(guestsRaw) || 1);
    void runSearch(Object.keys(patch).length ? patch : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const activeAmenities = useMemo(() => query.amenities, [query.amenities]);

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                value={query.city}
                onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
                placeholder="City"
                className="h-input"
              />
              <input
                type="date"
                value={query.checkIn}
                onChange={(e) => setQuery((p) => ({ ...p, checkIn: e.target.value }))}
                className="h-input"
              />
              <input
                type="date"
                value={query.checkOut}
                onChange={(e) => setQuery((p) => ({ ...p, checkOut: e.target.value }))}
                className="h-input"
              />
              <input
                type="number"
                min={1}
                value={query.guests}
                onChange={(e) => setQuery((p) => ({ ...p, guests: Number(e.target.value) }))}
                className="h-input"
                placeholder="Guests"
              />
              <button
                onClick={() => void runSearch()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800"
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-[280px]">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                <button
                  onClick={() => setFiltersOpen((p) => !p)}
                  className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                >
                  <SlidersHorizontal size={16} />
                  Filters
                </button>

                <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-5`}>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Price range
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={5_000_000}
                      step={50_000}
                      value={query.maxPrice}
                      onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="text-xs font-bold text-slate-500 mt-2">
                      0 - {query.maxPrice.toLocaleString()} UZS
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Amenities
                    </label>
                    <div className="space-y-1.5">
                      {amenityOptions.map((a) => (
                        <label key={a} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={activeAmenities.includes(a)}
                            onChange={(e) =>
                              setQuery((p) => ({
                                ...p,
                                amenities: e.target.checked
                                  ? [...p.amenities, a]
                                  : p.amenities.filter((x) => x !== a),
                              }))
                            }
                          />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Min rooms
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={query.minRooms}
                      onChange={(e) => setQuery((p) => ({ ...p, minRooms: Number(e.target.value) }))}
                      className="h-input"
                    />
                  </div>

                  <button
                    onClick={() => void runSearch()}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-4 space-y-3">
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="Natija topilmadi"
                  message="Qidiruv bo'yicha mos HomeStay topilmadi."
                  ctaHref="/homestay"
                  ctaLabel="Filterni tozalash"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/homestay/${item.id}`}
                      className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition"
                    >
                      <div className="h-48 bg-slate-100">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="font-black text-slate-900">{item.title}</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">{item.city}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-lg font-black text-slate-900">
                            {Number(item.pricePerNight).toLocaleString()}
                            <span className="text-xs font-bold text-slate-500 ml-1">/ night</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                            <Star size={14} fill="currentColor" />
                            {item.avgRating?.toFixed(1) ?? "-"} ({item.reviewCount})
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
