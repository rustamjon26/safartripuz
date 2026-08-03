"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Car, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  year: number;
  category: "STANDARD" | "COMFORT" | "MINIVAN" | "PREMIUM";
  images: string[];
  isActive: boolean;
};

type Form = {
  id?: string;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  year: number;
  category: "STANDARD" | "COMFORT" | "MINIVAN" | "PREMIUM";
  imagesText: string;
};

const emptyForm: Form = {
  make: "",
  model: "",
  color: "",
  plateNumber: "",
  year: new Date().getFullYear(),
  category: "STANDARD",
  imagesText: "",
};

export default function TaxiVehiclesPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
  }, [searchParams]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/driver/vehicles");
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((v) =>
      `${v.make} ${v.model} ${v.plateNumber} ${v.category}`.toLowerCase().includes(query),
    );
  }, [items, q]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const images = form.imagesText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      const payload = {
        make: form.make,
        model: form.model,
        color: form.color,
        plateNumber: form.plateNumber,
        year: form.year,
        category: form.category,
        images,
      };
      const url = form.id ? `/api/taxi/driver/vehicles/${form.id}` : "/api/taxi/driver/vehicles";
      const method = form.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Xatolik");
      toast.success(form.id ? "Avtomobil yangilandi" : "Avtomobil qo‘shildi");
      setForm(emptyForm);
      setShowForm(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      const res = await fetch(`/api/taxi/driver/vehicles/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Xatolik");
      toast.success("Avtomobil deaktiv qilindi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  function edit(vehicle: Vehicle) {
    setForm({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      plateNumber: vehicle.plateNumber,
      year: vehicle.year,
      category: vehicle.category,
      imagesText: vehicle.images.join("\n"),
    });
    setShowForm(true);
  }

  const activeCount = items.filter((v) => v.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Avtopark boshqaruvi
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Mashinalar, holat va texnik ma&apos;lumotlar
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
            setShowForm(true);
          }}
          className="tp-btn tp-btn-navy"
        >
          <Plus size={14} />
          Yangi mashina
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-white text-rose-500 flex items-center justify-center mb-3">
            <Wrench size={16} />
          </div>
          <p className="text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            Jami transport
          </p>
          <p className="text-[24px] font-display font-bold text-[#111c2d] mt-1">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-white text-sky-600 flex items-center justify-center mb-3">
            <Car size={16} />
          </div>
          <p className="text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            Faol
          </p>
          <p className="text-[24px] font-display font-bold text-[#111c2d] mt-1">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-white text-amber-600 flex items-center justify-center mb-3">
            <Car size={16} />
          </div>
          <p className="text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            Nofaol
          </p>
          <p className="text-[24px] font-display font-bold text-[#111c2d] mt-1">
            {items.length - activeCount}
          </p>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm space-y-4"
        >
          <h3 className="font-display font-semibold text-[#0d2137]">
            {form.id ? "Avtomobilni tahrirlash" : "Yangi avtomobil"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="tp-input" placeholder="Make" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} required />
            <input className="tp-input" placeholder="Model" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} required />
            <input className="tp-input" placeholder="Rang" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} required />
            <input className="tp-input" placeholder="Davlat raqami" value={form.plateNumber} onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))} required />
            <input className="tp-input" type="number" placeholder="Yil" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} required />
            <select className="tp-input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Form["category"] }))}>
              <option value="STANDARD">STANDARD</option>
              <option value="COMFORT">COMFORT</option>
              <option value="MINIVAN">MINIVAN</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </div>
          <textarea
            className="tp-input min-h-[100px]"
            placeholder="Rasm URL (har qatorda bittadan)"
            value={form.imagesText}
            onChange={(e) => setForm((p) => ({ ...p, imagesText: e.target.value }))}
          />
          <div className="flex gap-2">
            <button disabled={saving} className="tp-btn tp-btn-primary">
              {saving ? "Saqlanmoqda..." : form.id ? "Yangilash" : "Qo‘shish"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setShowForm(false);
              }}
              className="tp-btn tp-btn-ghost"
            >
              Bekor
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#d8e3fb] rounded-2xl py-16 text-center text-[#94A3B8] font-semibold">
          Avtomobillar topilmadi
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-[#d8e3fb] rounded-2xl overflow-hidden shadow-sm flex flex-col"
            >
              <div
                className="h-36 bg-[#f0f3ff] relative flex items-center justify-center bg-cover bg-center"
                style={v.images[0] ? { backgroundImage: `url(${v.images[0]})` } : undefined}
              >
                {!v.images[0] ? <Car size={40} className="text-[#94A3B8]" /> : null}
                <span
                  className={`absolute top-3 left-3 ${
                    v.isActive ? "tp-badge tp-badge-ok" : "tp-badge tp-badge-muted"
                  }`}
                >
                  {v.isActive ? "Faol" : "Nofaol"}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="font-display font-semibold text-[#0d2137] text-[17px]">
                  {v.make} {v.model}
                </p>
                <p className="text-[12px] font-semibold text-[#64748B] mt-1">
                  {v.plateNumber} · {v.year} · {v.category}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-1">{v.color}</p>
                <div className="mt-auto pt-4 flex gap-2">
                  <button type="button" onClick={() => edit(v)} className="tp-btn tp-btn-ghost flex-1">
                    Tahrirlash
                  </button>
                  {v.isActive ? (
                    <button
                      type="button"
                      onClick={() => void deactivate(v.id)}
                      className="tp-btn flex-1 bg-rose-50 text-rose-600 border border-rose-100"
                    >
                      Deaktiv
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
