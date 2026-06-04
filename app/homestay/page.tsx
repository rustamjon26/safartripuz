"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, SlidersHorizontal, Star, MapPin } from "lucide-react";
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

const inputCls =
  "w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 text-sm outline-none focus:border-amber-500/50 [color-scheme:dark]";

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

function amenityChipIcon(a: string) {
  return AMENITY_ICONS[a] ?? "✓";
}

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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 to-slate-800 pt-20 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(245,158,11,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-2">🏡 Uy Mehmonxonalar</p>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Mahalliy <span className="text-amber-400">uylarida</span> qoling
          </h1>
          <p className="text-slate-400 text-base max-w-xl mb-8">
            O&apos;zbek oilalari uyida autentik tajriba. Wifi, oshxona va ko&apos;p qulayliklar.
          </p>

          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 flex flex-wrap gap-2 max-w-3xl backdrop-blur-sm">
            <input
              value={query.city}
              onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
              placeholder="🏙️ Shahar"
              className="flex-1 min-w-[140px] bg-transparent text-white placeholder:text-slate-500 text-sm font-medium outline-none px-3 py-2"
            />
            <input
              type="date"
              value={query.checkIn}
              onChange={(e) => setQuery((p) => ({ ...p, checkIn: e.target.value }))}
              className="bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none [color-scheme:dark]"
            />
            <input
              type="date"
              value={query.checkOut}
              onChange={(e) => setQuery((p) => ({ ...p, checkOut: e.target.value }))}
              className="bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none [color-scheme:dark]"
            />
            <input
              type="number"
              min={1}
              value={query.guests}
              onChange={(e) => setQuery((p) => ({ ...p, guests: Number(e.target.value) }))}
              placeholder="Mehmonlar"
              className="w-28 bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              className="bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
            >
              <Search size={16} /> Qidirish
            </button>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[260px] shrink-0">
            <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-5 sticky top-24 space-y-6 shadow-sm shadow-slate-900/20">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-amber-400" /> Filtrlar
              </h3>

              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
                className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 text-sm font-bold text-slate-400 bg-slate-900"
              >
                {filtersOpen ? "Yopish" : "Filtrlarni ko'rsatish"}
              </button>

              <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-6`}>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
                    Narx oralig&apos;i
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={5_000_000}
                    step={50_000}
                    value={query.maxPrice}
                    onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-amber-400 font-bold mt-2">
                    <span>0</span>
                    <span>{formatUzInteger(query.maxPrice)} so&apos;m</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
                    Qulayliklar
                  </label>
                  <div className="space-y-2">
                    {amenityOptions.map((a) => (
                      <label
                        key={a}
                        className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer group"
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
                          className="accent-amber-500"
                        />
                        <span className="group-hover:text-white transition-colors">
                          {amenityChipIcon(a)} {a}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Minimal xonalar
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={query.minRooms}
                    onChange={(e) => setQuery((p) => ({ ...p, minRooms: Number(e.target.value) }))}
                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white font-bold text-sm outline-none focus:border-amber-500/50"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void runSearch()}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-3 rounded-xl text-sm transition-all"
                >
                  Filtrlarni qo&apos;llash
                </button>
              </div>
            </div>
          </aside>

          <section className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden animate-pulse"
                  >
                    <div className="h-52 bg-slate-700/50" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-slate-700/50 rounded w-3/4" />
                      <div className="h-3 bg-slate-700/50 rounded w-1/2" />
                      <div className="flex justify-between mt-4">
                        <div className="h-6 bg-slate-700/50 rounded w-1/3" />
                        <div className="h-8 bg-slate-700/50 rounded-xl w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="font-black text-white text-lg mb-2">Natija topilmadi</h3>
                <p className="text-slate-500 text-sm max-w-xs mb-6">Boshqa filtr yoki shaharni sinab ko&apos;ring</p>
                <button
                  type="button"
                  onClick={() => void runSearch({ city: "", amenities: [], minRooms: 1 })}
                  className="bg-amber-500 hover:bg-amber-400 text-white font-black px-5 py-2.5 rounded-xl text-sm"
                >
                  Filterni tozalash
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/homestay/${item.id}`}
                    className="group bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm shadow-slate-900/20 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/50"
                  >
                    <div className="relative h-52 bg-slate-900 overflow-hidden">
                      {item.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <span className="text-6xl">🏡</span>
                          <span className="text-slate-600 text-xs mt-2">{item.city}</span>
                        </div>
                      )}

                      {item.avgRating != null && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-white text-xs font-black">{item.avgRating.toFixed(1)}</span>
                          <span className="text-slate-400 text-xs">({item.reviewCount})</span>
                        </div>
                      )}

                      {item.amenities?.slice(0, 3).length > 0 && (
                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                          {item.amenities.slice(0, 3).map((a) => (
                            <span
                              key={a}
                              className="bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md"
                            >
                              {amenityChipIcon(a)} {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-black text-white text-sm leading-tight mb-1">{item.title}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                        <MapPin size={11} /> {item.city} · {item.rooms} xona
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-black text-amber-400">
                            {Number(item.pricePerNight).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">so&apos;m / tun</span>
                        </div>
                        <span className="text-amber-400 text-xs font-black bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          Ko&apos;rish →
                        </span>
                      </div>
                    </div>
                  </Link>
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
