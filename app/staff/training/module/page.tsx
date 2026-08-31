"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { staffFetch } from "../../_lib/staffFetch";

type Module = {
  id: string;
  sortOrder: number;
  title: string;
  body: string | null;
  completed: boolean;
};

type Course = {
  id: string;
  title: string;
  progressPct: number;
};

export default function StaffLearningModulePage() {
  const sp = useSearchParams();
  const courseId = sp.get("courseId") ?? "";
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!courseId) return;
    setLoading(true);
    try {
      // ensure enrollment
      await staffFetch(`/api/staff/training/courses/${courseId}`, {
        method: "POST",
        credentials: "include",
      });
      const res = await staffFetch(`/api/staff/training/courses/${courseId}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setCourse(json.course);
      setModules(json.modules ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function complete(moduleId: string) {
    try {
      const res = await staffFetch(`/api/staff/training/courses/${courseId}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setCourse(json.course);
      setModules(json.modules ?? []);
      toast.success("Bosqich yakunlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  if (!courseId) {
    return (
      <div className="st-card p-8 text-center">
        <p className="font-semibold text-[#64748B]">Kurs tanlanmagan</p>
        <Link href="/staff/training" className="st-btn st-btn-primary mt-4">
          Catalog
        </Link>
      </div>
    );
  }

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
            Modul · Mehmonnavozlik
          </div>
          <h1 className="font-display text-[22px] font-bold text-[#0d2137] mt-0.5 leading-tight">
            {course?.title ?? "…"}
          </h1>
        </div>
      </header>

      <section className="st-card p-4">
        <div className="flex items-center justify-between text-[12px] font-bold mb-2">
          <span className="text-[#64748B]">O‘rganish jarayoni</span>
          <span className="text-[#006781]">{course?.progressPct ?? 0}%</span>
        </div>
        <div className="st-bar">
          <span style={{ width: `${course?.progressPct ?? 0}%` }} />
        </div>
      </section>

      {loading ? (
        <div className="st-card p-8 text-center text-[#64748B] font-semibold">Yuklanmoqda…</div>
      ) : (
        <div className="space-y-2.5">
          {modules.map((step) => (
            <article key={step.id} className="st-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f0f3ff] text-[#0d2137] text-[12px] font-black flex items-center justify-center shrink-0">
                  {step.sortOrder}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[13px] font-bold text-[#0d2137]">{step.title}</h3>
                    {step.completed ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : null}
                  </div>
                  {step.body ? (
                    <p className="mt-1 text-[12px] font-semibold text-[#64748B]">{step.body}</p>
                  ) : null}
                  {!step.completed ? (
                    <button
                      type="button"
                      className="st-btn st-btn-primary mt-3 py-2 px-3 text-[12px]"
                      onClick={() => void complete(step.id)}
                    >
                      Bajarildi deb belgilash
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
