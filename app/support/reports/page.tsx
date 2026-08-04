"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type MarketRow = {
  label: string;
  key: string;
  brand: number;
  market: number;
  sampleSize: number;
};

type Keyword = { word: string; count: number };

type Improvement = {
  id: string;
  area: string;
  description: string;
  count: number;
  priority: "high" | "mid" | "low";
  status: string;
};

type ReportsPayload = {
  days: number;
  totalTickets: number;
  marketCompare: MarketRow[];
  positiveKeywords: Keyword[];
  negativeKeywords: Keyword[];
  improvements: Improvement[];
};

export default function SupportReportsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<ReportsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/feedback/reports?days=90", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        reports?: ReportsPayload;
        message?: string;
      };
      if (!res.ok || !data.reports) {
        throw new Error(data.message || "Hisobot yuklanmadi");
      }
      setReports(data.reports);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncSources() {
    setSyncing(true);
    try {
      const res = await fetch("/api/support/feedback/sync", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        created?: number;
        scanned?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Sinxronlash xatosi");
      toast.success(
        `Sinxron: ${data.scanned ?? 0} ta ko‘rib chiqildi, ${data.created ?? 0} ta yangi`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sinxronlash xatosi");
    } finally {
      setSyncing(false);
    }
  }

  function exportJson() {
    if (!reports) {
      toast.error("Avval hisobotni yuklang");
      return;
    }
    const blob = new Blob([JSON.stringify(reports, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safartrip-support-reports-${reports.days}d.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Hisobot yuklab olindi");
  }

  if (loading && !reports) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#64748B] text-sm font-semibold gap-2">
        <Loader2 size={18} className="animate-spin" />
        Hisobot yuklanmoqda…
      </div>
    );
  }

  const market = reports?.marketCompare ?? [];
  const positive = reports?.positiveKeywords ?? [];
  const negative = reports?.negativeKeywords ?? [];
  const improvements = reports?.improvements ?? [];
  const empty = (reports?.totalTickets ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Raqobatchilar tahlili va hisobotlar
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Live FeedbackTicket ma&apos;lumotlari · oxirgi{" "}
            {reports?.days ?? 90} kun · {reports?.totalTickets ?? 0} ta ticket.
            Bozor o&apos;rtachasi — UZ turizm baseline (sozlama).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            disabled={syncing}
            onClick={() => void syncSources()}
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : null}
            Manbalarni sinxronlash
          </button>
          <button
            type="button"
            className="sp-btn sp-btn-navy"
            onClick={exportJson}
          >
            Eksport (JSON)
          </button>
        </div>
      </div>

      {empty ? (
        <div className="sp-card p-8 text-center text-[#64748B] font-semibold">
          Hali sharh/ticket yo‘q. Feed yoki “Manbalarni sinxronlash” orqali
          ma&apos;lumot to‘plang.
        </div>
      ) : null}

      <div className="sp-card p-5 sm:p-6 sp-animate">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
              Bozor o‘rtacha vs sizning natijangiz
            </h2>
            <p className="text-[12px] text-[#64748B] font-semibold">
              Ballar 0–100 (reyting × 20). Kanal bo‘yicha o‘rtacha.
            </p>
          </div>
          <div className="flex gap-3 text-[11px] font-[family-name:var(--font-sora)] font-bold">
            <span className="inline-flex items-center gap-1.5 text-[#006781]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006781]" /> Sizning
              brendingiz
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" /> Bozor
              o‘rtacha
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {market.map((row) => (
            <div key={row.key}>
              <div className="flex justify-between text-[12px] font-bold mb-2">
                <span className="text-[#111c2d]">
                  {row.label}
                  <span className="ml-2 text-[#94A3B8] font-semibold">
                    ({row.sampleSize} ta)
                  </span>
                </span>
                <span className="text-[#64748B]">
                  <span className="text-[#006781]">{row.brand}</span>
                  {" / "}
                  {row.market}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-[#e8eef9] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#CBD5E1] rounded-full"
                  style={{ width: `${row.market}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-[#006781] rounded-full"
                  style={{ width: `${row.brand}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-3">
            Ijobiy kalit so‘zlar
          </h2>
          <div className="flex flex-wrap gap-2">
            {positive.length === 0 ? (
              <span className="text-[12px] text-[#94A3B8] font-semibold">
                Ma&apos;lumot yetarli emas
              </span>
            ) : (
              positive.map((kw) => (
                <span key={kw.word} className="sp-chip sp-chip-pos cursor-default">
                  {kw.word}
                  <span className="ml-1 opacity-60">{kw.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
        <div className="sp-card p-5 sp-animate sp-animate-delay-2">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-3">
            Salbiy kalit so‘zlar
          </h2>
          <div className="flex flex-wrap gap-2">
            {negative.length === 0 ? (
              <span className="text-[12px] text-[#94A3B8] font-semibold">
                Ma&apos;lumot yetarli emas
              </span>
            ) : (
              negative.map((kw) => (
                <span key={kw.word} className="sp-chip sp-chip-neg cursor-default">
                  {kw.word}
                  <span className="ml-1 opacity-60">{kw.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sp-card p-5 sp-animate sp-animate-delay-3">
        <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
          Ustuvor yaxshilanishlar
        </h2>
        <p className="text-[12px] text-[#64748B] font-semibold mb-4">
          Salbiy ticketlar kategoriya / kanal bo‘yicha
        </p>
        {improvements.length === 0 ? (
          <p className="text-[13px] text-[#94A3B8] font-semibold">
            Salbiy guruhlar topilmadi
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {improvements.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-[#d8e3fb] bg-[#f9f9ff] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-bold text-[#111c2d]">
                    {row.area}
                  </div>
                  <span className="text-[12px] font-bold text-[#006781]">
                    {row.count} ta
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[#64748B] font-semibold leading-relaxed">
                  {row.description}
                </p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                  {row.status} · {row.priority}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
