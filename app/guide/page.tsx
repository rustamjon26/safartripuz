"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Search, SlidersHorizontal, Star, UserCircle } from "lucide-react";
import {
  formatPricePerUnit,
  formatUzInteger,
  guideCategoryLabel,
  languageLabel,
} from "@/lib/displayHelpers";

type GuideItem = {
  id: string;
  title: string;
  images: string[];
  category: string;
  languages: string[];
  pricePerHour: number;
  avgRating: number | null;
  reviewCount: number;
  rating: number;
  host?: { first_name: string; last_name: string } | null;
};

const CATEGORY_OPTIONS = ["CITY_TOUR", "NATURE", "HISTORY", "ADVENTURE", "FOOD", "CUSTOM"];
const LANGUAGE_OPTIONS = ["uz", "ru", "en", "tr", "de", "fr", "ar"];

const inputCls =
  "bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50 [color-scheme:dark]";

export default function GuideSearchPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GuideItem[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState({
    city: "",
    category: "",
    language: "",
    date: "",
    minPrice: 0,
    maxPrice: 1_000_000,
    page: 1,
    limit: 12,
    languages: [] as string[],
    groupSize: 2,
  });

  async function runSearch(patch?: Partial<typeof query>) {
    const q = { ...query, ...patch };
    setQuery(q);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.city) params.set("city", q.city);
      if (q.category) params.set("category", q.category);
      if (q.language) params.set("language", q.language);
      if (q.date) params.set("date", q.date);
      if (q.minPrice) params.set("minPrice", String(q.minPrice));
      if (q.maxPrice) params.set("maxPrice", String(q.maxPrice));
      params.set("page", String(q.page));
      params.set("limit", String(q.limit));

      const res = await fetch(`/api/guide?${params.toString()}`);
      const json = await res.json();
      const apiItems = (json?.data?.data || []) as GuideItem[];

      const filtered = apiItems.filter((item) => {
        if (q.languages.length === 0) return true;
        return q.languages.every((lang) => item.languages?.includes(lang));
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
    const date = sp.get("date");
    if (date) patch.date = date;
    const groupSizeRaw = sp.get("groupSize");
    if (groupSizeRaw) patch.groupSize = Math.max(1, Number(groupSizeRaw) || 1);
    void runSearch(Object.keys(patch).length ? patch : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const activeLanguages = useMemo(() => query.languages, [query.languages]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />

      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-12 overflow-hidden">
        <div className="absolute top-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-teal-400 text-xs font-black uppercase tracking-[0.2em] mb-2">
            🧭 Ekskursiya Xizmatlari
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Tajribali <span className="text-amber-400">Gidlar</span>
          </h1>
          <p className="text-slate-400 text-base max-w-xl mb-8">
            O&apos;zbekiston tarixi, madaniyati va tabiatini mahalliy ekspertlar bilan kashf eting.
          </p>

          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 flex flex-wrap gap-2 max-w-4xl backdrop-blur-sm">
            <input
              value={query.city}
              onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
              placeholder="📍 Shahar"
              className="flex-1 min-w-[120px] bg-transparent text-white placeholder:text-slate-500 px-3 py-2 text-sm outline-none"
            />
            <select
              value={query.category}
              onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
              className={inputCls}
            >
              <option value="">Kategoriya</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {guideCategoryLabel(c)}
                </option>
              ))}
            </select>
            <select
              value={query.language}
              onChange={(e) => setQuery((p) => ({ ...p, language: e.target.value }))}
              className={inputCls}
            >
              <option value="">Til</option>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {languageLabel(l)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={query.date}
              onChange={(e) => setQuery((p) => ({ ...p, date: e.target.value }))}
              className={inputCls}
              aria-label="Sana"
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
                    max={2_000_000}
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
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Kategoriya
                  </label>
                  <select
                    value={query.category}
                    onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
                  >
                    <option value="">Barchasi</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {guideCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
                    Tillar
                  </label>
                  <div className="space-y-2">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <label
                        key={lang}
                        className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={activeLanguages.includes(lang)}
                          onChange={(e) =>
                            setQuery((p) => ({
                              ...p,
                              languages: e.target.checked
                                ? [...p.languages, lang]
                                : p.languages.filter((x) => x !== lang),
                            }))
                          }
                          className="accent-amber-500"
                        />
                        <span className="group-hover:text-white transition-colors">{languageLabel(lang)}</span>
                      </label>
                    ))}
                  </div>
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
                  onClick={() => void runSearch({ city: "", category: "", languages: [] })}
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
                    href={`/guide/${item.id}`}
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
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-800">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-500/20 border-2 border-teal-500/30 flex items-center justify-center mb-2">
                            <UserCircle size={40} className="text-teal-400" />
                          </div>
                          <span className="text-slate-500 text-xs">
                            {item.host ? `${item.host.first_name} ${item.host.last_name}` : "Gid"}
                          </span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-teal-500/80 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
                        {guideCategoryLabel(item.category)}
                      </div>

                      {(item.avgRating ?? item.rating) != null && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-white text-xs font-black">
                            {(item.avgRating ?? item.rating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-slate-400 text-xs">({item.reviewCount ?? 0})</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {item.host && (
                        <p className="text-xs text-teal-400 font-bold mb-1">
                          👤 {item.host.first_name} {item.host.last_name}
                        </p>
                      )}
                      <h3 className="font-black text-white text-sm leading-tight mb-2">{item.title}</h3>

                      {(item.languages?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.languages.slice(0, 4).map((l) => (
                            <span
                              key={l}
                              className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-700/50"
                            >
                              {languageLabel(l)}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-black text-amber-400">
                            {formatPricePerUnit(Number(item.pricePerHour), "soat")}
                          </span>
                        </div>
                        <span className="text-amber-400 text-xs font-black bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          Bron →
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
