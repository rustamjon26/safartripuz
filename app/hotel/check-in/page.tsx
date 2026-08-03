"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CreditCard,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { CHECKIN_EXTRAS } from "../mock-pack10";

const STEPS = [
  { id: 1, label: "Mehmon ma’lumotlari", icon: UserRound },
  { id: 2, label: "Xona va xizmatlar", icon: BedDouble },
  { id: 3, label: "To‘lov va yakunlash", icon: CreditCard },
] as const;

export default function HotelCheckInWizardPage() {
  const [step, setStep] = useState(1);
  const [extras, setExtras] = useState<Record<string, boolean>>({
    breakfast: true,
    wifi: true,
    late: false,
  });
  const [form, setForm] = useState({
    fullName: "Anvar Karimov",
    phone: "+998 90 123 45 67",
    email: "anvar@example.com",
    bookingRef: "#STR-29042",
  });

  function toggleExtra(id: string) {
    setExtras((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function next() {
    if (step < 3) setStep((s) => s + 1);
    else {
      toast.success("Check-in saqlandi (frontend demo — backend keyin)");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="no-print flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
            SilkRoad PMS · Check-in
          </div>
          <h1 className="font-display text-[28px] font-bold text-[#0d2137] leading-tight mt-1">
            Yangi mehmonni ro‘yxatdan o‘tkazish
          </h1>
          <p className="text-[13px] font-semibold text-[#64748B] mt-1">
            Bron raqami: {form.bookingRef}
          </p>
        </div>
        <Link
          href="/hotel/bookings"
          className="p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B] hover:bg-[#f0f3ff]"
          aria-label="Yopish"
        >
          <X size={18} />
        </Link>
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-2">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex-1 flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                active
                  ? "bg-[#0d2137] text-white"
                  : done
                    ? "bg-[#b9eaff]/50 text-[#001f29]"
                    : "bg-[#f9f9ff] text-[#64748B]"
              }`}
            >
              <s.icon size={18} />
              <div className="min-w-0">
                <div className="text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-wide opacity-70">
                  {s.id}-Qadam
                </div>
                <div className="text-[13px] font-bold truncate">{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 sm:p-7 shadow-sm">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                  To‘liq ism-sharif
                </span>
                <input
                  className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold outline-none focus:border-[#006781]"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                  Telefon raqami
                </span>
                <input
                  className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold outline-none focus:border-[#006781]"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                  Elektron pochta
                </span>
                <input
                  className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-4 py-3 text-[13px] font-bold outline-none focus:border-[#006781]"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-dashed border-[#006781]/40 bg-[#f0f3ff] p-6 text-center">
              <Upload className="mx-auto text-[#006781] mb-2" size={22} />
              <div className="text-[13px] font-bold text-[#0d2137]">
                Pasport skaneri (PDF/JPG)
              </div>
              <p className="text-[12px] font-semibold text-[#64748B] mt-1">
                Hujjatni yuklash — frontend demo. Maks 5MB.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex px-4 py-2 rounded-xl bg-white border border-[#d8e3fb] text-[12px] font-bold text-[#0d2137]"
                onClick={() => toast.message("Upload — backend keyin ulanadi")}
              >
                Fayl tanlash
              </button>
            </div>

            <div className="rounded-xl bg-[#b9eaff]/40 border border-[#8fdfff]/50 px-4 py-3 text-[12px] font-semibold text-[#001f29]">
              Ushbu mehmon avval 3 marta mehmonxonada qolgan. (VIP status)
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#d8e3fb] p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-[#f9f9ff]">
              <div className="w-14 h-14 rounded-2xl bg-[#0d2137] text-white flex items-center justify-center shrink-0">
                <BedDouble size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[20px] font-bold text-[#0d2137]">
                  Luxe #402
                </div>
                <div className="text-[13px] font-semibold text-[#64748B]">
                  Prezident Lyuks xonasi
                </div>
              </div>
              <span className="h-badge h-badge-ok w-fit">Tayyor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#d8e3fb] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Kelish vaqti
                </div>
                <div className="mt-1 text-[14px] font-bold text-[#0d2137]">
                  24-Iyun, 14:00
                </div>
              </div>
              <div className="rounded-xl border border-[#d8e3fb] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Ketish vaqti
                </div>
                <div className="mt-1 text-[14px] font-bold text-[#0d2137]">
                  27-Iyun, 12:00
                </div>
              </div>
            </div>

            <div>
              <div className="text-[13px] font-bold text-[#0d2137] mb-3">
                Qo‘shimcha xizmatlar
              </div>
              <div className="space-y-2">
                {CHECKIN_EXTRAS.map((ex) => (
                  <label
                    key={ex.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#d8e3fb] px-4 py-3 cursor-pointer hover:bg-[#f9f9ff]"
                  >
                    <span className="flex items-center gap-3 text-[13px] font-bold text-[#111c2d]">
                      <input
                        type="checkbox"
                        checked={!!extras[ex.id]}
                        onChange={() => toggleExtra(ex.id)}
                        className="accent-[#006781] w-4 h-4"
                      />
                      {ex.label}
                    </span>
                    <span className="text-[12px] font-bold text-[#006781]">
                      {ex.priceLabel === "0" ? "Bepul" : `${ex.priceLabel} so‘m`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#0d2137] text-white p-6">
              <div className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#8fdfff]">
                Jami summa
              </div>
              <div className="font-display text-[36px] font-bold mt-1">4 500 000 UZS</div>
              <p className="text-[13px] text-white/70 font-semibold mt-2">
                {form.fullName} · Luxe #402 · 3 kecha
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] font-semibold">
              <div className="rounded-xl border border-[#d8e3fb] p-4">
                <div className="text-[#94A3B8] text-[10px] font-bold uppercase mb-1">
                  To‘lov usuli
                </div>
                <select className="w-full bg-transparent font-bold text-[#0d2137] outline-none">
                  <option>Naqd</option>
                  <option>Karta</option>
                  <option>Payme / Click</option>
                </select>
              </div>
              <div className="rounded-xl border border-[#d8e3fb] p-4">
                <div className="text-[#94A3B8] text-[10px] font-bold uppercase mb-1">
                  Depozit
                </div>
                <div className="font-bold text-[#0d2137]">500 000 UZS (demo)</div>
              </div>
            </div>
            <p className="text-[12px] font-semibold text-[#64748B]">
              Yakunlash tugmasi faqat UI holatini saqlaydi — API keyinchalik ulanadi.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#d8e3fb] pt-5">
          <Link
            href="/hotel/bookings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#64748B] hover:bg-[#f0f3ff]"
          >
            <ArrowLeft size={16} />
            Bekor qilish
          </Link>
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#0d2137]"
              >
                Oldingi
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#006781] hover:bg-[#005a71] text-white text-[13px] font-bold"
            >
              {step === 3 ? "Saqlash" : "Keyingisi"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
