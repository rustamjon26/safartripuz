"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Cable, Info, Plus } from "lucide-react";
import {
  INTEGRATION_GROUPS,
  type IntegrationStatus,
} from "../../mock-pack10";

function statusBadge(status: IntegrationStatus): { cls: string; label: string } {
  switch (status) {
    case "connected":
      return { cls: "h-badge h-badge-ok", label: "Ulangan" };
    case "pending":
      return { cls: "h-badge h-badge-wait", label: "Kutilmoqda" };
    case "license":
      return { cls: "h-badge h-badge-info", label: "Litsenziya" };
    default:
      return { cls: "h-badge h-badge-cancel", label: "Ulanmagan" };
  }
}

export default function HotelIntegrationsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/hotel/settings"
            className="p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B] hover:bg-[#f0f3ff] shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
              Sozlamalar · Integratsiyalar
            </div>
            <h1 className="font-display text-[28px] font-bold text-[#0d2137] mt-1 flex items-center gap-2">
              <Cable size={24} className="text-[#006781]" />
              Tashqi tizimlar bilan ulanish
            </h1>
            <p className="text-[13px] font-semibold text-[#64748B] mt-1 max-w-2xl">
              Boshqa platformalar bilan ma’lumotlarni sinxronizatsiya qiling. Hozircha
              frontend demo — ulash/sozlash backend keyin.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.message("Yangi integratsiya — backend keyin")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d2137] text-white text-[13px] font-bold"
        >
          <Plus size={16} />
          Yangi qo‘shish
        </button>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 flex gap-3 text-[12px] font-semibold text-sky-900">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          Xavfsizlik eslatmasi: API kalitlarini faqat ishonchli muhitda saqlang. Bu
          sahifa hozircha mock holatda — haqiqiy OTA/channel sync keyingi bosqich.
        </p>
      </div>

      {INTEGRATION_GROUPS.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-[11px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            {group.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map((item) => {
              const badge = statusBadge(item.status);
              const connected = item.status === "connected";
              return (
                <article
                  key={item.id}
                  className="bg-white border border-[#d8e3fb] rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0d2137]">{item.name}</h3>
                      <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <span className={badge.cls}>{badge.label}</span>
                  </div>
                  {item.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.badges.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded-md bg-[#f0f3ff] text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-bold text-[#006781]">{item.meta}</span>
                    <button
                      type="button"
                      onClick={() =>
                        toast.message(
                          connected
                            ? `${item.name} sozlamalari — backend keyin`
                            : `${item.name} ulash — backend keyin`,
                        )
                      }
                      className={`px-3.5 py-2 rounded-xl text-[12px] font-bold ${
                        connected
                          ? "border border-[#d8e3fb] text-[#0d2137] hover:bg-[#f9f9ff]"
                          : "bg-[#006781] text-white hover:bg-[#005a71]"
                      }`}
                    >
                      {connected ? "Sozlash" : "Ulash"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="bg-white border border-[#d8e3fb] rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold text-[#0d2137]">Maxsus API</h2>
        <p className="mt-1 text-[13px] font-semibold text-[#64748B] max-w-2xl">
          O‘zingizning tizimingizni SafarTrip ochiq API orqali bog‘lang.
        </p>
        <button
          type="button"
          onClick={() => toast.message("API hujjatlar — keyinroq")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#0d2137] hover:bg-[#f9f9ff]"
        >
          Hujjatlarni ko‘rish
        </button>
      </section>
    </div>
  );
}
