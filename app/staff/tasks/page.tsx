"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  assigneeName: string | null;
};

const FILTERS = [
  { id: "all", label: "Barchasi" },
  { id: "IN_PROGRESS", label: "Bajarilmoqda" },
  { id: "PENDING", label: "Kutilmoqda" },
  { id: "DONE", label: "Tugallangan" },
] as const;

function priorityBadge(p: string): string {
  if (p === "URGENT" || p === "HIGH") return "st-badge st-badge-high";
  if (p === "NORMAL") return "st-badge st-badge-mid";
  return "st-badge st-badge-low";
}

export default function StaffTasksPage() {
  const [filter, setFilter] = useState<string>("all");
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(status = filter) {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/tasks?status=${status}`, {
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
  }

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function syncHk() {
    try {
      const res = await fetch("/api/staff/tasks/sync", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(`Housekeeping sync: ${json.created} yangi`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync xato");
    }
  }

  async function createQuick() {
    const title = window.prompt("Vazifa nomi");
    if (!title?.trim()) return;
    try {
      const res = await fetch("/api/staff/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), priority: "NORMAL" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Yaratildi");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  async function advance(task: Task) {
    const next =
      task.status === "PENDING"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
          ? "DONE"
          : null;
    if (!next) return;
    try {
      const res = await fetch(`/api/staff/tasks/${task.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(next === "DONE" ? "Bajarildi" : "Jarayonda");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            SafarTrip Staff
          </div>
          <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">Vazifalar</h1>
          <p className="text-[12px] font-semibold text-[#64748B]">
            HotSOS / HelloShift uslubidagi ops tasks
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
            onClick={() => void syncHk()}
            title="Housekeeping sync"
          >
            <RefreshCw size={18} />
          </button>
          <button
            type="button"
            className="p-2.5 rounded-xl bg-[#006781] text-white"
            onClick={() => void createQuick()}
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? "st-chip st-chip-active shrink-0"
                : "st-chip st-chip-idle shrink-0"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="st-card p-8 text-center text-[#64748B] font-semibold">Yuklanmoqda…</div>
      ) : items.length === 0 ? (
        <div className="st-card p-8 text-center text-[#64748B] font-semibold">
          Vazifa yo‘q. Sync yoki yangi vazifa qo‘shing.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((task) => (
            <article key={task.id} className="st-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={priorityBadge(task.priority)}>{task.priority}</span>
                <span className="text-[11px] font-bold text-[#94A3B8]">
                  {task.dueAt
                    ? new Date(task.dueAt).toLocaleString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </span>
              </div>
              <h3 className="mt-2 text-[15px] font-bold text-[#0d2137]">{task.title}</h3>
              {task.description ? (
                <p className="mt-1 text-[12px] font-semibold text-[#64748B]">{task.description}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#64748B]">
                  {task.assigneeName ?? "Biriktirilmagan"}
                </span>
                {task.status !== "DONE" && task.status !== "CANCELLED" ? (
                  <button
                    type="button"
                    className="st-btn st-btn-primary py-2 px-3 text-[11px]"
                    onClick={() => void advance(task)}
                  >
                    {task.status === "PENDING" ? "Boshlash" : "Tugatish"}
                  </button>
                ) : (
                  <span className="st-badge st-badge-ok">{task.status}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
