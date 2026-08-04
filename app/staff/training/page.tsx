"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { staffFetch } from "../_lib/staffFetch";
import { TrainingTabs } from "./_tabs";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  durationMin: number;
  progressPct: number;
  enrolled: boolean;
};

export default function StaffTrainingCatalogPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await staffFetch("/api/staff/training/courses", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setItems(json.items ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Xato");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          Micro-learning (Weldon / 7shifts training pattern).
        </p>
      </header>

      <TrainingTabs active="catalog" />

      {loading ? (
        <div className="st-card p-8 text-center text-[#64748B] font-semibold">Yuklanmoqda…</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((course) => (
            <article key={course.id} className="st-card p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {course.category} · {course.durationMin} min
              </div>
              <h3 className="mt-1 text-[14px] font-bold text-[#0d2137]">{course.title}</h3>
              {course.description ? (
                <p className="mt-1 text-[12px] font-semibold text-[#64748B]">{course.description}</p>
              ) : null}
              <div className="st-bar mt-3">
                <span style={{ width: `${course.progressPct}%` }} />
              </div>
              <div className="mt-1 text-[11px] font-bold text-[#006781]">
                {course.progressPct}% · {course.enrolled ? "Yozilgan" : "Yangi"}
              </div>
              <Link
                href={`/staff/training/module?courseId=${course.id}`}
                className="st-btn st-btn-primary mt-3 w-full"
              >
                {course.enrolled ? "Davom etish" : "Boshlash"}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
