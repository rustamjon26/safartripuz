"use client";

import { useEffect, useState } from "react";
import { Bell, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { staffFetch } from "../_lib/staffFetch";

type Shift = {
  id: string;
  title: string;
  location: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
};

function fmtRange(a: string, b: string) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${new Date(a).toLocaleString("uz-UZ", opts)} – ${new Date(b).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function StaffShiftsPage() {
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await staffFetch("/api/staff/shifts", { credentials: "include" });
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
    void load();
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      const res = await staffFetch(`/api/staff/shifts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("Yangilandi");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  const hours = items.reduce((acc, s) => {
    const ms = new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime();
    return acc + Math.max(0, ms) / 3600000;
  }, 0);

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            SafarTrip Staff
          </div>
          <h1 className="font-display text-[24px] font-bold text-[#0d2137] mt-0.5">
            Mening grafiqim
          </h1>
          <p className="text-[12px] font-semibold text-[#64748B]">
            Haftalik smenalar (7shifts uslubida).
          </p>
        </div>
        <Link
          href="/staff/messages"
          className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="st-card p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Jami soatlar
          </div>
          <div className="font-display text-[20px] font-bold text-[#0d2137] mt-1">
            {Math.round(hours)}h
          </div>
        </div>
        <div className="st-card p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Smenalar
          </div>
          <div className="font-display text-[20px] font-bold text-[#0d2137] mt-1">
            {items.length}
          </div>
        </div>
        <div className="st-card p-3">
          <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Faol
          </div>
          <div className="font-display text-[20px] font-bold text-[#0d2137] mt-1">
            {items.filter((s) => s.status === "ACTIVE").length}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-[14px] font-bold text-[#0d2137] mb-3">Smenalar tafsiloti</h2>
        {loading ? (
          <div className="st-card p-8 text-center text-[#64748B] font-semibold">Yuklanmoqda…</div>
        ) : items.length === 0 ? (
          <div className="st-card p-8 text-center text-[#64748B] font-semibold text-[13px]">
            Smena yo‘q. Manager `/api/staff/shifts` orqali yaratadi.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((s) => (
              <article key={s.id} className="st-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0d2137]">{s.title}</h3>
                    <div className="mt-1 text-[12px] font-semibold text-[#64748B]">
                      {fmtRange(s.startsAt, s.endsAt)}
                    </div>
                    {s.location ? (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#006781]">
                        <MapPin size={12} /> {s.location}
                      </div>
                    ) : null}
                  </div>
                  <span className="st-badge st-badge-info">{s.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.status === "SCHEDULED" ? (
                    <button
                      type="button"
                      className="st-btn st-btn-primary py-2 px-3 text-[11px]"
                      onClick={() => void setStatus(s.id, "ACTIVE")}
                    >
                      Clock-in
                    </button>
                  ) : null}
                  {s.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="st-btn st-btn-soft py-2 px-3 text-[11px]"
                      onClick={() => void setStatus(s.id, "COMPLETED")}
                    >
                      Clock-out
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
