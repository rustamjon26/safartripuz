"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Languages,
  LogOut,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { EARNINGS, STAFF_USER } from "../mock-data";

export default function StaffProfilePage() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-[#0d2137]">Profil</h1>
        <Link
          href="/staff/messages"
          className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
        </Link>
      </header>

      <section className="st-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#0d2137] text-white text-[16px] font-bold flex items-center justify-center">
            JA
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-[#0d2137] truncate">
                {STAFF_USER.fullName}
              </h2>
              <span className="st-badge st-badge-ok">Verified</span>
            </div>
            <div className="text-[12px] font-semibold text-[#64748B]">{STAFF_USER.title}</div>
          </div>
          <button
            type="button"
            className="text-[11px] font-bold text-[#006781]"
            onClick={() => toast.message("Tahrirlash — backend keyin")}
          >
            Tahrirlash
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "Mehmon reytingi", value: STAFF_USER.rating },
            { label: "O‘rtacha tezlik", value: STAFF_USER.avgSpeed },
            { label: "Bajarilgan vazifa", value: String(STAFF_USER.tasksDone) },
            { label: "O‘sish sur’ati", value: STAFF_USER.growth },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-[#f0f3ff] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {k.label}
              </div>
              <div className="font-display text-[18px] font-bold text-[#0d2137] mt-0.5">
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="st-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[#0d2137]">Mening daromadim</h3>
          <span className="text-[11px] font-bold text-[#94A3B8]">Mart 2024</span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[12px] font-bold mb-1.5">
            <span className="text-[#64748B]">Oylik bonusga qoldi</span>
            <span className="text-[#006781]">250,000 UZS</span>
          </div>
          <div className="st-bar">
            <span style={{ width: "85%" }} />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#64748B]">
            Yanada 5 ta “A’lo” reyting oling va bonusga ega bo‘ling!
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {EARNINGS.map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-[#d8e3fb] px-3 py-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#0d2137]">{e.title}</div>
                <div className="text-[11px] font-semibold text-[#94A3B8]">{e.meta}</div>
              </div>
              <div className="text-[13px] font-black text-emerald-600 shrink-0">{e.amount}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="st-card overflow-hidden">
        {[
          { icon: Settings, label: "Ilova sozlamalari", href: "#" },
          { icon: Languages, label: "Til (O‘zbekcha)", href: "#" },
          { icon: HelpCircle, label: "Yordam va qo‘llab-quvvatlash", href: "/staff/training" },
        ].map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => {
              if (row.href.startsWith("/")) router.push(row.href);
              else toast.message(`${row.label} — demo`);
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#d8e3fb] last:border-0 text-left hover:bg-[#f9f9ff]"
          >
            <row.icon size={18} className="text-[#006781]" />
            <span className="flex-1 text-[13px] font-bold text-[#0d2137]">{row.label}</span>
            <ChevronRight size={16} className="text-[#94A3B8]" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-rose-50"
        >
          <LogOut size={18} className="text-[#F43F5E]" />
          <span className="flex-1 text-[13px] font-bold text-[#F43F5E]">Tizimdan chiqish</span>
        </button>
      </section>

      <p className="text-center text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider pb-2">
        SafarTrip Staff v2.4.0 · Frontend demo
      </p>
    </div>
  );
}
