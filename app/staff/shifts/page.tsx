"use client";

import { Bell, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SHIFT_STATS, SHIFTS, WEEK_DAYS } from "../mock-data";

export default function StaffShiftsPage() {
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
            Haftalik ish soatlari va smenalaringiz rejasi.
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
        {SHIFT_STATS.map((s) => (
          <div key={s.label} className="st-card p-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {s.label}
            </div>
            <div className="font-display text-[20px] font-bold text-[#0d2137] mt-1">
              {s.value}
            </div>
            {s.hint ? (
              <div className="text-[10px] font-semibold text-[#64748B] mt-0.5">{s.hint}</div>
            ) : null}
          </div>
        ))}
      </div>

      <section className="st-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              Keyingi smena
            </div>
            <div className="text-[15px] font-bold text-[#0d2137]">Bugun, 14:00</div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006781]">
            <MapPin size={12} /> Tashkent Airport
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((d) => (
            <div
              key={d.n}
              className={`rounded-xl py-2 text-center ${
                d.active ? "bg-[#0d2137] text-white" : "bg-[#f0f3ff] text-[#64748B]"
              }`}
            >
              <div className="text-[9px] font-bold uppercase">{d.d}</div>
              <div className="text-[13px] font-black mt-0.5">{d.n}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[14px] font-bold text-[#0d2137]">Smenalar tafsiloti</h2>
          <button
            type="button"
            className="text-[11px] font-bold text-[#006781]"
            onClick={() => toast.message("Arxiv — backend keyin")}
          >
            Arxivni ko‘rish
          </button>
        </div>
        <div className="space-y-2.5">
          {SHIFTS.map((s) => (
            <article key={s.id} className="st-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[14px] font-bold text-[#0d2137]">{s.title}</h3>
                  <div className="mt-1 text-[12px] font-semibold text-[#64748B]">
                    {s.when} · {s.time}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#006781]">
                    <MapPin size={12} /> {s.place}
                  </div>
                </div>
                <button
                  type="button"
                  className="st-btn st-btn-soft py-2 px-3 text-[11px]"
                  onClick={() => toast.message("Smena almashish — demo")}
                >
                  Almashtirish
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
