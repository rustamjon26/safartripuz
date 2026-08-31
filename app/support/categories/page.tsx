"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type ImprovementPriority = "high" | "mid" | "low";

type Keyword = { word: string; count: number };

type Improvement = {
  id: string;
  area: string;
  description: string;
  count: number;
  priority: ImprovementPriority;
  status: string;
};

type ReportsPayload = {
  days: number;
  totalTickets: number;
  positiveKeywords: Keyword[];
  negativeKeywords: Keyword[];
  improvements: Improvement[];
};

function priorityBadge(p: ImprovementPriority): string {
  if (p === "high") return "sp-badge sp-badge-high";
  if (p === "mid") return "sp-badge sp-badge-mid";
  return "sp-badge sp-badge-low";
}

function priorityLabel(p: ImprovementPriority): string {
  if (p === "high") return "Yuqori";
  if (p === "mid") return "O'rta";
  return "Past";
}

export default function SupportCategoriesPage() {
  const [reports, setReports] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/feedback/reports?days=90", {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json()) as { reports?: ReportsPayload; message?: string };
      if (!res.ok || !body.reports) {
        throw new Error(body.message || "Hisobot yuklanmadi");
      }
      setReports(body.reports);
    } catch (err) {
      // No fallback keywords: an unreachable API must not read as "no problems".
      setReports(null);
      setError(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
          Kategoriyalar va kalit so&apos;zlar
        </h1>
        <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
          Fikrlar chastotasiga asoslangan ustuvorliklar va yaxshilanish sohalari.
        </p>
      </div>
      <span className="sp-badge sp-badge-muted">
        Oxirgi {reports?.days ?? 90} kun
      </span>
    </div>
  );

  if (loading && !reports) {
    return (
      <div className="space-y-6">
        {header}
        <div className="sp-card flex min-h-[40vh] items-center justify-center gap-2 text-[#64748B] text-sm font-semibold">
          <Loader2 size={18} className="animate-spin" />
          Yuklanmoqda…
        </div>
      </div>
    );
  }

  if (error || !reports) {
    return (
      <div className="space-y-6">
        {header}
        <div className="sp-card p-8 text-center space-y-3">
          <p className="text-[15px] font-bold text-[#0d2137]">
            Kategoriyalarni yuklab bo&apos;lmadi
          </p>
          <p className="text-[13px] text-[#64748B] font-semibold">
            {error ?? "Server xatosi"}
          </p>
          <button type="button" className="sp-btn sp-btn-navy" onClick={() => void load()}>
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  const { positiveKeywords, negativeKeywords, improvements, totalTickets } = reports;

  return (
    <div className="space-y-6">
      {header}

      {totalTickets === 0 ? (
        <div className="sp-card p-8 text-center text-[#64748B] font-semibold">
          Hali sharh/ticket yo&apos;q. Feed yoki &quot;Manbalarni sinxronlash&quot; orqali
          ma&apos;lumot to&apos;plang.
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sp-card p-5 sp-animate">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
            Ijobiy kalit so&apos;zlar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Eng ko&apos;p tilga olingan ijobiy mavzular
          </p>
          <div className="flex flex-wrap gap-2">
            {positiveKeywords.length === 0 ? (
              <span className="text-[12px] text-[#94A3B8] font-semibold">
                Ma&apos;lumot yetarli emas
              </span>
            ) : (
              positiveKeywords.map((kw) => (
                <span key={kw.word} className="sp-chip sp-chip-pos cursor-default">
                  {kw.word}
                  <span className="ml-1 opacity-60">{kw.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
            Salbiy kalit so&apos;zlar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Diqqat talab qiladigan mavzular
          </p>
          <div className="flex flex-wrap gap-2">
            {negativeKeywords.length === 0 ? (
              <span className="text-[12px] text-[#94A3B8] font-semibold">
                Ma&apos;lumot yetarli emas
              </span>
            ) : (
              negativeKeywords.map((kw) => (
                <span key={kw.word} className="sp-chip sp-chip-neg cursor-default">
                  {kw.word}
                  <span className="ml-1 opacity-60">{kw.count}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sp-card overflow-hidden sp-animate sp-animate-delay-2">
        <div className="px-5 py-4 border-b border-[#d8e3fb]">
          <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
            Yaxshilanishi kerak bo&apos;lgan sohalar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">
            Salbiy ticketlar kategoriya / kanal bo&apos;yicha
          </p>
        </div>
        {improvements.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#94A3B8] font-semibold">
            Salbiy guruhlar topilmadi
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                  <th className="px-5 py-3">Soha</th>
                  <th className="px-5 py-3">Muammo tavsifi</th>
                  <th className="px-5 py-3">Fikrlar soni</th>
                  <th className="px-5 py-3">Ustuvorlik</th>
                  <th className="px-5 py-3">Holat</th>
                </tr>
              </thead>
              <tbody>
                {improvements.map((row) => (
                  <tr key={row.id} className="border-t border-[#d8e3fb]">
                    <td className="px-5 py-4 text-[13px] font-bold text-[#111c2d]">{row.area}</td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-[#64748B] max-w-sm">
                      {row.description}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-bold text-[#006781]">
                      {row.count} ta
                    </td>
                    <td className="px-5 py-4">
                      <span className={priorityBadge(row.priority)}>
                        {priorityLabel(row.priority)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="sp-badge sp-badge-muted">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
