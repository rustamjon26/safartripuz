"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Overview = {
  total: number;
  open: number;
  answered: number;
  avgRating: number;
  responseRate: number;
  sentimentIndex: number;
  bySentiment: { positive: number; neutral: number; negative: number };
};

type ChannelRow = {
  label: string;
  key: string;
  brand: number;
  market: number;
  sampleSize: number;
};

type Improvement = {
  id: string;
  area: string;
  description: string;
  count: number;
  priority: "high" | "mid" | "low";
  status: string;
};

type RecentItem = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  channel: string;
  sentiment: string;
  createdAt: string;
};

type DashboardPayload = {
  days: number;
  overview: Overview;
  channels: ChannelRow[];
  improvements: Improvement[];
  positiveKeywords: Array<{ word: string; count: number }>;
  negativeKeywords: Array<{ word: string; count: number }>;
  recent: RecentItem[];
};

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[12px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function SupportDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/feedback/dashboard?days=30", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        dashboard?: DashboardPayload;
        message?: string;
      };
      if (!res.ok || !json.dashboard) {
        throw new Error(json.message || "Dashboard yuklanmadi");
      }
      setData(json.dashboard);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
      setData(null);
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
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = (await res.json()) as {
        created?: number;
        scanned?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(json.message || "Sinxronlash xatosi");
      toast.success(
        `Sinxron: ${json.scanned ?? 0} ta ko‘rib chiqildi, ${json.created ?? 0} ta yangi`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sinxronlash xatosi");
    } finally {
      setSyncing(false);
    }
  }

  const overview = data?.overview ?? null;
  const channelTotal = useMemo(
    () => (data?.channels ?? []).reduce((s, c) => s + c.sampleSize, 0),
    [data],
  );
  const maxBrand = useMemo(
    () => Math.max(...(data?.channels ?? []).map((c) => c.brand), 1),
    [data],
  );

  const kpis = overview
    ? [
        {
          id: "rating",
          label: "O‘rtacha reyting",
          value: overview.avgRating > 0 ? overview.avgRating.toFixed(1) : "—",
          hint: `${overview.total.toLocaleString("uz-UZ")} ta sharh`,
          tone: "ok" as const,
        },
        {
          id: "open",
          label: "Ochiq ticketlar",
          value: String(overview.open),
          hint: `${overview.answered} ta javoblangan`,
          tone: overview.open > 20 ? ("warn" as const) : ("info" as const),
        },
        {
          id: "response",
          label: "Javob berish",
          value: `${overview.responseRate}%`,
          hint: "Javoblangan / jami",
          tone: overview.responseRate < 80 ? ("warn" as const) : ("ok" as const),
        },
        {
          id: "sentiment",
          label: "Kayfiyat indeksi",
          value: String(overview.sentimentIndex),
          hint:
            overview.sentimentIndex >= 70
              ? "Ijobiy kayfiyat"
              : "Diqqat talab qiladi",
          tone: overview.sentimentIndex >= 70 ? ("ok" as const) : ("warn" as const),
        },
      ]
    : [];

  const sentimentRows = overview
    ? [
        {
          label: "Ijobiy",
          pct: pct(overview.bySentiment.positive, overview.total),
          color: "bg-emerald-500",
        },
        {
          label: "Neytral",
          pct: pct(overview.bySentiment.neutral, overview.total),
          color: "bg-slate-400",
        },
        {
          label: "Salbiy",
          pct: pct(overview.bySentiment.negative, overview.total),
          color: "bg-rose-500",
        },
      ]
    : [];

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm font-semibold text-[#64748B]">
        <Loader2 size={18} className="animate-spin" />
        Dashboard yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Support paneli
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Jonli FeedbackTicket tahlili — reyting, kayfiyat va kanal bo‘yicha
            ko‘rsatkichlar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sp-badge sp-badge-muted">
            Oxirgi {data?.days ?? 30} kun · live
          </span>
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            disabled={syncing || loading}
            onClick={() => void syncSources()}
          >
            {syncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Sinxronlash
          </button>
          <Link href="/support/feed" className="sp-btn sp-btn-navy">
            Inbox
          </Link>
        </div>
      </div>

      {!data ? (
        <div className="sp-card p-8 text-center text-sm font-semibold text-[#64748B]">
          Ma&apos;lumot yuklanmadi. Qayta urinib ko&apos;ring yoki sinxronlang.
          <div className="mt-4">
            <button type="button" className="sp-btn sp-btn-primary" onClick={() => void load()}>
              Qayta yuklash
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <div
                key={kpi.id}
                className={`sp-card p-5 sp-animate sp-animate-delay-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
              >
                <div className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
                  {kpi.label}
                </div>
                <div className="mt-2 font-display text-[28px] font-bold text-[#0d2137]">
                  {kpi.value}
                </div>
                <div
                  className={`mt-2 text-[12px] font-bold ${
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
                    Kanal reytinglari
                  </h2>
                  <p className="text-[12px] text-[#64748B] font-semibold">
                    Brand score (0–100) · oxirgi {data.days} kun
                  </p>
                </div>
                <Link href="/support/reports" className="text-[12px] font-bold text-[#006781]">
                  Hisobotlar →
                </Link>
              </div>
              {data.channels.length === 0 ? (
                <p className="py-10 text-center text-sm font-semibold text-[#94A3B8]">
                  Hali kanal ma&apos;lumoti yo&apos;q — sinxronlang
                </p>
              ) : (
                <div className="flex items-end gap-3 sm:gap-5 h-[180px]">
                  {data.channels.map((d) => (
                    <div
                      key={d.key}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-[140px]">
                        <div
                          className="w-3 sm:w-4 rounded-t-md bg-[#CBD5E1]"
                          style={{ height: `${(d.market / 100) * 100}%` }}
                          title={`Bozor: ${d.market}`}
                        />
                        <div
                          className="w-3 sm:w-4 rounded-t-md bg-[#006781]"
                          style={{
                            height: `${(d.brand / Math.max(maxBrand, 100)) * 100}%`,
                          }}
                          title={`Brand: ${d.brand} · ${d.sampleSize} ta`}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-[#94A3B8] font-[family-name:var(--font-sora)] text-center truncate w-full">
                        {d.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-3 text-[11px] font-[family-name:var(--font-sora)] font-bold">
                <span className="inline-flex items-center gap-1.5 text-[#006781]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006781]" /> Brand
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" /> Bozor
                </span>
              </div>
            </div>

            <div className="sp-card p-5 sp-animate sp-animate-delay-1">
              <h2 className="font-display text-[20px] font-bold text-[#0d2137] mb-1">
                Yaxshilash tavsiyalari
              </h2>
              <p className="text-[12px] text-[#64748B] font-semibold mb-4">
                Salbiy sharhlardan (live)
              </p>
              {data.improvements.length === 0 ? (
                <p className="text-sm font-semibold text-[#94A3B8] py-6 text-center">
                  Hozircha tavsiya yo&apos;q
                </p>
              ) : (
                <div className="space-y-3">
                  {data.improvements.map((tip) => (
                    <div
                      key={tip.id}
                      className="rounded-2xl bg-[#f0f3ff] border border-[#d8e3fb] p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-bold text-[#0d2137]">
                          {tip.area}
                        </div>
                        <span className="text-[10px] font-black uppercase text-[#64748B]">
                          {tip.priority} · {tip.count}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[#64748B] font-semibold leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/support/reports"
                className="sp-btn sp-btn-primary w-full mt-4 justify-center"
              >
                Batafsil hisobot
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="sp-card p-5 sp-animate">
              <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-4">
                Kanal ulushi
              </h2>
              {channelTotal === 0 ? (
                <p className="text-sm font-semibold text-[#94A3B8]">Ma&apos;lumot yo&apos;q</p>
              ) : (
                <div className="space-y-3">
                  {data.channels.map((row) => {
                    const share = pct(row.sampleSize, channelTotal);
                    return (
                      <div key={row.key}>
                        <div className="flex justify-between text-[12px] font-bold mb-1.5">
                          <span className="text-[#111c2d]">{row.label}</span>
                          <span className="text-[#006781]">
                            {share}% · {row.sampleSize}
                          </span>
                        </div>
                        <div className="sp-bar">
                          <span style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sp-card p-5 sp-animate sp-animate-delay-1">
              <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
                Kayfiyat taqsimoti
              </h2>
              <p className="text-[12px] text-[#64748B] font-semibold mb-4">
                Barcha ticketlar
              </p>
              <div className="space-y-3">
                {sentimentRows.map((g) => (
                  <div key={g.label}>
                    <div className="flex justify-between text-[12px] font-bold mb-1.5">
                      <span className="text-[#111c2d]">{g.label}</span>
                      <span className="text-[#006781]">{g.pct}%</span>
                    </div>
                    <div className="sp-bar">
                      <span className={g.color} style={{ width: `${g.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {(data.negativeKeywords.length > 0 || data.positiveKeywords.length > 0) && (
                <div className="mt-5 pt-4 border-t border-[#d8e3fb]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8] mb-2">
                    Top kalit so&apos;zlar
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.positiveKeywords.slice(0, 4).map((k) => (
                      <span
                        key={`p-${k.word}`}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold"
                      >
                        {k.word}
                      </span>
                    ))}
                    {data.negativeKeywords.slice(0, 4).map((k) => (
                      <span
                        key={`n-${k.word}`}
                        className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold"
                      >
                        {k.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sp-card p-5 sp-animate sp-animate-delay-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-[18px] font-bold text-[#0d2137]">
                  So&apos;nggi sharhlar
                </h2>
                <Link href="/support/feed" className="text-[12px] font-bold text-[#006781]">
                  Barchasi
                </Link>
              </div>
              {data.recent.length === 0 ? (
                <p className="text-sm font-semibold text-[#94A3B8] py-6 text-center">
                  Hali sharh yo&apos;q
                </p>
              ) : (
                <div className="space-y-3">
                  {data.recent.map((r) => (
                    <Link
                      key={r.id}
                      href={`/support/feed?q=${encodeURIComponent(r.authorName)}`}
                      className="block rounded-xl border border-[#d8e3fb] p-3 hover:bg-[#f9f9ff]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12px] font-bold text-[#111c2d] truncate">
                          {r.authorName}
                        </div>
                        <Stars n={r.rating} />
                      </div>
                      <p className="mt-1 text-[12px] text-[#64748B] font-semibold line-clamp-2">
                        “{r.body}”
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
