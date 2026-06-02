"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit3,
  Trash2,
  Users,
  Loader2,
  X,
  CheckCircle,
  Sparkles,
  Image as ImageIcon,
  Wifi,
} from "lucide-react";
import ImageUploader from "@/components/ui/ImageUploader";
import { ROOM_AMENITY_OPTIONS } from "@/lib/hotel/roomTypeSchema";

export type RoomTypeItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  capacity: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
  roomsCount: number;
};

type RoomTypesProps = {
  hotelId: string;
  onBulkCreate?: (roomTypeId: string) => void;
  onChange?: () => void;
};

type FormState = {
  name: string;
  description: string;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  basePrice: 0,
  capacityAdults: 2,
  capacityChildren: 0,
  amenities: [],
  images: [],
  isActive: true,
};

function amenityLabel(id: string) {
  return ROOM_AMENITY_OPTIONS.find((a) => a.id === id)?.label ?? id;
}

function firstImage(images: string[]) {
  return images[0] ?? null;
}

export default function RoomTypes({ hotelId, onBulkCreate, onChange }: RoomTypesProps) {
  const [items, setItems] = useState<RoomTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoomTypeItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => items.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const load = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuklashda xatolik");
      setItems((data.items ?? []) as RoomTypeItem[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item: RoomTypeItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      basePrice: item.basePrice,
      capacityAdults: item.capacityAdults,
      capacityChildren: item.capacityChildren,
      amenities: [...item.amenities],
      images: [...item.images],
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function toggleAmenity(id: string) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter((a) => a !== id)
        : [...prev.amenities, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hotelId) return;
    if (!form.name.trim()) {
      toast.error("Nom majburiy");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        basePrice: form.basePrice,
        capacityAdults: form.capacityAdults,
        capacityChildren: form.capacityChildren,
        amenities: form.amenities,
        images: form.images,
        isActive: form.isActive,
      };

      const url = editing
        ? `/api/hotels/${hotelId}/room-types/${editing.id}`
        : `/api/hotels/${hotelId}/room-types`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlashda xatolik");

      toast.success(editing ? "Xona turi yangilandi" : "Yangi xona turi qo'shildi");
      closeModal();
      void load();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: RoomTypeItem) {
    if (!confirm(`"${item.name}" turini o'chirishni tasdiqlaysizmi?`)) return;

    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "O'chirib bo'lmadi");
      toast.success("Xona turi o'chirildi");
      void load();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  }

  if (!hotelId) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Xona turini qidirish..."
          className="flex-1 max-w-sm px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--secondary)] transition-colors"
        >
          <Plus size={16} /> Yangi tur qo&apos;shish
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm font-bold uppercase tracking-wider">Yuklanmoqda...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <ImageIcon size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-semibold">Xona turlari topilmadi</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 text-[var(--accent)] font-bold text-sm hover:underline"
          >
            Birinchi turini yarating
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const cover = firstImage(item.images);
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="relative h-40 bg-slate-100">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={40} />
                    </div>
                  )}
                  {!item.isActive && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-black uppercase">
                      Nofaol
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-black text-[var(--primary)]">{item.name}</h3>
                  {item.description && (
                    <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-[13px] font-bold text-slate-700">
                    <span className="text-[var(--accent)]">
                      {item.basePrice.toLocaleString("uz-UZ")} so&apos;m
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-slate-400" />
                      {item.capacity} kishi
                    </span>
                  </div>

                  {item.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.amenities.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-600"
                        >
                          <Wifi size={10} className="opacity-50" />
                          {amenityLabel(a)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-2 text-[11px] text-slate-400 font-semibold">
                    {item.roomsCount} ta jismoniy xona
                  </p>

                  <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-600 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                    >
                      <Edit3 size={14} /> Tahrirlash
                    </button>
                    <button
                      type="button"
                      onClick={() => onBulkCreate?.(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-light-blue)] text-[12px] font-bold text-[var(--secondary)] hover:bg-[var(--accent)]/10 transition-colors"
                    >
                      <Sparkles size={14} /> Bulk xona yaratish →
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-100 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeModal} aria-hidden />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--primary)]">
                  {editing ? "Xona turini tahrirlash" : "Yangi xona turi"}
                </h3>
                <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                    Nom
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[14px] outline-none focus:border-[var(--accent)]"
                    placeholder="Standart, Lyuks, Suite..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                      Narx (so&apos;m / tun)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.basePrice || ""}
                      onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-black text-[15px] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                      Sig&apos;im (katta)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.capacityAdults}
                      onChange={(e) =>
                        setForm({ ...form, capacityAdults: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-black text-[15px] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                    Tavsif
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[var(--accent)] min-h-[72px]"
                    placeholder="Xona haqida qisqacha..."
                  />
                </div>

                <div>
                  <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-3 block">
                    Qulayliklar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOM_AMENITY_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-[13px] font-semibold transition-colors ${
                          form.amenities.includes(opt.id)
                            ? "border-[var(--accent)] bg-[var(--bg-light-blue)] text-[var(--primary)]"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-slate-300"
                          checked={form.amenities.includes(opt.id)}
                          onChange={() => toggleAmenity(opt.id)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ImageIcon size={14} /> Rasmlar
                  </label>
                  <ImageUploader
                    value={form.images}
                    onChange={(urls) => setForm({ ...form, images: urls })}
                    maxImages={15}
                    compact
                  />
                </div>

                <label className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span className="text-[13px] font-bold text-slate-700">Faol (bron qabul qiladi)</span>
                </label>
              </form>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-slate-100 text-[13px] font-bold text-slate-600 rounded-xl hover:bg-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-xl hover:bg-[var(--secondary)] flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
