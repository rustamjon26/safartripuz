"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle, ReceiptText, CreditCard } from "lucide-react";

type PaymentRecord = {
  id: string;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  createdAt: string;
  travelPlan: {
    destination: string;
    tourPackage: { title: string } | null;
  };
};

export default function UserPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/user/payments");
        if (!res.ok) throw new Error("Yuklashda xatolik");
        const data = await res.json();
        setPayments(data);
      } catch (err) {
        toast.error("To'lovlarni yuklashda muammo yuzaga keldi");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getStatusStyle(status: string) {
    if (status === "SUCCESS") return { bg: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: <CheckCircle2 size={16}/>, label: "Muvaffaqiyatli" };
    if (status === "PENDING") return { bg: "bg-amber-50 text-amber-600 border-amber-200", icon: <Clock size={16}/>, label: "Jarayonda" };
    if (status === "FAILED" || status === "CANCELLED") return { bg: "bg-red-50 text-red-600 border-red-200", icon: <XCircle size={16}/>, label: "Bekor qilingan" };
    return { bg: "bg-slate-50 text-slate-600 border-slate-200", icon: <AlertCircle size={16}/>, label: "Boshlanmagan" };
  }

  function getProviderColor(provider: string) {
    if (provider === "CLICK") return "bg-blue-600 text-white";
    if (provider === "PAYME") return "bg-teal-500 text-white";
    if (provider === "UZUM") return "bg-purple-600 text-white";
    return "bg-slate-800 text-white";
  }

  return (
    <DashboardShell title="Mening To'lovlarim" subtitle="Barcha amalga oshirilgan va jarayondagi to'lovlar tarixi">
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="font-bold text-slate-500">Yuklanmoqda...</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white border border-slate-100 rounded-3xl p-16 shadow-sm">
          <ReceiptText className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-black text-slate-800">To'lovlar tarixi bo'sh</h3>
          <p className="text-slate-500 max-w-sm text-center mt-2">Sizda hali hech qanday to'lovlar amalga oshirilmagan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map(payment => {
            const statusConfig = getStatusStyle(payment.status);
            return (
              <div key={payment.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md">
                
                {/* Info block */}
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs ${getProviderColor(payment.provider)}`}>
                    {payment.provider}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">
                      {payment.travelPlan.tourPackage?.title || payment.travelPlan.destination}
                    </h4>
                    <p className="text-sm font-medium text-slate-500 flex items-center gap-2 mt-0.5">
                      <CreditCard size={14} /> ID: <span className="uppercase text-xs font-bold tracking-wider">{payment.id.slice(-8)}</span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full mx-1"></span>
                      {new Date(payment.createdAt).toLocaleDateString("uz-UZ", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Amount and Status */}
                <div className="flex flex-col md:items-end gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-2xl tracking-tight text-slate-800">{Number(payment.amount).toLocaleString()}</span>
                    <span className="font-bold text-sm text-slate-500 uppercase">{payment.currency}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 w-max ${statusConfig.bg}`}>
                    {statusConfig.icon} {statusConfig.label}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
