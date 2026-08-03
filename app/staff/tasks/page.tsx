"use client";

import { useMemo, useState } from "react";
import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TASKS, type TaskStatus } from "../mock-data";

const FILTERS: Array<{ id: "all" | TaskStatus; label: string }> = [
  { id: "all", label: "Barchasi" },
  { id: "progress", label: "Bajarilmoqda" },
  { id: "pending", label: "Kutilmoqda" },
  { id: "done", label: "Tugallangan" },
];

function priorityBadge(p: string): string {
  if (p === "high") return "st-badge st-badge-high";
  if (p === "mid") return "st-badge st-badge-mid";
  if (p === "done") return "st-badge st-badge-done";
  return "st-badge st-badge-low";
}

function priorityLabel(p: string): string {
  if (p === "high") return "Yuqori";
  if (p === "mid") return "O‘rta";
  if (p === "done") return "Tugallangan";
  return "Past";
}

function statusLabel(s: TaskStatus): string {
  if (s === "progress") return "Bajarilmoqda";
  if (s === "done") return "Bajarildi";
  return "Kutilmoqda";
}

export default function StaffTasksPage() {
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const list = useMemo(
    () => (filter === "all" ? TASKS : TASKS.filter((t) => t.status === filter)),
    [filter],
  );

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            SafarTrip Staff
          </div>
          <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">Vazifalar</h1>
          <p className="text-[12px] font-semibold text-[#64748B]">
            Bugun uchun {TASKS.filter((t) => t.status !== "done").length} ta faol vazifa
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="p-2.5 rounded-xl bg-[#006781] text-white"
            onClick={() => toast.message("Yangi vazifa — backend keyin")}
          >
            <Plus size={18} />
          </button>
          <Link
            href="/staff/messages"
            className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
          >
            <Bell size={18} />
          </Link>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={filter === f.id ? "st-chip st-chip-active shrink-0" : "st-chip st-chip-idle shrink-0"}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {list.length === 0 ? (
          <div className="st-card p-8 text-center">
            <div className="text-[14px] font-bold text-[#0d2137]">Hozircha vazifalar yo‘q</div>
            <p className="text-[12px] font-semibold text-[#64748B] mt-1">
              Biroz dam olishingiz mumkin!
            </p>
          </div>
        ) : (
          list.map((task) => (
            <article key={task.id} className="st-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={priorityBadge(task.priority)}>{priorityLabel(task.priority)}</span>
                <span className="text-[11px] font-bold text-[#94A3B8]">{task.due}</span>
              </div>
              <h3 className="mt-2 text-[15px] font-bold text-[#0d2137]">{task.title}</h3>
              <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                {task.desc}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#0d2137] text-white text-[10px] font-bold flex items-center justify-center">
                    {task.initials}
                  </div>
                  <span className="text-[11px] font-bold text-[#64748B]">{task.assignee}</span>
                </div>
                <span
                  className={
                    task.status === "done"
                      ? "st-badge st-badge-ok"
                      : task.status === "progress"
                        ? "st-badge st-badge-info"
                        : "st-badge st-badge-wait"
                  }
                >
                  {statusLabel(task.status)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
