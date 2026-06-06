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

      {/* Hero */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/70 to-slate-900/90" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">
            🏡 Uy Mehmonxonalar
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4 max-w-2xl">
            Mahalliy uylarda <span className="text-orange-400">autentik</span> dam oling
          </h1>
          <p className="text-slate-300 text-base max-w-xl mb-10 leading-relaxed">
            O&apos;zbek oilalari mehmondorchiligi, qulay uylar va haqiqiy mahalliy tajriba — barchasi bir joyda.
          </p>

          {/* Search form */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-1">
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
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors h-full min-h-[46px]"
              >
                <Search size={16} /> Qidirish
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16 w-full -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
          <aside className="lg:w-[280px] shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-24 space-y-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-orange-500" />
                Filtrlar
              </h3>

              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
                className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:border-orange-400 transition-colors"
              >
                {filtersOpen ? "Yopish" : "Filtrlarni ko'rsatish"}
              </button>

              <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-6`}>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
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
                  <div className="flex justify-between text-xs text-orange-500 font-bold mt-2">
                    <span>0</span>
                    <span>{formatUzInteger(query.maxPrice)} so&apos;m</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
                    Qulayliklar
                  </label>
                  <div className="space-y-2">
                    {amenityOptions.map((a) => (
                      <label
                        key={a}
                        className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer group"
                      >
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
                          className="accent-orange-500 rounded"
                        />
                        <span className="group-hover:text-slate-900 transition-colors font-medium">
                          {amenityEmoji(a)} {a}
                        </span>
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

          {/* Results */}
          <section className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-700">
                {loading ? "Qidirilmoqda..." : `${items.length} ta uy topildi`}
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-black text-slate-900 text-lg mb-2">Natija topilmadi</h3>
                <p className="text-slate-500 text-sm max-w-xs mb-6">
                  Boshqa filtr yoki shaharni sinab ko&apos;ring
                </p>
                <button
                  type="button"
                  onClick={() => void runSearch({ city: "", amenities: [], minRooms: 1 })}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
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
