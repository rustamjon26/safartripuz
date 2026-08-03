"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, HelpCircle, Play, School } from "lucide-react";
import { toast } from "sonner";

type Dash = {
  ctx: { displayName: string; department: string };
  todayTasks: number;
  todayShift: null | {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: string;
    location: string | null;
  };
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StaffDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/dashboard", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xato");
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function clockIn() {
    if (!data?.todayShift) {
      toast.message("Bugungi smena yo‘q — manager smena yaratsin");
      return;
    }
    if (data.todayShift.status !== "SCHEDULED") {
      toast.message(`Smena holati: ${data.todayShift.status}`);
      return;
    }
    try {
      const res = await fetch(`/api/staff/shifts/${data.todayShift.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Smena boshlandi");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  const firstName = data?.ctx.displayName?.split(" ")[0] ?? "…";

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            SafarTrip Staff
          </div>
          <h1 className="font-display text-[24px] font-bold text-[#0d2137] leading-tight mt-0.5">
            Xush kelibsiz, {loading ? "…" : firstName}!
          </h1>
          <p className="text-[12px] font-semibold text-[#64748B]">
            {data?.ctx.department ?? "—"} · bugungi ops holat
          </p>
        </div>
        <Link
          href="/staff/messages"
          className="relative p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <section className="st-card p-4 bg-[#0d2137] text-white border-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#8fdfff]">
              Bugungi smena
            </div>
            {data?.todayShift ? (
              <>
                <div className="font-display text-[22px] font-bold mt-1">
                  {fmtTime(data.todayShift.startsAt)} - {fmtTime(data.todayShift.endsAt)}
                </div>
                <div className="text-[12px] font-semibold text-white/70 mt-1">
                  {data.todayShift.title}
                  {data.todayShift.location ? ` · ${data.todayShift.location}` : ""}
                </div>
              </>
            ) : (
              <div className="font-display text-[18px] font-bold mt-2 text-white/80">
                Rejalashtirilgan smena yo‘q
              </div>
            )}
          </div>
          <span className="st-badge st-badge-ok bg-emerald-400/20 text-emerald-200">
            {data?.todayShift?.status ?? "—"}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="st-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Bugungi vazifalar
          </div>
          <div className="font-display text-[26px] font-bold text-[#0d2137] mt-1">
            {data?.todayTasks ?? "—"}
          </div>
        </div>
        <Link href="/staff/training" className="st-card p-4 no-underline">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Training
          </div>
          <div className="text-[13px] font-bold text-[#006781] mt-2 flex items-center gap-1">
            <School size={16} /> Kurslar
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="st-btn st-btn-primary" onClick={() => void clockIn()}>
          <Play size={16} />
          Smena boshlash
        </button>
        <Link href="/staff/tasks" className="st-btn st-btn-ghost">
          <HelpCircle size={16} />
          Vazifalar
        </Link>
      </div>
    </div>
  );
}
