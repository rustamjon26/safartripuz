"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

type TaxiService = {
  id: string;
  title: string;
  serviceType: string;
  price: number;
  driverCount: number;
  avgRating: number | null;
};

type Estimate = {
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedMinutes: number;
};

export default function TaxiBookingPage() {
  const router = useRouter();
  const [loadingServices, setLoadingServices] = useState(true);
  const [services, setServices] = useState<TaxiService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [scheduleType, setScheduleType] = useState<"NOW" | "SCHEDULED">("NOW");
  const [scheduledAt, setScheduledAt] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadServices() {
      setLoadingServices(true);
      try {
        const res = await fetch("/api/taxi/services");
        const json = await res.json();
        if (res.ok && json.success) {
          const list = json.data?.data || [];
          setServices(list);
          if (list.length > 0) setSelectedServiceId(list[0].id);
        }
      } finally {
        setLoadingServices(false);
      }
    }
    void loadServices();
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const defaultPickup = { lat: 41.3111, lng: 69.2797 };
  const defaultDropoff = { lat: 41.2995, lng: 69.2401 };

  function serviceCategoryLabel(serviceType: string) {
    if (serviceType === "INTERCITY_TRANSFER") return "STANDARD";
    if (serviceType === "HOTEL_TRANSFER") return "COMFORT";
    if (serviceType === "TOUR_DAILY_TRANSPORT") return "MINIVAN";
    return "PREMIUM";
  }

  async function calculateEstimate() {
    if (!selectedServiceId) {
      toast.error("Avval xizmat turini tanlang");
      return;
    }
    setEstimating(true);
    try {
      const res = await fetch("/api/taxi/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLat: defaultPickup.lat,
          pickupLng: defaultPickup.lng,
          dropoffLat: defaultDropoff.lat,
          dropoffLng: defaultDropoff.lng,
          serviceId: selectedServiceId,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/taxi");
        return;
      }
      if (!res.ok || json.success === false) throw new Error(json.error || "Narx hisoblashda xatolik");
      setEstimate(json.data as Estimate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setEstimating(false);
    }
  }

  async function submitOrder() {
    if (!pickupAddress || !dropoffAddress || !selectedServiceId) {
      toast.error("Barcha majburiy maydonlarni to'ldiring");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/taxi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          pickupLat: defaultPickup.lat,
          pickupLng: defaultPickup.lng,
          dropoffAddress,
          dropoffLat: defaultDropoff.lat,
          dropoffLng: defaultDropoff.lng,
          serviceId: selectedServiceId,
          scheduledAt: scheduleType === "SCHEDULED" ? scheduledAt : undefined,
          customerNote: customerNote || undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/taxi");
        return;
      }
      if (!res.ok || json.success === false) throw new Error(json.error || "Buyurtma berishda xatolik");
      toast.success("Buyurtma yaratildi");
      router.push(`/taxi/orders/${json.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h1 className="text-2xl font-black text-slate-900">Taxi buyurtma</h1>
            <p className="text-sm text-slate-500 mt-1">Pickup va dropoff manzillarni kiriting</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Pickup address" className="h-input" />
              <input value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} placeholder="Dropoff address" className="h-input" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-black text-slate-900 mb-3">Xizmat turi</h2>
            {loadingServices ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`text-left rounded-2xl border p-4 transition ${
                      selectedServiceId === s.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-black uppercase">{serviceCategoryLabel(s.serviceType)}</p>
                    <p className="font-black mt-1">{s.title}</p>
                    <p className="text-sm mt-2">{Number(s.price).toLocaleString()} UZS / km</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setScheduleType("NOW")} className={`px-3 py-2 rounded-lg text-xs font-black border ${scheduleType === "NOW" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>Hozir</button>
              <button onClick={() => setScheduleType("SCHEDULED")} className={`px-3 py-2 rounded-lg text-xs font-black border ${scheduleType === "SCHEDULED" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200"}`}>Rejalashtirilgan</button>
            </div>
            {scheduleType === "SCHEDULED" ? (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-input max-w-sm" />
            ) : null}
            <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Qo'shimcha izoh (ixtiyoriy)" className="h-input min-h-[100px]" />

            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => void calculateEstimate()} disabled={estimating || !selectedService} className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-black text-slate-700">
                {estimating ? "Hisoblanmoqda..." : "Narx hisoblash"}
              </button>
              {estimate ? (
                <div className="text-sm font-bold text-slate-700">
                  ~{Number(estimate.estimatedDistanceKm).toFixed(2)} km, ~{estimate.estimatedMinutes} daqiqa, ~{Number(estimate.estimatedPrice).toLocaleString()} UZS
                </div>
              ) : null}
            </div>

            <button onClick={() => void submitOrder()} disabled={submitting || !selectedServiceId} className="w-full md:w-auto px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50">
              {submitting ? "Yuborilmoqda..." : "Buyurtma berish"}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
