"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import ImageUploader from "@/components/ui/ImageUploader";
import LocationPicker from "@/components/ui/LocationPicker";

const AMENITIES = [
  { key: "wifi", label: "WiFi" },
  { key: "parking", label: "Avtoturargoh" },
  { key: "kitchen", label: "Oshxona" },
  { key: "ac", label: "Konditsioner" },
  { key: "tv", label: "Televizor" },
  { key: "washing_machine", label: "Kir yuvish mashinasi" },
  { key: "pool", label: "Basseyn" },
  { key: "bbq", label: "Mangal (BBQ)" },
];

export type ListingData = {
  id?: string;
  title: string;
  description: string;
  address: string;
  city: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  pricePerNight: number;
  maxGuests: number;
  rooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
};

const EMPTY_LISTING: ListingData = {
  title: "",
  description: "",
  address: "",
  city: "",
  region: "",
  latitude: null,
  longitude: null,
  pricePerNight: 0,
  maxGuests: 1,
  rooms: 1,
  beds: 1,
  bathrooms: 1,
  amenities: [],
  images: [],
};

export default function ListingForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: ListingData;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [form, setForm] = useState<ListingData>(initial ?? EMPTY_LISTING);

  const title = useMemo(
    () => (mode === "create" ? "Yangi listing qo'shish" : "Listing ma'lumotini yangilash"),
    [mode],
  );

  function toggleAmenity(item: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(item)
        ? prev.amenities.filter((a) => a !== item)
        : [...prev.amenities, item],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.latitude === null || form.longitude === null) {
      toast.error("Iltimos, xaritadan joyni tanlang");
      return;
    }
    setSaving(true);
    try {
      const endpoint =
        mode === "create" ? "/api/homestay/host/listings" : `/api/homestay/host/listings/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const cleanImages = images.filter((url) => url && url.trim() !== "");
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          images: cleanImages,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Saqlashda xatolik yuz berdi");
      }
      toast.success(mode === "create" ? "Listing muvaffaqiyatli yaratildi" : "Listing muvaffaqiyatli yangilandi");
      router.push("/homestay-partner/listings");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi, qayta urinib ko'ring");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">{title}</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Uy mehmonxonasi ma&apos;lumotlarini to&apos;ldiring</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sarlavha">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Shahar">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Manzil">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Viloyat">
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required className="h-input" />
          </Field>
          <Field label="1 tun narxi (so'm)">
            <input type="number" min={0} value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Maksimal mehmonlar soni">
            <input type="number" min={1} value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Xonalar soni">
            <input type="number" min={1} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Karavotlar soni">
            <input type="number" min={1} value={form.beds} onChange={(e) => setForm({ ...form, beds: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Hammomlar soni">
            <input type="number" min={1} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} required className="h-input" />
          </Field>
        </div>

        <Field label="Tavsif">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="h-input min-h-[110px]" />
        </Field>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">
            Lokatsiya (majburiy)
          </label>
          <LocationPicker
            value={{ latitude: form.latitude, longitude: form.longitude }}
            onChange={(v) =>
              setForm((prev) => ({
                ...prev,
                latitude: v.latitude,
                longitude: v.longitude,
              }))
            }
            hint="Bu manzil mehmonlar va taxi xizmatlariga uyni topish uchun ishlatiladi."
          />
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Qulayliklar</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AMENITIES.map((item) => (
              <button
                type="button"
                key={item.key}
                onClick={() => toggleAmenity(item.key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                  form.amenities.includes(item.key)
                    ? "bg-[var(--bg-light-blue)] text-[var(--accent)] border-[var(--accent)]/30"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">
            Rasmlar
          </label>
          <ImageUploader value={images} onChange={setImages} maxImages={20} />
        </div>

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === "create" ? "Listing yaratish" : "O'zgarishlarni saqlash"}
          </button>
          <button type="button" onClick={() => router.push("/homestay-partner/listings")} className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
            Bekor qilish
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
