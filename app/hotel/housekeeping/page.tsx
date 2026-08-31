"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";
import {
  AlertTriangle,
  Brush,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Room {
  id: string;
  roomNumber: string;
  status: string;
  floor: number;
  roomType: { name: string };
}

interface Staff {
  id: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface Task {
  id: string;
  physicalRoom: Room;
  staff: Staff | null;
  assigneeName: string | null;
  taskType: "CLEANING" | "MAINTENANCE" | "INSPECTION";
  status: "PENDING" | "IN_PROGRESS" | "DONE" | "VERIFIED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  notes: string | null;
  createdAt: string;
}

interface HotelUserMe {
  role?: string;
  hotelStaff?: { role?: string } | null;
}

const TYPE_META = {
  CLEANING: { label: "housekeeping.types.CLEANING", icon: Brush },
  MAINTENANCE: { label: "housekeeping.types.MAINTENANCE", icon: Wrench },
  INSPECTION: { label: "housekeeping.types.INSPECTION", icon: ShieldCheck },
} as const;

const PRIORITY_LABELS = {
  LOW: "housekeeping.priorities.LOW",
  NORMAL: "housekeeping.priorities.NORMAL",
  HIGH: "housekeeping.priorities.HIGH",
  URGENT: "housekeeping.priorities.URGENT",
} as const;

const STAFF_LOAD_MAX = 5;
const LOW_STOCK_THRESHOLD = 15;

function staffInitials(staff: Staff): string {
  return `${staff.firstName?.[0] ?? ""}${staff.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function staffName(staff: Staff): string {
  return `${staff.firstName} ${staff.lastName ?? ""}`.trim();
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusBadgeClass(status: Task["status"]): string {
  switch (status) {
    case "PENDING":
      return "bg-rose-100 text-rose-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800";
    case "DONE":
      return "bg-teal-100 text-[#006781]";
    case "VERIFIED":
      return "bg-[#d8e3fb] text-[#0d2137]";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function priorityBadgeClass(priority: Task["priority"]): string {
  if (priority === "URGENT") return "bg-[#F43F5E] text-white";
  if (priority === "HIGH") return "bg-rose-100 text-rose-700";
  if (priority === "LOW") return "bg-slate-100 text-slate-500";
  return "bg-[#f0f3ff] text-[#64748B]";
}

export default function HousekeepingPage() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [currentUser, setCurrentUser] = useState<HotelUserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [finishingTask, setFinishingTask] = useState<Task | null>(null);
  const [assigningTask, setAssigningTask] = useState<Task | null>(null);
  const [quickStaffId, setQuickStaffId] = useState("");
  const [search, setSearch] = useState("");
  const [showAllStaff, setShowAllStaff] = useState(false);

  const [formData, setFormData] = useState({
    physicalRoomId: "",
    staffId: "",
    taskType: "CLEANING",
    priority: "NORMAL",
    notes: "",
  });
  const [consumptions, setConsumptions] = useState<{ itemId: string; quantity: number }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [hRes, uRes, invRes] = await Promise.all([
        hotelFetch("/api/hotel/housekeeping"),
        hotelFetch("/api/user/me"),
        hotelFetch("/api/hotel/inventory"),
      ]);

      const hData = await hRes.json();
      if (hRes.ok) {
        setTasks(hData.tasks);
        setRooms(hData.rooms);
        setStaffList(hData.staffList || []);
      }

      const uData = await uRes.json();
      if (uRes.ok) setCurrentUser(uData.user ?? uData);

      const invData = await invRes.json();
      if (invRes.ok) {
        const items = Array.isArray(invData) ? invData : invData.items || [];
        setInventory(items);
      }
    } catch {
      toast.error(t("housekeeping.toasts.update_error"));
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const isManager = currentUser?.role === "hotel_manager" || currentUser?.role === "admin";
  const userRole = currentUser?.hotelStaff?.role || (isManager ? "MANAGER" : "STAFF");
  const isCleaner = userRole === "CLEANER";

  const stats = useMemo(() => {
    const pending = tasks.filter((x) => x.status === "PENDING");
    const inProgress = tasks.filter((x) => x.status === "IN_PROGRESS");
    const cleaned = tasks.filter((x) => x.status === "DONE" || x.status === "VERIFIED");
    const urgent = pending.filter((x) => x.priority === "URGENT" || x.priority === "HIGH");
    return {
      needs: pending.length,
      urgent: urgent.length,
      active: inProgress.length,
      cleaned: cleaned.length,
      queued: pending.length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
      const room = task.physicalRoom?.roomNumber?.toLowerCase() ?? "";
      const type = task.physicalRoom?.roomType?.name?.toLowerCase() ?? "";
      const name = task.staff ? staffName(task.staff).toLowerCase() : "";
      return room.includes(q) || type.includes(q) || name.includes(q) || task.status.toLowerCase().includes(q);
    });
  }, [tasks, search]);

  const staffRows = useMemo(() => {
    return staffList.map((s) => {
      const assigned = tasks.filter(
        (task) =>
          task.staff?.id === s.id &&
          (task.status === "PENDING" || task.status === "IN_PROGRESS"),
      );
      const active = assigned.find((task) => task.status === "IN_PROGRESS") ?? assigned[0] ?? null;
      return {
        staff: s,
        load: Math.min(assigned.length, STAFF_LOAD_MAX),
        activeRoom: active?.physicalRoom?.roomNumber ?? null,
        busy: Boolean(active),
      };
    });
  }, [staffList, tasks]);

  const visibleStaff = showAllStaff ? staffRows : staffRows.slice(0, 4);
  const lowStockItems = inventory.filter((item) => item.quantity <= LOW_STOCK_THRESHOLD);
  const inventoryMax = Math.max(80, ...inventory.map((i) => i.quantity), 1);

  async function updateStatus(
    id: string,
    newStatus: string,
    selectedConsumptions: { itemId: string; quantity: number }[] = [],
  ) {
    try {
      const res = await hotelFetch(`/api/hotel/housekeeping/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, consumptions: selectedConsumptions }),
      });
      if (res.ok) {
        toast.success(t("housekeeping.toasts.update_success"));
        setFinishingTask(null);
        setConsumptions([]);
        void load();
      } else {
        toast.error(t("housekeeping.toasts.update_error"));
      }
    } catch {
      toast.error(t("housekeeping.toasts.update_error"));
    }
  }

  async function assignStaffToTask(taskId: string, staffId: string) {
    if (!isManager) return toast.error(t("housekeeping.toasts.no_permission"));
    try {
      const res = await hotelFetch(`/api/hotel/housekeeping/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (res.ok) {
        toast.success(t("housekeeping.toasts.update_success"));
        setAssigningTask(null);
        setQuickStaffId("");
        void load();
      } else {
        toast.error(t("housekeeping.toasts.update_error"));
      }
    } catch {
      toast.error(t("housekeeping.toasts.update_error"));
    }
  }

  async function handleDelete(id: string) {
    if (!isManager) return toast.error(t("housekeeping.toasts.no_permission"));
    if (!confirm(t("housekeeping.toasts.delete_confirm"))) return;
    try {
      const res = await hotelFetch(`/api/hotel/housekeeping/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("housekeeping.toasts.delete_success"));
        void load();
      }
    } catch {
      toast.error(t("housekeeping.toasts.update_error"));
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!isManager) return toast.error(t("housekeeping.toasts.no_permission"));
    try {
      const res = await hotelFetch("/api/hotel/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success(t("housekeeping.toasts.assign_success"));
        setAssigning(false);
        setFormData({
          physicalRoomId: "",
          staffId: "",
          taskType: "CLEANING",
          priority: "NORMAL",
          notes: "",
        });
        void load();
      } else {
        toast.error(t("housekeeping.toasts.assign_error"));
      }
    } catch {
      toast.error(t("common.error"));
    }
  }

  const addConsumption = (itemId: string) => {
    const existing = consumptions.find((c) => c.itemId === itemId);
    if (existing) {
      setConsumptions(
        consumptions.map((c) =>
          c.itemId === itemId ? { ...c, quantity: c.quantity + 1 } : c,
        ),
      );
    } else {
      setConsumptions([...consumptions, { itemId, quantity: 1 }]);
    }
  };

  function statusLabel(status: Task["status"]): string {
    switch (status) {
      case "PENDING":
        return t("housekeeping.dispatcher.status_pending");
      case "IN_PROGRESS":
        return t("housekeeping.dispatcher.status_progress");
      case "DONE":
        return t("housekeeping.dispatcher.status_done");
      case "VERIFIED":
        return t("housekeeping.dispatcher.status_verified");
      default:
        return status;
    }
  }

  const columns = [
    {
      id: "PENDING",
      title: t("housekeeping.columns.pending"),
      activeTasks: tasks.filter((x) => x.status === "PENDING"),
    },
    {
      id: "IN_PROGRESS",
      title: t("housekeeping.columns.in_progress"),
      activeTasks: tasks.filter((x) => x.status === "IN_PROGRESS"),
    },
    {
      id: "DONE",
      title: t("housekeeping.columns.done"),
      activeTasks: tasks.filter((x) => x.status === "DONE" || x.status === "VERIFIED"),
    },
  ];

  return (
    <div className="space-y-5 pb-24 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0d2137] font-display tracking-tight flex items-center gap-2">
            <Brush size={22} className="text-[#006781]" />
            {t("housekeeping.title")}
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1">
            {isCleaner ? t("housekeeping.subtitle_cleaner") : t("housekeeping.subtitle_manager")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("housekeeping.search_placeholder")}
              className="pl-9 pr-3 py-2.5 w-48 sm:w-64 rounded-full bg-[#f0f3ff] border-0 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] outline-none focus:ring-2 focus:ring-[#006781]/30"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="p-2.5 bg-white border border-[#d8e3fb] text-[#64748B] rounded-lg hover:bg-[#f0f3ff] transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006781] text-white text-[13px] font-[family-name:var(--font-sora)] font-semibold rounded-lg hover:bg-[#005a71] transition-colors shadow-sm"
            >
              <Plus size={16} /> {t("housekeeping.assign_task")}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5 hover:border-rose-200 transition-colors">
          <div className="flex justify-between items-start">
            <span className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </span>
            {stats.urgent > 0 ? (
              <span className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#F43F5E]">
                +{stats.urgent}
              </span>
            ) : null}
          </div>
          <p className="mt-4 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            {t("housekeeping.stats.needs_cleaning")}
          </p>
          <p className="text-[28px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {loading ? "—" : stats.needs}
          </p>
          {stats.urgent > 0 ? (
            <p className="text-[11px] font-semibold text-[#F43F5E] mt-1">
              {t("housekeeping.stats.urgent_count", { count: stats.urgent })}
            </p>
          ) : null}
        </div>

        <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5 hover:border-amber-200 transition-colors">
          <div className="flex justify-between items-start">
            <span className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Loader2 size={18} />
            </span>
            <span className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-amber-700">
              {t("housekeeping.stats.in_progress_badge")}
            </span>
          </div>
          <p className="mt-4 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            {t("housekeeping.stats.in_progress")}
          </p>
          <p className="text-[28px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {loading ? "—" : stats.active}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5 hover:border-teal-200 transition-colors">
          <div className="flex justify-between items-start">
            <span className="w-9 h-9 rounded-lg bg-teal-100 text-[#006781] flex items-center justify-center">
              <CheckCircle2 size={18} />
            </span>
            <span className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-emerald-600">
              {t("housekeeping.stats.cleaned_badge")}
            </span>
          </div>
          <p className="mt-4 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            {t("housekeeping.stats.cleaned")}
          </p>
          <p className="text-[28px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {loading ? "—" : stats.cleaned}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5 hover:border-sky-200 transition-colors">
          <div className="flex justify-between items-start">
            <span className="w-9 h-9 rounded-lg bg-[#f0f3ff] text-[#0d2137] flex items-center justify-center">
              <ClipboardList size={18} />
            </span>
            <span className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-sky-600">
              {t("housekeeping.stats.queued_badge")}
            </span>
          </div>
          <p className="mt-4 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B]">
            {t("housekeeping.stats.queued")}
          </p>
          <p className="text-[28px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {loading ? "—" : stats.queued}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#64748B]">
          <Loader2 size={32} className="animate-spin mx-auto mb-4 text-[#006781]" />
          <p className="font-[family-name:var(--font-sora)] font-semibold uppercase tracking-widest text-xs">
            {t("housekeeping.loading")}
          </p>
        </div>
      ) : isCleaner ? (
        /* Cleaner: keep kanban cards, Silk Road colors */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {columns.map((col) => (
            <div
              key={col.id}
              className="bg-[#f0f3ff]/60 border border-[#d8e3fb] rounded-2xl p-4 min-h-[420px]"
            >
              <div className="flex items-center justify-between mb-4 border-b border-[#d8e3fb] pb-3">
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[#0d2137] text-[12px] uppercase tracking-wider">
                  {col.title}
                </h3>
                <span className="w-6 h-6 rounded-md bg-white border border-[#d8e3fb] flex items-center justify-center text-[11px] font-bold">
                  {col.activeTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {col.activeTasks.map((task) => {
                  const typeMeta = TYPE_META[task.taskType] || TYPE_META.CLEANING;
                  return (
                    <div
                      key={task.id}
                      className="bg-white border border-[#d8e3fb] rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="h-badge h-badge-info inline-flex items-center gap-1">
                          <typeMeta.icon size={10} /> {t(typeMeta.label)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            task.priority === "URGENT" ? "text-[#F43F5E]" : "text-[#64748B]"
                          }`}
                        >
                          {t(PRIORITY_LABELS[task.priority])}
                        </span>
                      </div>
                      <div className="font-display font-bold text-[18px] text-[#0d2137] mb-1">
                        {t("housekeeping.task_card.room")} {task.physicalRoom?.roomNumber || "?"}
                      </div>
                      <div className="text-[11px] font-semibold text-[#64748B] mb-3 uppercase">
                        {task.physicalRoom?.roomType?.name}
                      </div>
                      <div className="flex gap-2">
                        {task.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => void updateStatus(task.id, "IN_PROGRESS")}
                            className="flex-1 py-2.5 rounded-lg bg-[#f0f3ff] text-[#006781] text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase"
                          >
                            {t("housekeeping.task_card.start_btn")}
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            type="button"
                            onClick={() => setFinishingTask(task)}
                            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 size={13} /> {t("housekeeping.task_card.finish_btn")}
                          </button>
                        )}
                        {(task.status === "DONE" || task.status === "VERIFIED") && (
                          <div className="w-full text-center text-[10px] font-bold text-[#64748B] border border-[#d8e3fb] rounded-lg py-2.5 uppercase bg-[#f9f9ff]">
                            {t("housekeeping.task_card.closed")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {col.activeTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-[#c4c6cd]">
                    <Clock size={32} strokeWidth={1} className="mb-2 opacity-50" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">
                      {t("housekeeping.task_card.no_tasks")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Manager: Stitch dispatcher layout */
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="bg-white rounded-xl border border-[#d8e3fb] overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-[#d8e3fb] bg-[#f9f9ff]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display font-semibold text-[18px] sm:text-[20px] text-[#111c2d]">
                  {t("housekeeping.dispatcher.title")}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-emerald-600 uppercase tracking-wider">
                    {t("housekeeping.live")}
                  </span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead>
                  <tr className="bg-[#f0f3ff] text-[#64748B] text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">{t("housekeeping.dispatcher.col_room")}</th>
                    <th className="px-5 py-3">{t("housekeeping.dispatcher.col_priority")}</th>
                    <th className="px-5 py-3">{t("housekeeping.dispatcher.col_status")}</th>
                    <th className="px-5 py-3">{t("housekeeping.dispatcher.col_staff")}</th>
                    <th className="px-5 py-3">{t("housekeeping.dispatcher.col_when")}</th>
                    <th className="px-5 py-3 text-right">{t("housekeeping.dispatcher.col_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d8e3fb]">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-sm font-semibold text-[#64748B]">
                        {t("housekeeping.task_card.no_tasks")}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-[#f9f9ff] transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-[family-name:var(--font-sora)] font-semibold text-[#0d2137]">
                            #{task.physicalRoom?.roomNumber ?? "?"}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {task.physicalRoom?.roomType?.name ?? "—"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${priorityBadgeClass(task.priority)}`}
                          >
                            {t(PRIORITY_LABELS[task.priority])}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-[family-name:var(--font-sora)] font-semibold ${statusBadgeClass(task.status)}`}
                          >
                            {statusLabel(task.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {task.staff ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#0d2137] text-white text-[10px] font-bold flex items-center justify-center">
                                {staffInitials(task.staff)}
                              </div>
                              <span className="text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d]">
                                {staffName(task.staff)}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningTask(task);
                                setQuickStaffId("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#006781] text-[#006781] rounded-lg text-[12px] font-[family-name:var(--font-sora)] font-semibold hover:bg-[#006781]/5"
                            >
                              <UserPlus size={14} />
                              {t("housekeeping.dispatcher.assign_staff")}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-[#64748B] tabular-nums whitespace-nowrap">
                          {formatWhen(task.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => void updateStatus(task.id, "IN_PROGRESS")}
                                className="px-2.5 py-1.5 rounded-lg bg-[#f0f3ff] text-[#006781] text-[11px] font-semibold"
                              >
                                {t("housekeeping.task_card.start_btn")}
                              </button>
                            )}
                            {task.status === "IN_PROGRESS" && (
                              <button
                                type="button"
                                onClick={() => setFinishingTask(task)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                              >
                                {t("housekeeping.task_card.finish_btn")}
                              </button>
                            )}
                            {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(task.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                                aria-label="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            {/* Staff panel */}
            <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] flex items-center gap-2 text-[14px]">
                  <Users size={18} className="text-[#006781]" />
                  {t("housekeeping.staff_panel.title")}
                </h3>
                <span className="text-[11px] bg-[#f0f3ff] px-2 py-1 rounded font-bold text-[#64748B]">
                  {t("housekeeping.staff_panel.total", { count: staffList.length })}
                </span>
              </div>
              <div className="space-y-3">
                {visibleStaff.length === 0 ? (
                  <p className="text-xs font-semibold text-[#64748B] py-6 text-center">—</p>
                ) : (
                  visibleStaff.map(({ staff, load, activeRoom, busy }) => (
                    <div
                      key={staff.id}
                      className={`p-3 rounded-xl border ${
                        busy
                          ? "bg-[#f0f3ff] border-[#d8e3fb]"
                          : "bg-white border-[#d8e3fb]/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#0d2137] text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {staffInitials(staff)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-[family-name:var(--font-sora)] font-semibold text-[13px] text-[#111c2d] truncate">
                              {staffName(staff)}
                            </p>
                            <p
                              className={`text-[11px] font-medium ${
                                busy ? "text-[#006781]" : "text-[#64748B]"
                              }`}
                            >
                              {busy && activeRoom
                                ? t("housekeeping.staff_panel.room_task", { room: activeRoom })
                                : t("housekeeping.staff_panel.free")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-[10px] font-bold ${
                              load === 0 ? "text-emerald-600" : "text-[#64748B]"
                            }`}
                          >
                            {t("housekeeping.staff_panel.load", {
                              current: load,
                              max: STAFF_LOAD_MAX,
                            })}
                          </p>
                          <div className="w-12 h-1 bg-[#f0f3ff] rounded-full mt-1 ml-auto overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                load === 0 ? "bg-emerald-500" : "bg-[#006781]"
                              }`}
                              style={{ width: `${(load / STAFF_LOAD_MAX) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {staffRows.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllStaff((v) => !v)}
                  className="w-full mt-4 py-2 border border-[#d8e3fb] rounded-lg text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-[#f0f3ff] transition-colors"
                >
                  {t("housekeeping.staff_panel.see_all")}
                </button>
              ) : null}
            </div>

            {/* Inventory panel */}
            <div className="bg-white rounded-xl border border-[#d8e3fb] p-4 sm:p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] flex items-center gap-2 text-[14px]">
                  <Package size={18} className="text-[#006781]" />
                  {t("housekeeping.inventory_panel.title")}
                </h3>
              </div>
              {inventory.length === 0 ? (
                <p className="text-xs font-semibold text-[#64748B] py-6 text-center">
                  {t("housekeeping.inventory_panel.empty")}
                </p>
              ) : (
                <div className="space-y-4">
                  {inventory.slice(0, 5).map((item) => {
                    const low = item.quantity <= LOW_STOCK_THRESHOLD;
                    const pct = Math.min(100, Math.round((item.quantity / inventoryMax) * 100));
                    return (
                      <div key={item.id}>
                        <div className="flex justify-between text-[12px] mb-1 gap-2">
                          <span className="text-[#64748B] font-medium truncate">{item.name}</span>
                          <span
                            className={`font-bold shrink-0 ${low ? "text-[#F43F5E]" : "text-[#111c2d]"}`}
                          >
                            {t("housekeeping.inventory_panel.remaining", {
                              count: item.quantity,
                            })}
                          </span>
                        </div>
                        <div className="w-full bg-[#f0f3ff] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              low ? "bg-[#F43F5E]" : pct > 60 ? "bg-emerald-500" : "bg-[#006781]"
                            }`}
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        {low ? (
                          <p className="text-[10px] font-bold text-[#F43F5E] mt-1 uppercase tracking-wide">
                            {t("housekeeping.inventory_panel.critical")}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {lowStockItems.length > 0 ? (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <p className="text-[11px] font-medium text-rose-700 leading-relaxed">
                    {t("housekeeping.inventory_panel.low_alert")}
                  </p>
                  <Link
                    href="/hotel/services/inv"
                    className="mt-3 block w-full text-center py-2.5 rounded-lg bg-[#F43F5E] text-white text-[12px] font-[family-name:var(--font-sora)] font-semibold hover:bg-rose-600 transition-colors"
                  >
                    {t("housekeeping.inventory_panel.order")}
                  </Link>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      {/* FAB for managers on mobile */}
      {isManager && !assigning ? (
        <button
          type="button"
          onClick={() => setAssigning(true)}
          className="fixed bottom-20 right-5 lg:bottom-8 z-30 w-14 h-14 rounded-full bg-[#006781] text-white shadow-[0_8px_24px_rgba(0,103,129,0.35)] flex items-center justify-center hover:bg-[#005a71] transition-colors xl:hidden"
          aria-label={t("housekeeping.assign_task")}
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      ) : null}

      {/* Quick assign staff modal */}
      {assigningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000917]/45 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#d8e3fb]">
              <div>
                <h3 className="font-display font-semibold text-[#0d2137] text-[17px]">
                  {t("housekeeping.dispatcher.assign_staff")}
                </h3>
                <p className="text-[12px] text-[#64748B] mt-0.5 font-medium">
                  #{assigningTask.physicalRoom?.roomNumber} ·{" "}
                  {assigningTask.physicalRoom?.roomType?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningTask(null)}
                className="p-2 text-[#64748B] hover:bg-[#f0f3ff] rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <select
                value={quickStaffId}
                onChange={(e) => setQuickStaffId(e.target.value)}
                className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781]"
              >
                <option value="">{t("housekeeping.modal_assign.select_staff_placeholder")}</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {staffName(s)} ({s.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!quickStaffId}
                onClick={() => void assignStaffToTask(assigningTask.id, quickStaffId)}
                className="w-full py-3.5 bg-[#006781] text-white text-[13px] font-[family-name:var(--font-sora)] font-semibold rounded-xl hover:bg-[#005a71] disabled:opacity-50"
              >
                {t("housekeeping.dispatcher.assign_staff")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000917]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#d8e3fb] bg-[#f9f9ff]">
              <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">
                {t("housekeeping.modal_assign.title")}
              </h3>
              <button
                type="button"
                onClick={() => setAssigning(false)}
                className="p-2 text-[#64748B] hover:text-[#0d2137] bg-white rounded-xl border border-[#d8e3fb]"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => void handleAssign(e)} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase mb-2 tracking-widest">
                  {t("housekeeping.modal_assign.select_room")}
                </label>
                <select
                  required
                  value={formData.physicalRoomId}
                  onChange={(e) => setFormData({ ...formData, physicalRoomId: e.target.value })}
                  className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781]"
                >
                  <option value="">{t("housekeeping.modal_assign.select_room_placeholder")}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} - {r.roomType.name} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase mb-2 tracking-widest">
                  {t("housekeeping.modal_assign.select_staff")}
                </label>
                <select
                  required
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781]"
                >
                  <option value="">{t("housekeeping.modal_assign.select_staff_placeholder")}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {staffName(s)} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase mb-2 tracking-widest">
                    {t("housekeeping.modal_assign.type")}
                  </label>
                  <select
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                    className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781]"
                  >
                    <option value="CLEANING">{t("housekeeping.types.CLEANING")}</option>
                    <option value="MAINTENANCE">{t("housekeeping.types.MAINTENANCE")}</option>
                    <option value="INSPECTION">{t("housekeeping.types.INSPECTION")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase mb-2 tracking-widest">
                    {t("housekeeping.modal_assign.priority")}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781]"
                  >
                    <option value="LOW">{t("housekeeping.priorities.LOW")}</option>
                    <option value="NORMAL">{t("housekeeping.priorities.NORMAL")}</option>
                    <option value="HIGH">{t("housekeeping.priorities.HIGH")}</option>
                    <option value="URGENT">{t("housekeeping.priorities.URGENT")}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase mb-2 tracking-widest">
                  {t("housekeeping.modal_assign.notes")}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder={t("housekeeping.modal_assign.notes_placeholder")}
                  className="w-full px-4 py-3 border border-[#d8e3fb] rounded-xl text-sm font-semibold bg-[#f9f9ff] outline-none focus:border-[#006781] resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-[#006781] text-white text-[13px] font-[family-name:var(--font-sora)] font-semibold rounded-xl hover:bg-[#005a71] transition-colors"
              >
                {t("housekeeping.modal_assign.submit")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Finishing / Consumption Modal */}
      {finishingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000917]/55 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-[#d8e3fb] bg-emerald-50/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-[#0d2137] text-[17px] leading-tight">
                  {t("housekeeping.task_card.room")} {finishingTask.physicalRoom.roomNumber} —{" "}
                  {t("housekeeping.modal_finish.title")}
                </h3>
                <p className="text-[12px] font-semibold text-[#64748B] mt-0.5 uppercase tracking-wide">
                  {t("housekeeping.modal_finish.subtitle")}
                </p>
              </div>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventory.map((item) => {
                  const count = consumptions.find((c) => c.itemId === item.id)?.quantity || 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                        count > 0
                          ? "bg-teal-50/50 border-teal-200"
                          : "bg-white border-[#d8e3fb] hover:border-[#c4c6cd]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#111c2d] truncate">{item.name}</div>
                        <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-widest">
                          {item.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {count > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setConsumptions(
                                  consumptions
                                    .map((c) =>
                                      c.itemId === item.id
                                        ? { ...c, quantity: Math.max(0, c.quantity - 1) }
                                        : c,
                                    )
                                    .filter((c) => c.quantity > 0),
                                )
                              }
                              className="w-7 h-7 rounded-lg bg-white border border-teal-200 text-[#006781] flex items-center justify-center"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-[14px] font-bold text-[#006781] min-w-[20px] text-center">
                              {count}
                            </span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => addConsumption(item.id)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#d8e3fb] text-[#64748B] hover:border-[#006781] hover:text-[#006781] flex items-center justify-center"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {inventory.length === 0 && (
                <p className="text-center py-10 text-[#64748B] font-bold text-xs uppercase tracking-widest">
                  {t("housekeeping.modal_finish.no_inventory")}
                </p>
              )}

              {consumptions.length > 0 && (
                <div className="mt-6 bg-[#f9f9ff] rounded-xl p-4 border border-dashed border-[#d8e3fb]">
                  <div className="text-[11px] font-bold text-[#64748B] uppercase mb-3 flex items-center gap-2">
                    <Package size={14} /> {t("housekeeping.modal_finish.summary")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {consumptions.map((c) => {
                      const name = inventory.find((i) => i.id === c.itemId)?.name;
                      return (
                        <div
                          key={c.itemId}
                          className="px-3 py-1.5 bg-white border border-[#d8e3fb] rounded-lg text-[12px] font-bold text-[#111c2d] flex items-center gap-2"
                        >
                          {name} <span className="text-[#006781]">x{c.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-[#f9f9ff] border-t border-[#d8e3fb] flex gap-3">
              <button
                type="button"
                onClick={() => setFinishingTask(null)}
                className="px-6 py-3 bg-white border border-[#d8e3fb] text-[#64748B] text-[13px] font-[family-name:var(--font-sora)] font-semibold rounded-xl hover:bg-white flex-1"
              >
                {t("housekeeping.modal_finish.back")}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(finishingTask.id, "DONE", consumptions)}
                className="px-8 py-3 bg-emerald-600 text-white text-[13px] font-[family-name:var(--font-sora)] font-semibold rounded-xl hover:bg-emerald-700 flex-[2] flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> {t("housekeeping.modal_finish.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
