"use client";

import Link from "next/link";
import {
  AI_TIPS,
  GUEST_GEO,
  OCCUPANCY_SERIES,
  OVERVIEW_KPIS,
  PERFORMANCE_KPIS,
  RECENT_REVIEWS,
  REVENUE_SPLIT,
} from "../mock-data";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[12px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

export default function SupportDashboardPage() {
  const maxOcc = Math.max(...OCCUPANCY_SERIES.map((d) => Math.max(d.current, d.previous)), 1);

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Hamkor tahliliy paneli
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Xush kelibsiz! Bugungi tahlillar va mijoz fikr-mulohazalarini ko‘rib chiqing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sp-badge sp-badge-muted">Oxirgi 30 kun · demo</span>
          <button type="button" className="sp-btn sp-btn-ghost">
            Hisobotni yuklash
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PERFORMANCE_KPIS.map((kpi, i) => (
          <div
            key={kpi.id}
            className={`sp-card p-5 sp-animate sp-animate-delay-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}
          >
            <div className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {kpi.label}
            </div>
            <div className="mt-2 font-display text-[28px] font-bold text-[#0d2137]">{kpi.value}</div>
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
                Bandlik dinamikasi
              </h2>
              <p className="text-[12px] text-[#64748B] font-semibold">Joriy oy vs o‘tgan oy</p>
            </div>
            <div className="flex gap-3 text-[11px] font-[family-name:var(--font-sora)] font-bold">
              <span className="inline-flex items-center gap-1.5 text-[#006781]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006781]" /> Joriy
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" /> O‘tgan
              </span>
            </div>
          </div>
          <div className="flex items-end gap-3 sm:gap-5 h-[180px]">
            {OCCUPANCY_SERIES.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-[140px]">
                  <div
                    className="w-3 sm:w-4 rounded-t-md bg-[#CBD5E1]"
                    style={{ height: `${(d.previous / maxOcc) * 100}%` }}
                    title={`O‘tgan: ${d.previous}%`}
                  />
                  <div
                    className="w-3 sm:w-4 rounded-t-md bg-[#006781]"
                    style={{ height: `${(d.current / maxOcc) * 100}%` }}
                    title={`Joriy: ${d.current}%`}
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
          <h2 className="font-display text-[20px] font-bold text-[#0d2137] mb-1">AI tavsiyalari</h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Bozor talabi asosida optimal strategiya (demo)
          </p>
          <div className="space-y-3">
            {AI_TIPS.map((tip) => (
              <div key={tip.title} className="rounded-2xl bg-[#f0f3ff] border border-[#d8e3fb] p-4">
                <div className="text-[13px] font-bold text-[#0d2137]">{tip.title}</div>
                <p className="mt-1 text-[12px] text-[#64748B] font-semibold leading-relaxed">
                  {tip.body}
                </p>
              </div>
            ))}
          </div>
          <button type="button" className="sp-btn sp-btn-primary w-full mt-4">
            Tavsiyalarni qo‘llash
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="sp-card p-5 sp-animate">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-4">
            Tushum taqsimoti
          </h2>
          <div className="space-y-3">
            {REVENUE_SPLIT.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[12px] font-bold mb-1.5">
                  <span className="text-[#111c2d]">{row.label}</span>
                  <span className="text-[#006781]">{row.pct}%</span>
                </div>
                <div className="sp-bar">
                  <span style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
            Mehmolar geografiyasi
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">Oxirgi 3 oy</p>
          <div className="space-y-3">
            {GUEST_GEO.map((g) => (
              <div key={g.country} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#b9eaff] text-[#001f29] text-[10px] font-bold flex items-center justify-center shrink-0">
                  {g.flag}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-[12px] font-bold mb-1">
                    <span className="truncate">{g.country}</span>
                    <span className="text-[#006781]">{g.pct}%</span>
                  </div>
                  <div className="sp-bar">
                    <span style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card p-5 sp-animate sp-animate-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[18px] font-bold text-[#0d2137]">Fikrlar snaphoti</h2>
            <Link href="/support/feed" className="text-[12px] font-bold text-[#006781]">
              Barchasi
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {OVERVIEW_KPIS.slice(0, 4).map((k) => (
              <div key={k.id} className="rounded-xl bg-[#f9f9ff] border border-[#d8e3fb] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                  {k.label}
                </div>
                <div className="font-display text-[20px] font-bold text-[#0d2137] mt-0.5">
                  {k.value}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {RECENT_REVIEWS.slice(0, 2).map((r) => (
              <div key={r.id} className="rounded-xl border border-[#d8e3fb] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12px] font-bold text-[#111c2d] truncate">{r.author}</div>
                  <Stars n={r.rating} />
                </div>
                <p className="mt-1 text-[12px] text-[#64748B] font-semibold line-clamp-2">
                  “{r.quote}”
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
