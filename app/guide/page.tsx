"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ServiceCard, { ServiceCardSkeleton } from "@/components/ui/ServiceCard";
import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import {
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

const fieldCls =
  "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder:text-slate-400 text-sm font-medium outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 [color-scheme:light]";

export default function GuideSearchPage() {
  const router = useRouter();
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
    <DashboardShell title="Gidlar" subtitle="Tajribali mahalliy gidlar bilan sayohat qiling">
      {/* Search bar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
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
          <select
            value={query.category}
            onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
            className={fieldCls}
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
            className={fieldCls}
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
            className={fieldCls}
            aria-label="Sana"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Search size={16} /> Qidirish
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className="lg:w-72 shrink-0">
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
                  max={2_000_000}
                  step={50_000}
                  value={query.maxPrice}
                  onChange={(e) => setQuery((p) => ({ ...p, maxPrice: Number(e.target.value) }))}
                  className="w-full accent-orange-500"
                />
                <p className="text-xs text-orange-500 font-bold mt-1">{formatUzInteger(query.maxPrice)} so&apos;m</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Kategoriya
                </label>
                <select
                  value={query.category}
                  onChange={(e) => setQuery((p) => ({ ...p, category: e.target.value }))}
                  className={fieldCls}
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Tillar
                </label>
                <div className="space-y-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
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
                        className="accent-orange-500"
                      />
                      <span className="font-medium">{languageLabel(lang)}</span>
                    </label>
                  ))}
                </div>
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
          <h2 className="text-xl font-bold text-slate-700 mb-6">
            {loading ? "Qidirilmoqda..." : `${items.length} ta gid topildi`}
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
                onClick={() => void runSearch({ city: "", category: "", languages: [] })}
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
                  onClick={() => router.push(`/guide/${item.id}`)}
                  title={item.title}
                  image={item.images?.[0]}
                  placeholderEmoji="🧭"
                  placeholderGradient="from-violet-100 via-indigo-50 to-slate-100"
                  city={item.host ? `${item.host.first_name} ${item.host.last_name}` : undefined}
                  subtitle={guideCategoryLabel(item.category)}
                  price={item.pricePerHour}
                  priceUnit="so'm/soat"
                  rating={item.avgRating ?? item.rating}
                  ratingCount={item.reviewCount}
                  amenities={item.languages?.slice(0, 4).map((l) => ({ label: languageLabel(l) }))}
                  actionLabel="Bron →"
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
