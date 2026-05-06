"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, Plus, Edit2, Eye, EyeOff, X, Loader2, Save } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { formatPrice, taxiServiceTypeLabel } from "@/lib/displayHelpers";

type ServiceType = "INTERCITY_TRANSFER" | "HOTEL_TRANSFER" | "TOUR_DAILY_TRANSPORT";

type TaxiService = {
  id: string;
  title: string;
  serviceType: ServiceType;
  price: string;
  isActive: boolean;
};

export default function TaxiHome() {
  const [items, setItems] = useState<TaxiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TaxiService | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("INTERCITY_TRANSFER");
  const [price, setPrice] = useState("");

  function resetForm() {
    setTitle(""); setServiceType("INTERCITY_TRANSFER"); setPrice("");
    setShowForm(false); setEditingItem(null);
  }

  function openEdit(item: TaxiService) {
    setEditingItem(item);
    setTitle(item.title); setServiceType(item.serviceType); setPrice(String(Number(item.price)));
    setShowForm(true);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/services");
      const data = (await res.json()) as { success?: boolean; data?: { data?: TaxiService[] }; message?: string };
      if (!res.ok) throw new Error(data.message || "Load error");
      setItems(data.data?.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const p = Number(price);
    if (!title.trim() || !Number.isFinite(p) || p <= 0) { toast.error("Ma'lumotlar to'liq emas"); return; }
    setSaving(true);
    try {
      const url = editingItem ? `/api/taxi/services/${editingItem.id}` : "/api/taxi/services";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), serviceType, price: p, isActive: true }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Xatolik");
      toast.success(editingItem ? "Xizmat yangilandi ✓" : "Yangi xizmat qo'shildi ✓");
      resetForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally { setSaving(false); }
  }

  async function toggleActive(item: TaxiService) {
    setUpdatingId(item.id);
    try {
      const res = await fetch(`/api/taxi/services/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Yangilashda xato");
      toast.success(item.isActive ? "Nofaol qilindi" : "Faollashtirildi");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally { setUpdatingId(null); }
  }

  return (
    <DashboardShell title="Taxi Paneli" subtitle="Transport xizmatlarini boshqarish">
      {/* Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Car size={18} className="text-slate-400" /> Mening Xizmatlarim
          {!loading && items.length > 0 && (
            <span className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-1 rounded-full">{items.length}</span>
          )}
        </h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-lg shadow-slate-900/20 transition-all">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Bekor qilish" : "Xizmat qo'shish"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
          <h3 className="font-black text-slate-900 mb-5">{editingItem ? "Xizmatni tahrirlash" : "Yangi xizmat"}</h3>
          <form onSubmit={submitForm} className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Xizmat nomi *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Masalan: Toshkent → Samarqand transfer"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Xizmat turi *</label>
                <select value={serviceType} onChange={e => setServiceType(e.target.value as ServiceType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all">
                  <option value="INTERCITY_TRANSFER">{taxiServiceTypeLabel("INTERCITY_TRANSFER")}</option>
                  <option value="HOTEL_TRANSFER">{taxiServiceTypeLabel("HOTEL_TRANSFER")}</option>
                  <option value="TOUR_DAILY_TRANSPORT">{taxiServiceTypeLabel("TOUR_DAILY_TRANSPORT")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Narxi (so'm) *</label>
                <input required type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="150000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 transition-all" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-3 px-6 rounded-2xl transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saqlanmoqda..." : editingItem ? "Yangilash" : "Qo'shish"}
              </button>
              <button type="button" onClick={resetForm}
                className="inline-flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-5 rounded-2xl transition-all text-sm">
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <Car size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="font-black text-slate-700 mb-2">Hali xizmatlar yo'q</h3>
            <p className="text-slate-500 text-sm">Transport xizmatlaringizni qo'shing va safarchilar sizni topa boshlaydi</p>
            <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 bg-slate-900 text-white font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-slate-800 transition-colors">
              <Plus size={16} /> Xizmat qo'shish
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{taxiServiceTypeLabel(item.serviceType)}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 text-sm">{formatPrice(Number(item.price))}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {item.isActive ? "Faol" : "Nofaol"}
                  </span>
                  <button disabled={updatingId === item.id} onClick={() => openEdit(item)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                    <Edit2 size={15} />
                  </button>
                  <button disabled={updatingId === item.id} onClick={() => void toggleActive(item)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
                    {updatingId === item.id ? <Loader2 size={15} className="animate-spin" /> : item.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
