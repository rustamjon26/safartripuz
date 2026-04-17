"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { Star } from "lucide-react";

type Order = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  cancellationReason: string | null;
  review: { id: string } | null;
  driver: {
    first_name: string;
    last_name: string;
    phone: string;
    driverProfile: { rating: number } | null;
    taxiVehicles: Array<{ plateNumber: string }>;
  } | null;
};

const steps = ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;

export default function TaxiOrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewThanks, setReviewThanks] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/taxi/orders/${params.id}`);
      const json = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/taxi/orders/${params.id}`);
        return;
      }
      if (res.ok && json.success) setOrder(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!params.id) return;
    void load();
    const timer = setInterval(() => {
      void load();
    }, 10000);
    return () => clearInterval(timer);
  }, [params.id]);

  const activeStepIndex = useMemo(() => {
    if (!order) return 0;
    const idx = steps.indexOf(order.status as (typeof steps)[number]);
    return idx < 0 ? 0 : idx;
  }, [order]);

  async function cancelOrder() {
    if (!order) return;
    const confirmed = window.confirm("Buyurtmani bekor qilmoqchimisiz?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/taxi/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: "Cancelled by customer" }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Bekor qilishda xatolik");
      toast.success("Buyurtma bekor qilindi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  async function submitReview() {
    if (!order) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/taxi/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Review yuborishda xatolik");
      setReviewThanks(true);
      toast.success("Rahmat! Review qabul qilindi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading || !order) {
    return (
      <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ flex: 1 }} className="bg-slate-50">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h1 className="text-2xl font-black text-slate-900">Taxi order #{order.id.slice(-6)}</h1>
            <p className="text-sm text-slate-500 mt-1">Status: <b>{order.status}</b></p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-black text-slate-900 mb-3">Status progress</h2>
            <div className="flex flex-wrap gap-2">
              {steps.map((step, idx) => (
                <div key={step} className={`px-3 py-2 rounded-lg border text-xs font-black ${idx <= activeStepIndex ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {order.driver && ["ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(order.status) ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-black text-slate-900 mb-2">Driver info</h2>
              <p className="text-sm"><b>Ism:</b> {order.driver.first_name} {order.driver.last_name}</p>
              <p className="text-sm"><b>Telefon:</b> {order.driver.phone}</p>
              <p className="text-sm"><b>Vehicle:</b> {order.driver.taxiVehicles?.[0]?.plateNumber || "-"}</p>
              <div className="text-sm flex items-center gap-2">
                <b>Rating:</b>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const filled = i < Math.round(order.driver?.driverProfile?.rating ?? 0);
                    return <Star key={i} size={14} fill={filled ? "currentColor" : "none"} />;
                  })}
                </div>
                <span>{order.driver.driverProfile?.rating?.toFixed(1) ?? "-"}</span>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-2">Route info</h3>
              <p className="text-sm"><b>Pickup:</b> {order.pickupAddress}</p>
              <p className="text-sm"><b>Dropoff:</b> {order.dropoffAddress}</p>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-black text-slate-900 mb-2">Price info</h3>
              <p className="text-sm"><b>Estimated:</b> {Number(order.estimatedPrice).toLocaleString()} UZS</p>
              {order.status === "COMPLETED" ? (
                <p className="text-sm"><b>Final:</b> {Number(order.finalPrice ?? 0).toLocaleString()} UZS</p>
              ) : null}
            </div>
          </div>

          {(order.status === "PENDING" || order.status === "ACCEPTED") ? (
            <button onClick={() => void cancelOrder()} className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-black">
              Buyurtmani bekor qilish
            </button>
          ) : null}

          {order.status === "COMPLETED" && !order.review && !reviewThanks ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h3 className="font-black text-slate-900">Review qoldiring</h3>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  return (
                    <button key={value} onClick={() => setRating(value)} className="text-amber-500">
                      <Star size={20} fill={value <= rating ? "currentColor" : "none"} />
                    </button>
                  );
                })}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="h-input min-h-[110px]" placeholder="Comment (optional)" />
              <button onClick={() => void submitReview()} disabled={submittingReview} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-black disabled:opacity-50">
                {submittingReview ? "Yuborilmoqda..." : "Review yuborish"}
              </button>
            </div>
          ) : null}

          {order.status === "COMPLETED" && (order.review || reviewThanks) ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 font-bold">
              Rahmat! Fikringiz uchun minnatdormiz.
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
