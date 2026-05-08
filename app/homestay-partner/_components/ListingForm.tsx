"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const AMENITIES = ["wifi", "parking", "kitchen", "AC", "TV", "washing machine", "pool", "BBQ"];

type ListingData = {
  id?: string;
  title: string;
  description: string;
  address: string;
  city: string;
  region: string;
  pricePerNight: number;
  maxGuests: number;
  rooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
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
  const [images, setImages] = useState<string[]>(
    initial?.images?.length ? initial.images : [""],
  );
  const [form, setForm] = useState<ListingData>(
    initial ?? {
      title: "",
      description: "",
      address: "",
      city: "",
      region: "",
      pricePerNight: 0,
      maxGuests: 1,
      rooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: [],
      images: initial?.images ?? [],
    },
  );

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

  const addImageUrl = () => {
    setImages([...images, ""]);
  };

  const updateImage = (index: number, value: string) => {
    const updated = [...images];
    updated[index] = value;
    setImages(updated);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint =
        mode === "create" ? "/api/homestay/host/listings" : `/api/homestay/host/listings/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          images: images.filter((url) => url.trim() !== ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Saqlashda xatolik");
      }
      toast.success(mode === "create" ? "Listing yaratildi" : "Listing yangilandi");
      router.push("/homestay-partner/listings");
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
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Host panel uslubida listing formasi</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="h-input" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Region">
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required className="h-input" />
          </Field>
          <Field label="Price / night">
            <input type="number" min={0} value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Max guests">
            <input type="number" min={1} value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Rooms">
            <input type="number" min={1} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Beds">
            <input type="number" min={1} value={form.beds} onChange={(e) => setForm({ ...form, beds: Number(e.target.value) })} required className="h-input" />
          </Field>
          <Field label="Bathrooms">
            <input type="number" min={1} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} required className="h-input" />
          </Field>
        </div>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="h-input min-h-[110px]" />
        </Field>

        <div>
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">Amenities</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AMENITIES.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => toggleAmenity(item)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${
                  form.amenities.includes(item)
                    ? "bg-[var(--bg-light-blue)] text-[var(--accent)] border-[var(--accent)]/30"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Image URLs</label>
            {images.map((url, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => updateImage(index, e.target.value)}
                />
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="text-red-500 px-3 py-2 border rounded-lg hover:bg-red-50"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addImageUrl}
              className="text-emerald-600 border border-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 w-full"
            >
              + Rasm qo&apos;shish
            </button>
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-black hover:bg-[var(--secondary)] flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === "create" ? "Create listing" : "Save changes"}
          </button>
          <button type="button" onClick={() => router.push("/homestay-partner/listings")} className="px-5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">
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
