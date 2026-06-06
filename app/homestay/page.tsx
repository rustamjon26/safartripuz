"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ServiceCard, { ServiceCardSkeleton } from "@/components/ui/ServiceCard";
import { Search, SlidersHorizontal, MapPin, Calendar, Users } from "lucide-react";
import { formatUzInteger } from "@/lib/displayHelpers";

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

const AMENITY_ICONS: Record<string, string> = {
  wifi: "📶",
  parking: "🚗",
  kitchen: "🍳",
  AC: "❄️",
  TV: "📺",
  pool: "🏊",
  BBQ: "🔥",
  "washing machine": "🫧",
};

function amenityEmoji(a: string) {
  return AMENITY_ICONS[a] ?? "✓";
}

const fieldCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 [color-scheme:light]";

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="relative h-64 bg-gradient-to-r from-slate-900 to-slate-700 rounded-3xl overflow-hidden mb-8">
          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">🏡 SafarTrip</p>
            <h1 className="text-4xl font-black text-white">Uy mehmonxonalar</h1>
            <p className="text-slate-300 text-sm mt-2 max-w-lg">
              Mahalliy uylarda qulay va arzon dam oling
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query.city}
                    onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
                    placeholder="Shahar"
                    className={`${fieldCls} pl-10`}
                  />
                </div>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={query.checkIn}
                    onChange={(e) => setQuery((p) => ({ ...p, checkIn: e.target.value }))}
                    className={`${fieldCls} pl-10`}
                  />
                </div>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={query.checkOut}
                    onChange={(e) => setQuery((p) => ({ ...p, checkOut: e.target.value }))}
                    className={`${fieldCls} pl-10`}
                  />
                </div>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    value={query.guests}
                    onChange={(e) => setQuery((p) => ({ ...p, guests: Number(e.target.value) }))}
                    placeholder="Mehmonlar"
                    className={`${fieldCls} pl-10`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Search size={16} /> Qidirish
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-[280px] shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-orange-500" />
                Filtrlar
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
                className="w-full lg:hidden border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-orange-400 transition-colors"
              >
                {filtersOpen ? "Yopish" : "Filtrlarni ko'rsatish"}
              </button>
              <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-5`}>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Narx oralig&apos;i
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={5_000_000}
                    step={50_000}
                    value={query.maxPrice}
                    onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <p className="text-xs text-orange-500 font-bold mt-1">{formatUzInteger(query.maxPrice)} so&apos;m</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Qulayliklar
                  </label>
                  <div className="space-y-2">
                    {amenityOptions.map((a) => (
                      <label key={a} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
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
                          className="accent-orange-500"
                        />
                        <span className="font-medium">{amenityEmoji(a)} {a}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    Minimal xonalar
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={query.minRooms}
                    onChange={(e) => setQuery((p) => ({ ...p, minRooms: Number(e.target.value) }))}
                    className={fieldCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  className="w-full bg-slate-900 hover:bg-orange-500 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Filtrlarni qo&apos;llash
                </button>
              </div>
            </div>
          </aside>

          <section className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-700 mb-6">
              {loading ? "Qidirilmoqda..." : `${items.length} ta uy topildi`}
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <p className="text-5xl mb-3">🔍</p>
                <h3 className="font-black text-slate-900 text-lg">Natija topilmadi</h3>
                <button
                  type="button"
                  onClick={() => void runSearch({ city: "", amenities: [], minRooms: 1 })}
                  className="mt-4 bg-orange-500 text-white font-bold px-5 py-2 rounded-xl text-sm"
                >
                  Filterni tozalash
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <ServiceCard
                    key={item.id}
                    href={`/homestay/${item.id}`}
                    title={item.title}
                    image={item.images?.[0]}
                    placeholderEmoji="🏡"
                    placeholderGradient="from-emerald-100 via-teal-50 to-slate-100"
                    city={item.city}
                    subtitle={`${item.rooms} xona · HomeStay`}
                    price={item.pricePerNight}
                    priceUnit="so'm/kecha"
                    rating={item.avgRating}
                    ratingCount={item.reviewCount}
                    amenities={item.amenities?.slice(0, 4).map((a) => ({
                      label: a,
                      emoji: amenityEmoji(a),
                    }))}
                    actionLabel="Tanlash →"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
