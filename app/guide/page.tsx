"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SlidersHorizontal, Star } from "lucide-react";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const city = sp.get("city");
    const date = sp.get("date");
    const groupSizeRaw = sp.get("groupSize");
    setQuery((p) => ({
      ...p,
      ...(city ? { city } : {}),
      ...(date ? { date } : {}),
      ...(groupSizeRaw ? { groupSize: Math.max(1, Number(groupSizeRaw) || 1) } : {}),
    }));
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.city) params.set("city", query.city);
      if (query.category) params.set("category", query.category);
      if (query.language) params.set("language", query.language);
      if (query.date) params.set("date", query.date);
      if (query.minPrice) params.set("minPrice", String(query.minPrice));
      if (query.maxPrice) params.set("maxPrice", String(query.maxPrice));
      params.set("page", String(query.page));
      params.set("limit", String(query.limit));

      const res = await fetch(`/api/guide?${params.toString()}`);
      const json = await res.json();
      const apiItems = (json?.data?.data || []) as GuideItem[];

      const filtered = apiItems.filter((item) => {
        if (query.languages.length === 0) return true;
        return query.languages.every((lang) => item.languages?.includes(lang));
      });

      setItems(filtered);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-gray-50">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 py-10 px-4 pt-20">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-white text-3xl font-bold mb-2">Gidlar</h1>
            <p className="text-emerald-100 mb-6">
              O&apos;zbekiston bo&apos;ylab tajribali gidlar bilan sayohat qiling
            </p>
            <div className="bg-white rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-lg">
              <input
                className="flex-1 min-w-[150px] border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500"
                placeholder="Shahar"
                value={query.city}
                onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))}
              />
              <select
                className="flex-1 min-w-[150px] border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500"
                value={query.category}
                onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">Kategoriya</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {guideCategoryLabel(c)}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 min-w-[150px] border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500"
                value={query.language}
                onChange={(e) => setQuery((p) => ({ ...p, language: e.target.value }))}
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
                className="flex-1 min-w-[150px] border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500"
                value={query.date}
                onChange={(e) => setQuery((p) => ({ ...p, date: e.target.value }))}
              />
              <button
                onClick={() => void runSearch()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-medium"
              >
                Qidirish
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <aside className="lg:w-[280px] lg:sticky lg:top-24 h-fit">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <button onClick={() => setFiltersOpen((p) => !p)} className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">
                  <SlidersHorizontal size={16} />
                  Filters
                </button>

                <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-5`}>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Price range</label>
                    <input type="range" min={0} max={2_000_000} step={50_000} value={query.maxPrice} onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))} className="w-full" />
                    <div className="text-xs font-bold text-slate-500 mt-2">
                      0 – {formatUzInteger(query.maxPrice)} so&apos;m
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                    <select value={query.category} onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))} className="h-input">
                      <option value="">All</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {guideCategoryLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Languages</label>
                    <div className="space-y-1.5">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <label key={lang} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={query.languages.includes(lang)}
                            onChange={(e) =>
                              setQuery((p) => ({
                                ...p,
                                languages: e.target.checked
                                  ? [...p.languages, lang]
                                  : p.languages.filter((x) => x !== lang),
                              }))
                            }
                          />
                          {languageLabel(lang)}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => void runSearch()} className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black">
                    Apply filters
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-100 p-4 space-y-3">
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState title="Natija topilmadi" message="Qidiruv bo'yicha mos Guide topilmadi." ctaHref="/guide" ctaLabel="Filterni tozalash" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/guide/${item.id}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition duration-300"
                    >
                      <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden m-3">
                        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-slate-900">{item.title}</h3>
                          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {guideCategoryLabel(item.category)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500">{item.host ? `${item.host.first_name} ${item.host.last_name}` : "Guide"}</p>
                        <div className="flex flex-wrap gap-1">
                          {(item.languages || []).slice(0, 4).map((l) => (
                            <span
                              key={l}
                              className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200"
                            >
                              {languageLabel(l)}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-black text-emerald-600">
                            {formatPricePerUnit(Number(item.pricePerHour), "soat")}
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-yellow-500">
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
