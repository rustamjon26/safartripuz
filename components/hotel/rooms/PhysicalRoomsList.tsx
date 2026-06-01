"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  CheckCircle,
  Edit3,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useSearchParams } from "next/navigation";

export interface PhysicalRoom {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  isActive: boolean;
}

export interface PhysicalRoomRow extends PhysicalRoom {
  categoryName: string;
}

type BulkStatus = "AVAILABLE" | "CLEANING" | "MAINTENANCE" | "BLOCKED";

const BULK_STATUS_OPTIONS: BulkStatus[] = [
  "AVAILABLE",
  "CLEANING",
  "MAINTENANCE",
  "BLOCKED",
];

function statusFromQuery(raw: string | null): string {
  if (!raw) return "";
  const map: Record<string, string> = {
    available: "AVAILABLE",
    occupied: "OCCUPIED",
    cleaning: "CLEANING",
    maintenance: "MAINTENANCE",
    blocked: "BLOCKED",
  };
  return map[raw.toLowerCase()] ?? raw.toUpperCase();
}

type PhysicalRoomsListProps = {
  hotelId: string;
  roomTypes: Array<{ id: string; name: string; rooms?: PhysicalRoom[] }>;
  loading: boolean;
  onReload: () => void;
  onAdd: () => void;
  onEdit: (room: PhysicalRoom) => void;
  onDelete: (id: string) => void;
};

