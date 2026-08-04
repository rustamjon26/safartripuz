"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import {
  isHotelStaffPlatformRole,
  platformRoleToJobRole,
} from "@/lib/hotel/staffPlatformRole";

type StaffLink = {
  id: string;
  hotelId: string;
  hotelName: string;
  role: string;
  title: string;
  isActive: boolean;
};

type HotelOption = {
  id: string;
  name: string;
  city: string | null;
  status: string;
};

const JOB_ROLES = [
  { value: "RECEPTION", label: "Retsepsionist" },
  { value: "CLEANER", label: "Farrosh" },
  { value: "WAITER", label: "Ofitsiant" },
  { value: "MANAGER", label: "Menejer / Staff" },
] as const;

type Props = {
  userId: string;
  userRole: Role;
};

export function AdminUserHotelStaffCard({ userId, userRole }: Props) {
  const show =
    isHotelStaffPlatformRole(userRole) || userRole === "hotel_manager";

  const [staff, setStaff] = useState<StaffLink | null>(null);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hotelId, setHotelId] = useState("");
  const [jobRole, setJobRole] = useState<(typeof JOB_ROLES)[number]["value"]>(
    platformRoleToJobRole(userRole),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, hotelsRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/hotel-staff`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/admin/hotels/options", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      const staffJson = (await staffRes.json()) as {
        staff?: StaffLink | null;
        message?: string;
      };
      const hotelsJson = (await hotelsRes.json()) as {
        hotels?: HotelOption[];
        message?: string;
      };
      if (!staffRes.ok) throw new Error(staffJson.message || "Yuklanmadi");
      if (!hotelsRes.ok) throw new Error(hotelsJson.message || "Hotel list xato");
      setStaff(staffJson.staff ?? null);
      setHotels(hotelsJson.hotels ?? []);
      if (staffJson.staff) {
        setHotelId(staffJson.staff.hotelId);
        const role = staffJson.staff.role.toUpperCase();
        if (
          role === "RECEPTION" ||
          role === "CLEANER" ||
          role === "WAITER" ||
          role === "MANAGER"
        ) {
          setJobRole(role);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (show) void load();
  }, [show, load]);

  if (!show) return null;

  async function link() {
    if (!hotelId) {
      toast.error("Mehmonxona tanlang");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/hotel-staff`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, role: jobRole, reassign: true }),
      });
      const data = (await res.json()) as {
        staff?: StaffLink;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Ulab bo‘lmadi");
      setStaff(data.staff ?? null);
      toast.success("Mehmonxonaga ulandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!confirm("HotelStaff bog‘lanishini olib tashlaysizmi?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/hotel-staff`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Ajratib bo‘lmadi");
      setStaff(null);
      toast.success("Ajratildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={18} className="text-teal-600" />
        <h2 className="text-lg font-black text-slate-900">
          Mehmonxona (Staff)
        </h2>
      </div>
      <p className="text-xs font-bold text-slate-400 mb-4">
        `/staff` PWA ishlashi uchun foydalanuvchini mehmonxonaga ulash shart
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 py-4">
          <Loader2 size={14} className="animate-spin" />
          Yuklanmoqda…
        </div>
      ) : (
        <div className="space-y-3">
          {staff ? (
            <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">
                Ulangan
              </p>
              <Link
                href={`/admin/hotels/${staff.hotelId}`}
                className="text-sm font-black text-slate-900 hover:underline"
              >
                {staff.hotelName}
              </Link>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                {staff.title}
                {!staff.isActive ? " · nofaol" : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs font-bold text-amber-800">
              Hali mehmonxonaga ulanmagan — Staff ilovasi ishlamaydi
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Mehmonxona
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
            >
              <option value="">Tanlang…</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.city ? ` · ${h.city}` : ""} ({h.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Lavozim
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
              value={jobRole}
              onChange={(e) =>
                setJobRole(e.target.value as (typeof JOB_ROLES)[number]["value"])
              }
            >
              {JOB_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              className="adm-btn adm-btn-primary w-full justify-center"
              disabled={saving || !hotelId}
              onClick={() => void link()}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Link2 size={14} />
              )}
              {staff ? "Qayta ulash / yangilash" : "Mehmonxonaga ulash"}
            </button>
            {staff ? (
              <button
                type="button"
                className="adm-btn w-full justify-center bg-rose-50 text-rose-600 border-rose-100"
                disabled={saving}
                onClick={() => void unlink()}
              >
                <Unlink size={14} />
                Ajratish
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
