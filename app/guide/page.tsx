"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, SlidersHorizontal, Star } from "lucide-react";
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
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />

      <main style={{ flex: 1 }} className="bg-slate-50">
        <section className="bg-[#0D2137] pt-24 pb-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5EEAD4]">
              Ekskursiya xizmatlari
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">Gidlar</h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base font-semibold text-slate-300">
              O&apos;zbekiston bo&apos;ylab tajribali gidlar bilan shahar, tarix va tabiat sayohatlarini
              rejalashtiring.
            </p>

            <div className="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  value={query.city}
                  onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Shahar"
                  className="h-input"
                />
                <select
                  value={query.category}
                  onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
                  className="h-input"
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
                  className="h-input"
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
                  className="h-input"
                  aria-label="Sana"
                />
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E7490] text-white text-sm font-black hover:bg-[#0B5C73] transition-colors"
                >
                  <Search size={16} />
                  Qidirish
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-[280px]">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((p) => !p)}
                  className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                >
                  <SlidersHorizontal size={16} />
                  Filtrlar
                </button>

                <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-5`}>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Narx oralig&apos;i
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2_000_000}
                      step={50_000}
                      value={query.maxPrice}
                      onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                      className="w-full accent-[#0E7490]"
                    />
                    <div className="text-xs font-bold text-slate-500 mt-2">
                      0 – {formatUzInteger(query.maxPrice)} so&apos;m
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Kategoriya
                    </label>
                    <select
                      value={query.category}
                      onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
                      className="h-input"
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
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                      Tillar
                    </label>
                    <div className="space-y-1.5">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <label key={lang} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
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
                            className="accent-[#0D2137]"
                          />
                          {languageLabel(lang)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void runSearch()}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] transition-colors"
                  >
                    Filtrlarni qo&apos;llash
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
                  message="Qidiruv bo'yicha mos gid topilmadi."
                  ctaHref="/guide"
                  ctaLabel="Filterni tozalash"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/guide/${item.id}`}
                      className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition"
                    >
                      <div className="h-48 bg-slate-100">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-slate-900 leading-snug">{item.title}</h3>
                          <span className="shrink-0 text-[10px] font-black px-2 py-1 rounded-full bg-[#F0FDFA] text-[#0E7490] border border-[#99F6E4]">
                            {guideCategoryLabel(item.category)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          {item.host
                            ? `${item.host.first_name} ${item.host.last_name}`
                            : "Gid"}
                        </p>
                        {(item.languages?.length ?? 0) > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.languages.slice(0, 4).map((l) => (
                              <span
                                key={l}
                                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                              >
                                {languageLabel(l)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between mt-3">
                          <div className="text-lg font-black text-slate-900">
                            {formatPricePerUnit(Number(item.pricePerHour), "soat")}
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                            <Star size={14} fill="currentColor" />
                            {(item.avgRating ?? item.rating ?? 0).toFixed(1)} ({item.reviewCount ?? 0})
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
