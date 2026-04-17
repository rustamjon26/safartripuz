"use client";

import { useEffect, useState, use } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MockPaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const router = useRouter();
  const { paymentId } = use(params);
  
  const [loading, setLoading] = useState(false);

  async function simulatePayment() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/webhook/mock/${paymentId}`, {
         method: "POST"
      });
      if (!res.ok) throw new Error("Mock payment error");
      toast.success("To'lov muvaffaqiyatli amalga oshirildi! 🎉");
      router.push("/payments");
    } catch (err: any) {
      toast.error(err.message);
      setLoading(false);
    }
  }

  return (
    <DashboardShell title="Mock / Test To'lov" subtitle={`To'lov ID: ${paymentId}`}>
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center mt-12">
         <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10" />
         </div>
         <h2 className="text-2xl font-black text-slate-900 mb-2">Simulyatsiya Ulanishi</h2>
         <p className="text-sm font-medium text-slate-500 mb-8 px-4">
            Bu xaqiqiy pul yechadigan to'lov emas. Test maqsadlarida siz jarayonni tugatish tugmasini bosishingiz kifoya.
         </p>

         <button 
           onClick={simulatePayment}
           disabled={loading}
           className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-2xl py-4 font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
         >
           {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : <CheckCircle2 className="w-6 h-6"/>}
           {loading ? "Iltimos kuting..." : "To'lovni tasdiqlash"}
         </button>
      </div>
    </DashboardShell>
  );
}
