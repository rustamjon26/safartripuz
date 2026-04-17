"use client";

import { useLanguage } from "@/context/LanguageContext";
import { BookOpen, ArrowLeft, ShieldCheck, Mail, Phone, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function HotelHelpPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-6">
      <div className="flex items-center justify-between">
        <Link href="/hotel" className="flex items-center gap-2 text-slate-500 hover:text-[var(--primary)] font-bold transition-colors">
          <ArrowLeft size={18} />
          {t("common.back") || "Orqaga"}
        </Link>
        <div className="flex items-center gap-2 text-[var(--primary)] font-black text-xl font-display">
          <ShieldCheck size={24} />
          SafarTrip Support
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
          <BookOpen size={200} />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">
          {t("dashboard.view_docs") || "Hujjatlarni Ko'rish"}
        </h1>
        
        <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10 max-w-2xl">
          SafarTrip Hotel PMS tizimidan foydalanish bo'yicha to'liq yo'riqnomalar va video darsliklar yaqin orada shu sahifada paydo bo'ladi. Hozircha quyidagi aloqa vositalari orqali yordam olishingiz mumkin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 mb-1">Mijozlarni Qo'llab-quvvatlash</h3>
              <p className="text-slate-500 text-sm font-bold">+998 90 123 45 67</p>
            </div>
          </div>

          <div className="flex items-start gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 mb-1">E-pochta orqali yordam</h3>
              <p className="text-slate-500 text-sm font-bold">support@safartrip.uz</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center">
            <HelpCircle size={32} className="mx-auto text-amber-500 mb-4" />
            <h4 className="font-black text-slate-900 mb-2">FAQ</h4>
            <p className="text-[12px] font-semibold text-slate-400">Ko'p so'raladigan savollarga javoblar</p>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center">
            <BookOpen size={32} className="mx-auto text-blue-500 mb-4" />
            <h4 className="font-black text-slate-900 mb-2">User Guide</h4>
            <p className="text-[12px] font-semibold text-slate-400">Tizim bo'yicha batafsil qo'llanma</p>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center">
            <ShieldCheck size={32} className="mx-auto text-green-500 mb-4" />
            <h4 className="font-black text-slate-900 mb-2">Security</h4>
            <p className="text-[12px] font-semibold text-slate-400">Ma'lumotlar xavfsizligi bo'yicha ma'lumotlar</p>
        </div>
      </div>
    </div>
  );
}
