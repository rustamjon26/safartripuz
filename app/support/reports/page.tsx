"use client";

import { toast } from "sonner";
import {
  IMPROVEMENT_AREAS,
  MARKET_COMPARE,
  NEGATIVE_KEYWORDS,
  POSITIVE_KEYWORDS,
} from "../mock-data";

export default function SupportReportsPage() {
  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Raqobatchilar tahlili va hisobotlar
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Biznesingiz va O‘zbekiston bozoridagi o‘rtacha ko‘rsatkichlar o‘rtasidagi farq
            (demo).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            onClick={() => toast.message("Oylik hisobot — backend keyin")}
          >
            Oylik hisobotni yuklash
          </button>
          <button
            type="button"
            className="sp-btn sp-btn-navy"
            onClick={() => toast.message("Eksport — backend keyin")}
          >
            Eksport qilish
          </button>
        </div>
      </div>

      <div className="sp-card p-5 sm:p-6 sp-animate">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
              Bozor o‘rtacha vs sizning natijangiz
            </h2>
            <p className="text-[12px] text-[#64748B] font-semibold">
              Ballar 0–100 shkalada (mock)
            </p>
          </div>
          <div className="flex gap-3 text-[11px] font-[family-name:var(--font-sora)] font-bold">
            <span className="inline-flex items-center gap-1.5 text-[#006781]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#006781]" /> Sizning brendingiz
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#94A3B8]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" /> Bozor o‘rtacha
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {MARKET_COMPARE.map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-[12px] font-bold mb-2">
                <span className="text-[#111c2d]">{row.label}</span>
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
            {POSITIVE_KEYWORDS.map((kw) => (
              <span key={kw} className="sp-chip sp-chip-pos cursor-default">
                {kw}
              </span>
            ))}
          </div>
        </div>
        <div className="sp-card p-5 sp-animate sp-animate-delay-2">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-3">
            Salbiy kalit so‘zlar
          </h2>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_KEYWORDS.map((kw) => (
              <span key={kw} className="sp-chip sp-chip-neg cursor-default">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="sp-card p-5 sp-animate sp-animate-delay-3">
        <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
          Ustuvor yaxshilanishlar (qisqa)
        </h2>
        <p className="text-[12px] text-[#64748B] font-semibold mb-4">
          To‘liq jadval — Categories sahifasida
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMPROVEMENT_AREAS.slice(0, 4).map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-[#d8e3fb] bg-[#f9f9ff] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-bold text-[#111c2d]">{row.area}</div>
                <span className="text-[12px] font-bold text-[#006781]">{row.count} ta</span>
              </div>
              <p className="mt-1 text-[12px] text-[#64748B] font-semibold leading-relaxed">
                {row.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
