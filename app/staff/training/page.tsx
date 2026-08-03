"use client";

import Link from "next/link";
import { TRAINING_COURSES, TRAINING_TRACKS } from "../mock-data";
import { TrainingTabs } from "./_tabs";

export default function StaffTrainingCatalogPage() {
  return (
    <div className="space-y-4 st-animate">
      <header>
        <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
          Uzbekistan Training
        </div>
        <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">
          Vazifalar va kurslar
        </h1>
        <p className="text-[12px] font-semibold text-[#64748B] mt-1">
          SafarTrip xodimlari uchun professional rivojlanish portali.
        </p>
      </header>

      <TrainingTabs active="catalog" />

      <section>
        <h2 className="text-[13px] font-bold text-[#0d2137] mb-2">Asosiy yo‘nalishlar</h2>
        <div className="space-y-2.5">
          {TRAINING_TRACKS.map((track) => (
            <article key={track.id} className="st-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[14px] font-bold text-[#0d2137]">{track.title}</h3>
                <span className="text-[12px] font-black text-[#006781]">{track.pct}%</span>
              </div>
              <p className="mt-1 text-[12px] font-semibold text-[#64748B]">{track.desc}</p>
              <div className="st-bar mt-3">
                <span style={{ width: `${track.pct}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-bold text-[#0d2137]">Tavsiya etilgan</h2>
          <Link href="/staff/training/module" className="text-[11px] font-bold text-[#006781]">
            Barchasini ko‘rish
          </Link>
        </div>
        <div className="space-y-2.5">
          {TRAINING_COURSES.map((course) => (
            <article key={course.id} className="st-card p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {course.tag}
              </div>
              <h3 className="mt-1 text-[14px] font-bold text-[#0d2137]">{course.title}</h3>
              <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                {course.desc}
              </p>
              <Link href="/staff/training/module" className="st-btn st-btn-primary mt-3 w-full">
                Boshlash
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
