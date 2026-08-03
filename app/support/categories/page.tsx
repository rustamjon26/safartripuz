"use client";

import {
  IMPROVEMENT_AREAS,
  NEGATIVE_KEYWORDS,
  POSITIVE_KEYWORDS,
  type ImprovementPriority,
} from "../mock-data";

function priorityBadge(p: ImprovementPriority): string {
  if (p === "high") return "sp-badge sp-badge-high";
  if (p === "mid") return "sp-badge sp-badge-mid";
  return "sp-badge sp-badge-low";
}

function priorityLabel(p: ImprovementPriority): string {
  if (p === "high") return "Yuqori";
  if (p === "mid") return "O‘rta";
  return "Past";
}

export default function SupportCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Kategoriyalar va kalit so‘zlar
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Fikrlar chastotasiga asoslangan ustuvorliklar va yaxshilanish sohalari.
          </p>
        </div>
        <span className="sp-badge sp-badge-muted">Demo ma’lumot</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sp-card p-5 sp-animate">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
            Ijobiy kalit so‘zlar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Eng ko‘p tilga olingan ijobiy mavzular
          </p>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_KEYWORDS.map((kw) => (
              <span key={kw} className="sp-chip sp-chip-pos cursor-default">
                {kw}
              </span>
            ))}
          </div>
        </div>
        <div className="sp-card p-5 sp-animate sp-animate-delay-1">
          <h2 className="font-display text-[18px] font-bold text-[#0d2137] mb-1">
            Salbiy kalit so‘zlar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mb-4">
            Diqqat talab qiladigan mavzular
          </p>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_KEYWORDS.map((kw) => (
              <span key={kw} className="sp-chip sp-chip-neg cursor-default">
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="sp-card overflow-hidden sp-animate sp-animate-delay-2">
        <div className="px-5 py-4 border-b border-[#d8e3fb]">
          <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
            Yaxshilanishi kerak bo‘lgan sohalar
          </h2>
          <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">
            Fikrlar chastotasiga asoslangan ustuvorliklar
          </p>
        </div>
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
              {IMPROVEMENT_AREAS.map((row) => (
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
                    <span
                      className={
                        row.status === "Jarayonda"
                          ? "sp-badge sp-badge-info"
                          : "sp-badge sp-badge-muted"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
