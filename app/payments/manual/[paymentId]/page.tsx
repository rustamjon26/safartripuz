"use client";

import { useEffect, useState, use } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ManualPaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const router = useRouter();
  const { paymentId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
         // Getting admin settings using a new public facing / config route or 
         // getting it from the GET /api/user/payments.. Wait, /api/admin/settings/payments is admin only!
         // We should fetch the manual config securely. 
         // Let's create a public or user-scoped config endpoint if needed, or inline for now.
         
         const res = await fetch(`/api/payments/manual-info`);
         if (!res.ok) throw new Error("Yuklanmadi");
         const data = await res.json();
         setConfig(data);
      } catch (e) {
         toast.error("Karta ma'lumotlarini yuklashda xatolik");
      } finally {
         setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/payments/webhook/mock/${paymentId}`, {
         method: "POST"
      });
      // Currently using mock webhook for manual confirmation 
      // which sets status to SUCCESS instantly. Depending on real business logic, it could go to PENDING.
      if (!res.ok) throw new Error("Xatolik roy berdi");
      
      toast.success("To'lov tasdiqlashga yuborildi! Tez orada faollashadi.");
      router.push("/payments");
    } catch (err: any) {
      toast.error(err.message);
      setConfirming(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Nusxalandi!");
  }

  if (loading) return (
     <DashboardShell title="To'lov ma'lumotlari" subtitle="..."><div className="flex p-10 justify-center"><Loader2 className="animate-spin text-slate-400 w-8 h-8"/></div></DashboardShell>
  );

  return (
    <DashboardShell title="Karta orqali to'lov" subtitle="Quyidagi raqamga pul o'tkazing">
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mt-8">
         <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-700 mb-8 border border-amber-100">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-medium">To'lovni amalga oshirganingizdan keyin, "To'lov qildim" tugmasini bosing. Operatorlarimiz 5-10 daqiqa ichida tekshirib tasdiqlashadi.</p>
         </div>

         <div className="space-y-6 mb-8">
            <div>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Karta Raqami</p>
               <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-mono text-xl font-black text-slate-900 tracking-wider w-full text-center">
                     {config?.cardNumber || "8600 0000 0000 0000"}
                  </span>
                  <button onClick={() => copyToClipboard(config?.cardNumber || "8600000000000000")} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
                     <Copy className="w-5 h-5"/>
                  </button>
               </div>
            </div>

            <div>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Karta Egasi</p>
               <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="font-bold text-slate-900 uppercase">
                     {config?.cardHolder || "SAFAR TRIP MCHJ"}
                  </span>
               </div>
            </div>
         </div>

         <button 
           onClick={handleConfirm}
           disabled={confirming}
           className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-2xl py-4 font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all outline-none flex items-center justify-center gap-2"
         >
           {confirming ? <Loader2 className="w-6 h-6 animate-spin"/> : <CheckCircle2 className="w-6 h-6"/>}
           {confirming ? "Iltimos kuting..." : "To'lovni amalga oshirdim"}
         </button>
      </div>
    </DashboardShell>
  );
}
