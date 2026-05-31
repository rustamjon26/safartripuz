"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Percent, Save } from "lucide-react";
import Link from "next/link";

const VERTICALS = [
  { key: "HOTEL", label: "Mehmonxona", icon: "🏨" },
  { key: "HOMESTAY", label: "Uy mehmonxona", icon: "🏠" },
  { key: "GUIDE", label: "Gid", icon: "🧭" },
  { key: "TAXI", label: "Taksi", icon: "🚕" },
] as const;

type Rates = Record<(typeof VERTICALS)[number]["key"], number>;

export default function CommissionSettingsPage() {
  const [rates, setRates] = useState<Rates>({
    HOTEL: 10,
    HOMESTAY: 10,
    GUIDE: 15,
    TAXI: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/commission");
        if (!res.ok) throw new Error("Yuklab bo'lmadi");
        const data = (await res.json()) as { rates?: Rates };
        if (data.rates) setRates(data.rates);
      } catch {
        toast.error("Komissiya sozlamalarini yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlab bo'lmadi");
      toast.success("Komissiya foizlari saqlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Komissiya" subtitle="Yuklanmoqda...">
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Komissiya sozlamalari"
      subtitle="Har bir xizmat turi uchun SafarTrip komissiya foizini belgilang"
    >
      <div className="max-w-xl space-y-6">
        <p className="text-sm font-medium text-slate-500">
          O&apos;zgarishlar yangi to&apos;lovlarga qo&apos;llaniladi. Mavjud bronlardagi saqlangan foiz o&apos;zgarmaydi.
        </p>

        <div className="space-y-3">
          {VERTICALS.map((v) => (
            <div
              key={v.key}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-2xl bg-white"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{v.icon}</span>
                <span className="font-bold text-slate-900">{v.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={rates[v.key]}
                  onChange={(e) =>
                    setRates((prev) => ({
                      ...prev,
                      [v.key]: Number(e.target.value),
                    }))
                  }
                  className="w-20 text-right border border-slate-200 rounded-xl px-3 py-2 font-black text-lg outline-none focus:border-emerald-500"
                />
                <span className="text-slate-500 font-bold">%</span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/settings/payments" className="font-bold text-slate-500 hover:text-slate-900">
            ← To&apos;lov sozlamalari
          </Link>
          <Link href="/admin/settings" className="font-bold text-slate-500 hover:text-slate-900">
            Umumiy sozlamalar
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
