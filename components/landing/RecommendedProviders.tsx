'use client';

import { useEffect, useState } from 'react';
import { Car, Users } from 'lucide-react';

type TaxiOption = {
  id: string;
  title: string;
  type: string;
  price: number;
};

type GuideOption = {
  id: string;
  title: string;
  language: string;
  pricePerDay: number;
};

type CatalogResponse = {
  taxiOptions: TaxiOption[];
  guides: GuideOption[];
};

export default function RecommendedProviders() {
  const [loading, setLoading] = useState(true);
  const [taxiOptions, setTaxiOptions] = useState<TaxiOption[]>([]);
  const [guides, setGuides] = useState<GuideOption[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/travel/catalog');
        const data = (await res.json()) as CatalogResponse;
        if (!res.ok) throw new Error('Catalog load error');
        setTaxiOptions((data.taxiOptions ?? []).slice(0, 3));
        setGuides((data.guides ?? []).slice(0, 3));
      } catch {
        setTaxiOptions([]);
        setGuides([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <section id="guides" className="container py-14">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 md:text-3xl">
            Tavsiya etilgan Taxi & Gidlar
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Real provider ma&apos;lumotlari asosida yangilanadi.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Car size={18} />
            Taxi xizmatlari
          </div>
          {loading ? (
            <div className="text-sm text-slate-500">Yuklanmoqda...</div>
          ) : taxiOptions.length === 0 ? (
            <div className="text-sm text-slate-500">Hozircha tavsiya etiladigan taxi yo&apos;q.</div>
          ) : (
            <div className="space-y-2">
              {taxiOptions.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm font-bold text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-600">
                    {item.type} • {item.price.toLocaleString()} so&apos;m
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users size={18} />
            Guide listinglar
          </div>
          {loading ? (
            <div className="text-sm text-slate-500">Yuklanmoqda...</div>
          ) : guides.length === 0 ? (
            <div className="text-sm text-slate-500">Hozircha tavsiya etiladigan gid yo&apos;q.</div>
          ) : (
            <div className="space-y-2">
              {guides.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="text-sm font-bold text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-600">
                    {item.language.toUpperCase()} • {item.pricePerDay.toLocaleString()} so&apos;m/kun
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
