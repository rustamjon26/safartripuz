"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const images = form.imagesText.split("\n").map((x) => x.trim()).filter(Boolean);
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
      toast.success(form.id ? "Vehicle yangilandi" : "Vehicle qo'shildi");
      setForm(emptyForm);
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
      toast.success("Vehicle deaktiv qilindi");
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
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Vehicles</h1>
        <p className="text-[13px] font-semibold text-slate-500 mt-1">Mashinalarni boshqarish</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="h-input" placeholder="Make" value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} required />
          <input className="h-input" placeholder="Model" value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} required />
          <input className="h-input" placeholder="Color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} required />
          <input className="h-input" placeholder="Plate number" value={form.plateNumber} onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))} required />
          <input className="h-input" type="number" placeholder="Year" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} required />
          <select className="h-input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as Form["category"] }))}>
            <option value="STANDARD">STANDARD</option>
            <option value="COMFORT">COMFORT</option>
            <option value="MINIVAN">MINIVAN</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
        </div>
        <textarea className="h-input min-h-[100px]" placeholder="Image URLs (har qatorda bittadan)" value={form.imagesText} onChange={(e) => setForm((p) => ({ ...p, imagesText: e.target.value }))} />
        <div className="flex gap-2">
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-bold">{saving ? "Saving..." : form.id ? "Update vehicle" : "Add vehicle"}</button>
          {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700">Cancel edit</button> : null}
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Vehicle</th>
                <th className="py-3 px-5">Plate</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">Vehicles topilmadi</td></tr>
              ) : (
                items.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5 font-bold text-slate-700">{v.make} {v.model} ({v.year})</td>
                    <td className="py-3 px-5">{v.plateNumber}</td>
                    <td className="py-3 px-5">{v.category}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase ${v.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {v.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => edit(v)} className="px-2.5 py-1 text-xs font-black rounded border border-slate-200 text-slate-600">Edit</button>
                        {v.isActive ? (
                          <button onClick={() => void deactivate(v.id)} className="px-2.5 py-1 text-xs font-black rounded bg-red-50 border border-red-200 text-red-700">Deactivate</button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
