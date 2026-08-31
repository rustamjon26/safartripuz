"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { staffFetch } from "../../_lib/staffFetch";
import { TrainingTabs } from "../_tabs";

type Course = {
  id: string;
  title: string;
  progressPct: number;
  category: string;
};

export default function StaffTrainingProgressPage() {
  const [items, setItems] = useState<Course[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await staffFetch("/api/staff/training/courses", {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setItems((json.items ?? []).filter((c: Course) => c.progressPct > 0));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Xato");
      }
    })();
  }, []);

  const avg =
    items.length > 0
      ? Math.round(items.reduce((a, c) => a + c.progressPct, 0) / items.length)
      : 0;

  return (
    <div className="space-y-4 st-animate">
      <header>
        <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
          Uzbekistan Training
        </div>
        <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">
          Mening yutuqlarim
        </h1>
      </header>

      <TrainingTabs active="progress" />

      <section className="st-card p-4 bg-[#0d2137] text-white border-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          Umumiy kurs yakunlanishi
        </div>
        <div className="font-display text-[32px] font-bold mt-0.5">{avg}%</div>
        <div className="st-bar mt-3 bg-white/15">
          <span
            style={{
              width: `${avg}%`,
              background: "linear-gradient(90deg,#8fdfff,#b9eaff)",
            }}
          />
        </div>
      </section>

      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="st-card p-8 text-center text-[#64748B] font-semibold text-[13px]">
            Hali progress yo‘q — Catalogdan kurs boshlang.
          </div>
        ) : (
          items.map((c) => (
            <article key={c.id} className="st-card p-4">
              <div className="flex justify-between gap-2">
                <h3 className="text-[14px] font-bold text-[#0d2137]">{c.title}</h3>
                <span className="text-[12px] font-black text-[#006781]">{c.progressPct}%</span>
              </div>
              <div className="st-bar mt-2">
                <span style={{ width: `${c.progressPct}%` }} />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
