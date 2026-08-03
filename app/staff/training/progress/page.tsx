"use client";

import { CERTIFICATES, UPCOMING_TRAININGS } from "../../mock-data";
import { TrainingTabs } from "../_tabs";

export default function StaffTrainingProgressPage() {
  return (
    <div className="space-y-4 st-animate">
      <header>
        <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
          Uzbekistan Training
        </div>
        <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">
          Mening yutuqlarim
        </h1>
        <p className="text-[12px] font-semibold text-[#64748B] mt-1">
          SafarTrip karyerangizdagi o‘sish ko‘rsatkichlari
        </p>
      </header>

      <TrainingTabs active="progress" />

      <section className="st-card p-4 bg-[#0d2137] text-white border-0">
        <div className="text-[11px] font-bold text-[#8fdfff]">
          Katta Gid darajasiga 250 XP qoldi
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              Umumiy kurs yakunlanishi
            </div>
            <div className="font-display text-[32px] font-bold mt-0.5">75%</div>
          </div>
          <span className="st-badge bg-emerald-400/20 text-emerald-200">Yakunlandi</span>
        </div>
        <div className="st-bar mt-3 bg-white/15">
          <span style={{ width: "75%", background: "linear-gradient(90deg,#8fdfff,#b9eaff)" }} />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-white/70">
          Siz hozirda “O‘rta darajali Gid” dasturining so‘nggi bosqichidasiz.
        </p>
      </section>

      <section id="badges">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-bold text-[#0d2137]">Sertifikatlar</h2>
          <span className="text-[11px] font-bold text-[#94A3B8]">Demo</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {CERTIFICATES.map((c) => (
            <article key={c.id} className="st-card p-4">
              <div className="w-9 h-9 rounded-xl bg-[#b9eaff] text-[#001f29] text-[11px] font-black flex items-center justify-center">
                OK
              </div>
              <h3 className="mt-2 text-[13px] font-bold text-[#0d2137]">{c.title}</h3>
              <p className="text-[11px] font-semibold text-[#64748B] mt-0.5">{c.when}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="st-card p-4">
        <h2 className="text-[13px] font-bold text-[#0d2137]">Keyingi lavozim: Jamoa Rahbari</h2>
        <p className="mt-1 text-[12px] font-semibold text-[#64748B]">
          Lavozim oshishi uchun quyidagi modullarni yakunlash talab etiladi:
        </p>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-[#f0f3ff] px-3 py-2.5 text-[12px] font-bold text-[#0d2137]">
            Liderlik Psixologiyasi · 12 soatlik kurs
          </div>
          <div className="rounded-xl bg-[#f0f3ff] px-3 py-2.5 text-[12px] font-bold text-[#0d2137] flex items-center justify-between">
            <span>Inqirozli Vaziyatlar Boshqaruvi</span>
            <span className="st-badge st-badge-wait">Navbatda</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[13px] font-bold text-[#0d2137] mb-2">Kelgusi mashg‘ulotlar</h2>
        <div className="space-y-2.5">
          {UPCOMING_TRAININGS.map((u) => (
            <article key={u.id} className="st-card p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#006781]">
                {u.when}
              </div>
              <h3 className="mt-1 text-[14px] font-bold text-[#0d2137]">{u.title}</h3>
              <p className="mt-1 text-[12px] font-semibold text-[#64748B]">{u.meta}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
