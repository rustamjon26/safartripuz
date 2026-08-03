"use client";

import Link from "next/link";
import { Bell, HelpCircle, Play, School } from "lucide-react";
import { toast } from "sonner";
import { DASH_KPIS, NEWS, STAFF_USER } from "../mock-data";

export default function StaffDashboardPage() {
  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            SafarTrip Staff
          </div>
          <h1 className="font-display text-[24px] font-bold text-[#0d2137] leading-tight mt-0.5">
            Xush kelibsiz, {STAFF_USER.firstName}!
          </h1>
          <p className="text-[12px] font-semibold text-[#64748B]">Bugun 12-Oktabr, Shanba</p>
        </div>
        <Link
          href="/staff/messages"
          className="relative p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F43F5E] border border-white" />
        </Link>
      </header>

      <section className="st-card p-4 bg-[#0d2137] text-white border-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#8fdfff]">
              Bugungi smena
            </div>
            <div className="font-display text-[22px] font-bold mt-1">08:00 - 16:00</div>
            <div className="text-[12px] font-semibold text-white/70 mt-1">
              Reception (Qabulxona)
            </div>
          </div>
          <span className="st-badge st-badge-ok bg-emerald-400/20 text-emerald-200">Faol</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        {DASH_KPIS.map((kpi) => (
          <div key={kpi.id} className="st-card p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {kpi.label}
            </div>
            <div className="font-display text-[26px] font-bold text-[#0d2137] mt-1">
              {kpi.value}
            </div>
            <div className="text-[11px] font-bold text-[#006781] mt-1">{kpi.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="st-btn st-btn-primary"
          onClick={() => toast.success("Smena boshlandi (demo)")}
        >
          <Play size={16} />
          Smena boshlash
        </button>
        <button
          type="button"
          className="st-btn st-btn-ghost"
          onClick={() => toast.message("Yordam — backend keyin")}
        >
          <HelpCircle size={16} />
          Yordam
        </button>
      </div>

      <Link href="/staff/training" className="st-card p-4 flex items-center gap-3 no-underline">
        <div className="w-10 h-10 rounded-xl bg-[#b9eaff] text-[#001f29] flex items-center justify-center shrink-0">
          <School size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[#0d2137]">Training portal</div>
          <div className="text-[11px] font-semibold text-[#64748B]">
            Kurslar, progress va sertifikatlar
          </div>
        </div>
        <span className="text-[12px] font-bold text-[#006781]">Ochish</span>
      </Link>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-bold text-[#0d2137]">So‘nggi yangiliklar</h2>
          <span className="text-[11px] font-bold text-[#94A3B8]">Demo</span>
        </div>
        <div className="space-y-2.5">
          {NEWS.map((n) => (
            <article key={n.id} className="st-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-[#0d2137]">{n.title}</h3>
                <span
                  className={
                    n.tone === "warn"
                      ? "st-badge st-badge-wait"
                      : n.tone === "ok"
                        ? "st-badge st-badge-ok"
                        : "st-badge st-badge-info"
                  }
                >
                  Yangi
                </span>
              </div>
              <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                {n.body}
              </p>
              <div className="mt-2 text-[11px] font-bold text-[#94A3B8]">{n.when}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
