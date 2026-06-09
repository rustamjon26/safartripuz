"use client";

import { useEffect, useState, use } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck, Box, Banknote, Tent, Home, Car, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ListChecks, MapPin, Tag } from "lucide-react";

export default function CheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  const router = useRouter();
  const { planId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  
  const [plan, setPlan] = useState<any>(null);
  const [providers, setProviders] = useState<any>({ click: false, payme: false, uzum: false });

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`/api/travel-plans/${planId}`);
        if (!res.ok) throw new Error("Ma'lumot topilmadi");
        const data = await res.json();
        setPlan(data);
        setLoading(false);
      } catch (e) {
        toast.error("Sayohat ma'lumotlarini yuklab bo'lmadi");
        setLoading(false);
      }
    }
    init();
  }, [planId]);

  async function pay(provider: string) {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");

      window.location.href = data.paymentUrl;
    } catch (err: any) {
      toast.error(err.message);
      setPaying(false);
    }
  }

  if (loading) {
     return (
        <DashboardShell title="To'lovni amalga oshirish" subtitle="...">
           <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardShell>
     );
  }

  return (
    <DashboardShell title="To'lovni tanlang" subtitle="O'zingizga qulay usulda to'lovni amalga oshiring">
      <div className="max-w-xl mx-auto pt-8 pb-16">
        
        {/* Plan Summary Card */}
        {plan && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm mb-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center shrink-0">
                <ListChecks size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 leading-tight">
                  {plan.tourPackage?.title || plan.destination}
                </h2>
                <p className="text-gray-500 font-bold text-sm flex items-center gap-1.5 mt-1">
                  <MapPin size={14} className="text-gray-500" /> {plan.destination}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Tag size={12} /> Umumiy To'lov
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-3xl text-gray-900 tracking-tight">
                    {Number(plan.totalAmount).toLocaleString()}
                  </span>
                  <span className="text-sm font-black text-gray-500 uppercase">so'm</span>
                </div>
              </div>
            </div>

            {(plan.items?.length > 0 || plan.homeStayBookings?.length > 0) && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Xizmatlar</p>
                {plan.items?.map((item: { id: string; type: string; title: string; totalPrice: unknown }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-gray-600 font-semibold min-w-0">
                      {item.type === "HOTEL" ? (
                        <Home size={14} className="shrink-0 text-slate-500" />
                      ) : item.type === "HOMESTAY" ? (
                        <Tent size={14} className="shrink-0 text-slate-500" />
                      ) : item.type === "TAXI" ? (
                        <Car size={14} className="shrink-0 text-slate-500" />
                      ) : (
                        <UserIcon size={14} className="shrink-0 text-slate-500" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="font-black text-gray-900 shrink-0">
                      {Number(item.totalPrice).toLocaleString()} so&apos;m
                    </span>
                  </div>
                ))}
                {!plan.items?.some((item: { type: string }) => item.type === "HOMESTAY") &&
                  plan.homeStayBookings?.map((booking: {
                    id: string;
                    totalPrice: unknown;
                    listing?: { title?: string; city?: string };
                  }) => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 text-gray-600 font-semibold min-w-0">
                        <Tent size={14} className="shrink-0 text-slate-500" />
                        <span className="truncate">
                          {booking.listing?.title ?? "HomeStay"}
                          {booking.listing?.city ? ` · ${booking.listing.city}` : ""}
                        </span>
                      </span>
                      <span className="font-black text-gray-900 shrink-0">
                        {Number(booking.totalPrice).toLocaleString()} so&apos;m
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <button disabled={paying} onClick={() => pay("CLICK")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-blue-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                 <CreditCard className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-gray-900">Click Evolution</h3>
                <p className="text-sm font-medium text-gray-500">Karta orqali tezkor to'lov</p>
              </div>
            </div>
          </button>

          <button disabled={paying} onClick={() => pay("PAYME")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-teal-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                 <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-gray-900">Payme</h3>
                <p className="text-sm font-medium text-gray-500">Xavfsiz va ishonchli transfer</p>
              </div>
            </div>
          </button>
          
          <button disabled={paying} onClick={() => pay("UZUM")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-purple-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                 <Box className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-gray-900">Uzum Bank</h3>
                <p className="text-sm font-medium text-gray-500">Uzum hisobidan to'lash</p>
              </div>
            </div>
          </button>

          <button disabled={paying} onClick={() => pay("MANUAL")} className="w-full bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-500 hover:shadow-lg transition-all group active:scale-95 disabled:opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                 <Banknote className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-gray-900">Karta orqali (Ruchnoy)</h3>
                <p className="text-sm font-medium text-gray-500">Hisob raqamiga pul o'tkazish</p>
              </div>
            </div>
          </button>
        </div>

      </div>
    </DashboardShell>
  );
}