export default function PhysicalRoomsList({
  hotelId,
  roomTypes,
  loading,
  onReload,
  onAdd,
  onEdit,
  onDelete,
}: PhysicalRoomsListProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<BulkStatus | "">("");
  const [bulkNote, setBulkNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allPhysicalRooms = useMemo(
    () =>
      roomTypes.flatMap((rt) =>
        (rt.rooms || []).map((pr) => ({ ...pr, categoryName: rt.name })),
      ),
    [roomTypes],
  );

  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase();
    return allPhysicalRooms.filter((pr) => {
      const matchesSearch =
        pr.roomNumber.toLowerCase().includes(q) ||
        pr.categoryName.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || pr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allPhysicalRooms, search, statusFilter]);

  useEffect(() => {
    const fromUrl = statusFromQuery(searchParams.get("status"));
    if (fromUrl) setStatusFilter(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter]);

  function clearSelection() {
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setBulkStatus("");
    setBulkNote("");
  }

  function toggleSelectMode() {
    if (isSelectMode) clearSelection();
    else setIsSelectMode(true);
  }

  function toggleRoom(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    const allVisibleSelected =
      filteredRooms.length > 0 &&
      filteredRooms.every((r) => selectedIds.has(r.id));

    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRooms.forEach((r) => next.delete(r.id));
        return next;
      });
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredRooms.forEach((r) => next.add(r.id));
      return next;
    });
  }

  async function handleBulkSubmit() {
    if (!hotelId) {
      toast.error(t("common.toasts.error"));
      return;
    }
    if (selectedIds.size === 0) return;
    if (!bulkStatus) {
      toast.error(t("rooms.bulk.status_required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/rooms/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_ids: Array.from(selectedIds),
          status: bulkStatus,
          note: bulkNote.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.blocked_rooms?.length) {
          toast.error(`${data.error}: ${data.blocked_rooms.join(", ")}`);
        } else if (data.invalid_ids?.length) {
          toast.error(`${data.error} (${data.invalid_ids.join(", ")})`);
        } else {
          toast.error(data.error || t("common.toasts.error"));
        }
        return;
      }

      toast.success(
        t("rooms.bulk.success", {
          count: data.updated_count,
          status: t(`rooms.status.${data.status}`),
        }),
      );
      clearSelection();
      onReload();
    } catch {
      toast.error(t("common.toasts.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const allFilteredSelected =
    filteredRooms.length > 0 &&
    filteredRooms.every((r) => selectedIds.has(r.id));
  const someFilteredSelected = filteredRooms.some((r) => selectedIds.has(r.id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="h-badge h-badge-green">
            <CheckCircle size={12} /> {t("rooms.status.AVAILABLE")}
          </span>
        );
      case "OCCUPIED":
        return (
          <span className="h-badge h-badge-red">
            <BedDouble size={12} /> {t("rooms.status.OCCUPIED")}
          </span>
        );
      case "CLEANING":
        return (
          <span className="h-badge h-badge-blue">
            <RefreshCw size={12} className="animate-spin-slow" /> {t("rooms.status.CLEANING")}
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="h-badge h-badge-amber">{t("rooms.status.MAINTENANCE")}</span>
        );
      case "BLOCKED":
        return (
          <span className="h-badge h-badge-gray">{t("rooms.status.BLOCKED")}</span>
        );
      default:
        return <span className="h-badge h-badge-gray">{status}</span>;
    }
  };

  return (
    <div className={`space-y-4 ${selectedIds.size > 0 ? "pb-28 lg:pb-24" : ""}`}>
      {/* Control bar */}
      <div className="flex flex-col gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("rooms.search.physical")}
              className="flex-1 max-w-sm px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold focus:border-[var(--accent)] outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-700 outline-none focus:border-[var(--accent)]"
            >
              <option value="">{t("rooms.bulk.filter_all")}</option>
              {(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE", "BLOCKED"] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {t(`rooms.status.${status}`)}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSelectMode ? (
              <>
                <span className="text-[13px] font-bold text-[var(--primary)] px-2">
                  {t("rooms.bulk.selected_count", { count: selectedIds.size })}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-3 py-2 text-[12px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  {t("rooms.bulk.cancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={toggleSelectMode}
                className="px-4 py-2 text-[13px] font-bold text-[var(--primary)] bg-[var(--bg-light-blue)] rounded-lg hover:bg-slate-100 border border-slate-200"
              >
                {t("rooms.bulk.select")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onReload()}
              className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border border-slate-200"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm"
            >
              <Plus size={16} />
              {t("rooms.add_new")}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-4" />
            <p className="font-bold text-sm tracking-widest uppercase">{t("common.loading")}</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                {isSelectMode ? (
                  <th className="py-3 px-4 w-10">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded border-slate-300 accent-[var(--primary)]"
                      aria-label={t("rooms.bulk.select_all")}
                    />
                  </th>
                ) : null}
                <th className="py-3 px-5">{t("rooms.table.room_number")}</th>
                <th className="py-3 px-5">{t("rooms.table.category")}</th>
                <th className="py-3 px-5">{t("rooms.table.floor")}</th>
                <th className="py-3 px-5">{t("rooms.table.status")}</th>
                {!isSelectMode ? (
                  <th className="py-3 px-5 text-right">{t("rooms.table.actions")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="text-[14px]">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSelectMode ? 6 : 5}
                    className="text-center py-20 text-slate-500 font-medium"
                  >
                    {t("rooms.table.no_rooms")}
                  </td>
                </tr>
              ) : (
                filteredRooms.map((pr) => (
                  <tr
                    key={pr.id}
                    className={`border-b border-slate-100 transition-colors ${
                      selectedIds.has(pr.id) ? "bg-blue-50/40" : "hover:bg-slate-50/50"
                    }`}
                  >
                    {isSelectMode ? (
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pr.id)}
                          onChange={() => toggleRoom(pr.id)}
                          className="w-4 h-4 rounded border-slate-300 accent-[var(--primary)]"
                        />
                      </td>
                    ) : null}
                    <td className="py-3 px-5">
                      <div className="font-extrabold text-[var(--primary)] flex items-center gap-2">
                        <Hash size={14} className="text-slate-400" />
                        {pr.roomNumber}
                        {!pr.isActive && (
                          <span className="w-2 h-2 rounded-full bg-slate-300" title="Aktiv Emas" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-700 text-[13px]">
                      {pr.categoryName}
                    </td>
                    <td className="py-3 px-5 font-semibold text-slate-500 text-[13px]">
                      {pr.floor || "-"}
                    </td>
                    <td className="py-3 px-5">
                      <StatusBadge status={pr.status} />
                    </td>
                    {!isSelectMode ? (
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onEdit(pr)}
                          className="p-1.5 text-slate-400 hover:text-[var(--accent)] hover:bg-slate-100 rounded-md transition-colors mr-1"
                        >
                          <Edit3 size={15} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(pr.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={15} strokeWidth={2.5} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-[var(--hotel-sidebar-offset,0px)] z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 pb-safe">
          <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row lg:items-center gap-3">
            <span className="text-[13px] font-bold text-[var(--primary)] shrink-0">
              {t("rooms.bulk.rooms_selected", { count: selectedIds.size })}
            </span>

            <div className="flex flex-1 flex-col sm:flex-row gap-2 sm:items-center">
              <label className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-black uppercase text-slate-400">
                  {t("rooms.bulk.status_label")}
                </span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as BulkStatus | "")}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold outline-none focus:border-[var(--accent)] min-w-[140px]"
                >
                  <option value="">{t("rooms.bulk.status_placeholder")}</option>
                  {BULK_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`rooms.status.${status}`)}
                    </option>
                  ))}
                </select>
              </label>

              <input
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder={t("rooms.bulk.note_placeholder")}
                className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                {t("rooms.bulk.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleBulkSubmit()}
                disabled={isSubmitting || !bulkStatus}
                className="px-5 py-2 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {t("rooms.bulk.apply")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
