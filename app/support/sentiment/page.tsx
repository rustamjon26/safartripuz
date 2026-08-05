"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[12px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (!Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${Math.max(1, minutes)} daqiqa oldin`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}

type Dashboard = {
  days: number;
  trendDays: number;
  overview: {
    total: number;
    open: number;
    answered: number;
    avgRating: number;
    responseRate: number;
    sentimentIndex: number;
  };
  channels: Array<{ label: string; key: string; brand: number; sampleSize: number }>;
  trend: Array<{ date: string; label: string; positive: number; negative: number }>;
  recent: Array<{
    id: string;
    authorName: string;
    rating: number;
    body: string;
    createdAt: string;
  }>;
};

export default function SupportSentimentPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/feedback/dashboard?days=30", {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await res.json()) as { dashboard?: Dashboard; message?: string };
      if (!res.ok || !body.dashboard) {
        throw new Error(body.message || "Ma'lumot yuklanmadi");
      }
      setData(body.dashboard);
    } catch (err) {
      // No fallback numbers: an unreachable API must not look like a healthy one.
      setData(null);
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
          Sharhlar tahlili
        </h1>
        <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
          Turistik xizmat sifatining kayfiyat ko&apos;rsatkichlari.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="sp-badge sp-badge-muted">
          Oxirgi {data?.days ?? 30} kun
        </span>
        <Link href="/support/feed" className="sp-btn sp-btn-navy">
          Hozir javob berish
        </Link>
      </div>
    </div>
  );

  if (loading && !data) {
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

  if (error || !data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="sp-card p-8 text-center space-y-3">
          <p className="text-[15px] font-bold text-[#0d2137]">
            Ko&apos;rsatkichlarni yuklab bo&apos;lmadi
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

  const { overview, trend, channels, recent } = data;
  const maxVal = Math.max(...trend.flatMap((d) => [d.positive, d.negative]), 1);
  const empty = overview.total === 0;

  const kpis = [
    {
      id: "rating",
      label: "Umumiy reyting",
      value: overview.avgRating.toFixed(1),
      hint: `${overview.total} ta sharh`,
      tone: "ok" as const,
    },
    {
      id: "reviews",
      label: "Sharhlar soni",
      value: overview.total.toLocaleString("uz-UZ"),
      hint: `${overview.open} ta ochiq`,
      tone: "info" as const,
    },
    {
      id: "response",
      label: "Javob berish ko'rsatkichi",
      value: `${overview.responseRate}%`,
      hint: `${overview.answered} ta javoblangan`,
      tone: overview.responseRate < 80 ? ("warn" as const) : ("ok" as const),
    },
    {
      id: "sentiment",
      label: "Kayfiyat indeksi",
      value: String(overview.sentimentIndex),
      hint: overview.sentimentIndex >= 70 ? "Zo'r" : "Diqqat",
      tone: overview.sentimentIndex >= 70 ? ("ok" as const) : ("warn" as const),
    },
  ];

  return (
    <div className="space-y-6">
      {header}

      {empty ? (
        <div className="sp-card p-8 text-center text-[#64748B] font-semibold">
          Hali sharh yo&apos;q. Feed yoki &quot;Manbalarni sinxronlash&quot; orqali
          ma&apos;lumot to&apos;plang.
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.id}
            className={`sp-card p-5 sp-animate sp-animate-delay-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
          >
            <div className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {kpi.label}
            </div>
            <div className="mt-2 font-display text-[32px] font-bold text-[#0d2137] leading-none">
              {kpi.value}
            </div>
            <div
              className={`mt-3 text-[12px] font-bold ${
                kpi.tone === "warn"
                  ? "text-[#B45309]"
                  : kpi.tone === "info"
                    ? "text-[#0284C7]"
                    : "text-[#059669]"
              }`}
            >
              {kpi.hint}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="sp-card p-5 xl:col-span-2 sp-animate">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
                Sentiment tahlili dinamikasi
              </h2>
              <p className="text-[12px] text-[#64748B] font-semibold">
                Ijobiy vs salbiy · oxirgi {data.trendDays} kun
              </p>
            </div>
            <div className="flex gap-3 text-[11px] font-[family-name:var(--font-sora)] font-bold">
              <span className="inline-flex items-center gap-1.5 text-[#059669]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Ijobiy
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#E11D48]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" /> Salbiy
              </span>
            </div>
          </div>
          <div className="flex items-end gap-2 sm:gap-4 h-[200px]">
            {trend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-[160px]">
                  <div
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-[#10B981]"
                    style={{ height: `${(d.positive / maxVal) * 100}%` }}
                    title={`Ijobiy: ${d.positive}`}
                  />
                  <div
                    className="w-2.5 sm:w-3.5 rounded-t-md bg-[#F43F5E]"
                    style={{ height: `${(d.negative / maxVal) * 100}%` }}
                    title={`Salbiy: ${d.negative}`}
                  />
                </div>
                <div className="text-[10px] font-bold text-[#94A3B8] font-[family-name:var(--font-sora)]">
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[20px] font-bold text-[#0d2137] mb-1">
            Kanallar bo&apos;yicha
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Ball 0–100 (reyting × 20)
          </p>
          <div className="space-y-4">
            {channels.filter((c) => c.sampleSize > 0).length === 0 ? (
              <p className="text-[13px] text-[#94A3B8] font-semibold">
                Ma&apos;lumot yetarli emas
              </p>
            ) : (
              channels
                .filter((c) => c.sampleSize > 0)
                .map((c) => (
                  <div key={c.key}>
                    <div className="flex justify-between text-[12px] font-bold mb-1.5">
                      <span className="text-[#111c2d]">
                        {c.label}
                        <span className="ml-2 text-[#94A3B8] font-semibold">
                          ({c.sampleSize} ta)
                        </span>
                      </span>
                      <span className="text-[#006781]">{c.brand}</span>
                    </div>
                    <div className="sp-bar">
                      <span style={{ width: `${c.brand}%` }} />
                    </div>
                  </div>
                ))
            )}
          </div>
          <Link href="/support/categories" className="sp-btn sp-btn-soft w-full mt-5">
            Barcha kategoriyalar
          </Link>
        </div>
      </div>

      <div className="sp-card p-5 sp-animate">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[20px] font-bold text-[#0d2137]">Oxirgi sharhlar</h2>
          <Link href="/support/feed" className="text-[12px] font-bold text-[#006781]">
            Barchasini ko&apos;rish
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-[13px] text-[#94A3B8] font-semibold">Sharhlar topilmadi</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recent.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[#d8e3fb] bg-[#f9f9ff] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0d2137] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                    {initialsOf(r.authorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-[#111c2d] truncate">
                      {r.authorName}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-semibold">
                      {relativeTime(r.createdAt)}
                    </div>
                  </div>
                  <Stars n={r.rating} />
                </div>
                <p className="mt-3 text-[13px] text-[#64748B] font-semibold leading-relaxed line-clamp-4">
                  &ldquo;{r.body}&rdquo;
                </p>
                <div className="mt-3 flex gap-2">
                  <Link href="/support/feed" className="sp-btn sp-btn-ghost text-[12px] py-2 px-3">
                    Javob berish
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
