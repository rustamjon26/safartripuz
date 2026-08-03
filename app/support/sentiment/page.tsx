"use client";

import Link from "next/link";
import {
  CATEGORY_SCORES,
  OVERVIEW_KPIS,
  RECENT_REVIEWS,
  SENTIMENT_DAYS,
} from "../mock-data";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[12px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

export default function SupportSentimentPage() {
  const maxVal = Math.max(...SENTIMENT_DAYS.flatMap((d) => [d.positive, d.negative]), 1);

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Sharhlar tahlili
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Turistik xizmat sifatining kayfiyat ko‘rsatkichlari.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sp-badge sp-badge-muted">Oxirgi 30 kun</span>
          <button type="button" className="sp-btn sp-btn-ghost">
            Eksport
          </button>
          <Link href="/support/feed" className="sp-btn sp-btn-navy">
            Hozir javob berish
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {OVERVIEW_KPIS.map((kpi, i) => (
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
              <p className="text-[12px] text-[#64748B] font-semibold">Ijobiy vs salbiy</p>
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
            {SENTIMENT_DAYS.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
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
                  {d.day}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[20px] font-bold text-[#0d2137] mb-4">
            Kategoriyalar bo‘yicha
          </h2>
          <div className="space-y-4">
            {CATEGORY_SCORES.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-[12px] font-bold mb-1.5">
                  <span className="text-[#111c2d]">{c.name}</span>
                  <span className="text-[#006781]">{c.score.toFixed(1)}</span>
                </div>
                <div className="sp-bar">
                  <span style={{ width: `${(c.score / 5) * 100}%` }} />
                </div>
              </div>
            ))}
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
            Barchasini ko‘rish
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RECENT_REVIEWS.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#d8e3fb] bg-[#f9f9ff] p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0d2137] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                  {r.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-[#111c2d] truncate">{r.author}</div>
                  <div className="text-[11px] text-[#94A3B8] font-semibold">{r.when}</div>
                </div>
                <Stars n={r.rating} />
              </div>
              <p className="mt-3 text-[13px] text-[#64748B] font-semibold leading-relaxed">
                “{r.quote}”
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/support/feed" className="sp-btn sp-btn-ghost text-[12px] py-2 px-3">
                  Javob berish
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
