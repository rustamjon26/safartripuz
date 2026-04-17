"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import ImageListInput from "@/app/homestay-partner/_components/ImageListInput";

const CATEGORIES = ["CITY_TOUR", "NATURE", "HISTORY", "ADVENTURE", "FOOD", "CUSTOM"] as const;
const LANGUAGES = ["uz", "ru", "en", "tr", "de", "fr", "ar"];

type ListingData = {
  id?: string;
  title: string;
  description: string;
  category: (typeof CATEGORIES)[number];
  languages: string[];
  pricePerHour: number;
  minHours: number;
  maxHours: number;
  maxGroupSize: number;
  meetingPoint: string;
  images: string[];
  region?: string;
  duration?: string;
};

export default function GuideListingForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ListingData;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ListingData>(
    initial ?? {
      title: "",
      description: "",
      category: "CITY_TOUR",
      languages: [],
      pricePerHour: 0,
      minHours: 1,
      maxHours: 8,
      maxGroupSize: 2,
      meetingPoint: "",
      images: [],
      region: "",
      duration: "",
    },
  );

  const title = useMemo(
    () => (mode === "create" ? "Yangi guide listing" : "Guide listingni tahrirlash"),
    [mode],
  );

  function toggleLanguage(lang: string) {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint =
        mode === "create" ? "/api/guide/partner/listings" : `/api/guide/partner/listings/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Saqlashda xatolik");
      }
      toast.success(mode === "create" ? "Listing yaratildi" : "Listing yangilandi");
      router.push("/guide-partner/listings");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">{title}</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Guide panel listing formasi</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ListingData["category"] })} className="h-input">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </Field>
          <Field label="Price / hour">
            <input type="number" min={0} value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Max group size">
            <input type="number" min={1} value={form.maxGroupSize} onChange={(e) => setForm({ ...form, maxGroupSize: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Min hours">
            <input type="number" min={1} value={form.minHours} onChange={(e) => setForm({ ...form, minHours: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Max hours">
            <input type="number" min={1} value={form.maxHours} onChange={(e) => setForm({ ...form, maxHours: Number(e.target.value) })} required className="h-input" />
          </Field>
        </div>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="h-input min-h-[110px]" />
        </Field>

        <Field label="Meeting point">
          <textarea value={form.meetingPoint} onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })} required className="h-input min-h-[90px]" />
        </Field>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Languages</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                type="button"
                key={lang}
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                  form.languages.includes(lang)
                    ? "bg-[var(--bg-light-blue)] text-[var(--accent)] border-[var(--accent)]/30"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Image URLs</label>
          <ImageListInput
            images={form.images}
            onChange={(nextImages) => setForm((prev) => ({ ...prev, images: nextImages }))}
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === "create" ? "Create listing" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.push("/guide-partner/listings")} className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">{label}</label>
      {children}
    </div>
  );
}
