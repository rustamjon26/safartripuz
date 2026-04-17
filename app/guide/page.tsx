"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, SlidersHorizontal, Star } from "lucide-react";

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
  });

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
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input value={query.city} onChange={(e) => setQuery((p) => ({ ...p, city: e.target.value }))} placeholder="City" className="h-input" />
              <select value={query.category} onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))} className="h-input">
                <option value="">Category</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={query.language} onChange={(e) => setQuery((p) => ({ ...p, language: e.target.value }))} className="h-input">
                <option value="">Language</option>
                {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
              <input type="date" value={query.date} onChange={(e) => setQuery((p) => ({ ...p, date: e.target.value }))} className="h-input" />
              <button onClick={() => void runSearch()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800">
                <Search size={16} />
                Search
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-[280px]">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                <button onClick={() => setFiltersOpen((p) => !p)} className="w-full lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">
                  <SlidersHorizontal size={16} />
                  Filters
                </button>

                <div className={`${filtersOpen ? "block" : "hidden"} lg:block space-y-5`}>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Price range</label>
                    <input type="range" min={0} max={2_000_000} step={50_000} value={query.maxPrice} onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))} className="w-full" />
                    <div className="text-xs font-bold text-slate-500 mt-2">0 - {query.maxPrice.toLocaleString()} UZS</div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                    <select value={query.category} onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))} className="h-input">
                      <option value="">All</option>
                      {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
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
                          {lang.toUpperCase()}
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
                <EmptyState title="Natija topilmadi" message="Qidiruv bo'yicha mos Guide topilmadi." ctaHref="/guide" ctaLabel="Filterni tozalash" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {items.map((item) => (
                    <Link key={item.id} href={`/guide/${item.id}`} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition">
                      <div className="h-48 bg-slate-100">
                        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-slate-900">{item.title}</h3>
                          <span className="text-[10px] font-black px-2 py-1 rounded border bg-slate-100 border-slate-200">{item.category}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-500">{item.host ? `${item.host.first_name} ${item.host.last_name}` : "Guide"}</p>
                        <div className="flex flex-wrap gap-1">
                          {(item.languages || []).slice(0, 4).map((l) => (
                            <span key={l} className="text-[10px] font-black px-2 py-1 rounded border bg-blue-50 text-blue-700 border-blue-200">{l.toUpperCase()}</span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-black text-slate-900">
                            {Number(item.pricePerHour).toLocaleString()}
                            <span className="text-xs font-bold text-slate-500 ml-1">/ hour</span>
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
