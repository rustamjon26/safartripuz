"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, Play } from "lucide-react";
import { toast } from "sonner";
import { MODULE_STEPS } from "../../mock-data";

export default function StaffLearningModulePage() {
  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-start gap-3">
        <Link
          href="/staff/training"
          className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B] shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            Modul 04 · Mehmonnavozlik
          </div>
          <h1 className="font-display text-[22px] font-bold text-[#0d2137] mt-0.5 leading-tight">
            Premium mehmonlarga xizmat ko‘rsatish
          </h1>
        </div>
      </header>

      <section className="st-card p-4">
        <div className="flex items-center justify-between text-[12px] font-bold mb-2">
          <span className="text-[#64748B]">O‘rganish jarayoni</span>
          <span className="text-[#006781]">65%</span>
        </div>
        <div className="st-bar">
          <span style={{ width: "65%" }} />
        </div>
        <button
          type="button"
          className="st-btn st-btn-navy w-full mt-4"
          onClick={() => toast.message("Video player — demo")}
        >
          <Play size={16} />
          Kirish videosi: Birinchi taassurot kuchi (3:45)
        </button>
      </section>

      <section>
        <h2 className="text-[13px] font-bold text-[#0d2137] mb-2">O‘rganish bosqichlari</h2>
        <div className="space-y-2.5">
          {MODULE_STEPS.map((step) => (
            <article
              key={step.id}
              className={`st-card p-4 ${step.current ? "ring-2 ring-[#006781]/25" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f0f3ff] text-[#0d2137] text-[12px] font-black flex items-center justify-center shrink-0">
                  {step.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-bold text-[#0d2137]">{step.title}</h3>
                    {step.done ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : step.locked ? (
                      <Lock size={14} className="text-[#94A3B8] shrink-0" />
                    ) : (
                      <span className="st-badge st-badge-info">Hozir</span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                    {step.body}
                  </p>
                  {step.current ? (
                    <button
                      type="button"
                      className="st-btn st-btn-primary mt-3 py-2 px-3 text-[12px]"
                      onClick={() => toast.success("Bosqich ochildi (demo)")}
                    >
                      Hozir o‘rganish
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="st-card p-4">
        <h2 className="text-[14px] font-bold text-[#0d2137]">Bilimingizni sinab ko‘ring</h2>
        <p className="mt-1 text-[12px] font-semibold text-[#64748B]">
          Modulni yakunlash va “Mehmonnavozlik Ustasi” nishonini olish uchun testdan o‘ting.
        </p>
        <button
          type="button"
          className="st-btn st-btn-soft w-full mt-3"
          onClick={() => toast.message("Test — backend keyin")}
        >
          Testni boshlash
        </button>
      </section>
    </div>
  );
}
