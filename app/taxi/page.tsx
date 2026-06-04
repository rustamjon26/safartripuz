"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  MapPin,
  Clock,
  Car,
  Calculator,
  Receipt,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatPricePerUnit, taxiServiceTypeLabel } from "@/lib/displayHelpers";

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

const SERVICE_TYPE_ICONS: Record<string, string> = {
  STANDARD: "🚗",
  COMFORT: "🚙",
  BUSINESS: "🚘",
  MINIBUS: "🚐",
  CARGO: "🚚",
  INTERCITY_TRANSFER: "🚌",
  HOTEL_TRANSFER: "🏨",
  TOUR_DAILY_TRANSPORT: "🗺️",
};

function serviceEmoji(serviceType: string) {
  return SERVICE_TYPE_ICONS[serviceType] ?? "🚗";
}

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
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const pu = sp.get("pickup");
    const dr = sp.get("dropoff");
    if (pu) setPickupAddress(pu);
    if (dr) setDropoffAddress(dr);
  }, []);

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
    <div className="min-h-screen bg-[#0a0f1e]">
      <Navbar />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-2">🚖 Taxi Xizmati</p>
          <h1 className="text-3xl font-black text-white mb-2">Taxi buyurtma qiling</h1>
          <p className="text-slate-400">Tez, qulay va xavfsiz sayohat</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">
              <h2 className="font-black text-white mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-amber-400" /> Manzillar
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-400 border-2 border-green-300" />
                  <input
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Qayerdan ketmoqchisiz?"
                    className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-slate-500 text-sm outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 px-2">
                  <div className="w-px h-6 bg-[#1e2d45] ml-1" />
                  <span className="text-xs text-slate-600">↕</span>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-400 border-2 border-red-300" />
                  <input
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Qayerga borasiz?"
                    className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded-xl pl-10 pr-4 py-3.5 text-white placeholder:text-slate-500 text-sm outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">
              <h2 className="font-black text-white mb-4 flex items-center gap-2">
                <Clock size={18} className="text-amber-400" /> Vaqt
              </h2>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setScheduleType("NOW")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    scheduleType === "NOW"
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-[#0a0f1e] border border-[#1e2d45] text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ Hozir
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("SCHEDULED")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    scheduleType === "SCHEDULED"
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-[#0a0f1e] border border-[#1e2d45] text-slate-400 hover:text-white"
                  }`}
                >
                  📅 Rejalashtirilgan
                </button>
              </div>
              {scheduleType === "SCHEDULED" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-[#0a0f1e] border border-[#1e2d45] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 [color-scheme:dark]"
                />
              )}
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="💬 Qo'shimcha izoh (ixtiyoriy)"
                className="w-full mt-3 bg-[#0a0f1e] border border-[#1e2d45] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm outline-none min-h-[80px] resize-none focus:border-amber-500/50"
              />
            </div>

            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6">
              <h2 className="font-black text-white mb-4 flex items-center gap-2">
                <Car size={18} className="text-amber-400" /> Xizmat turi
              </h2>
              {loadingServices ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-[#0a0f1e] rounded-xl p-4 animate-pulse h-24" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-5xl mb-3">🚖</div>
                  <p className="text-slate-500 text-sm">Xizmatlar mavjud emas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedServiceId(s.id)}
                      className={`text-left rounded-xl p-4 transition-all border ${
                        selectedServiceId === s.id
                          ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10"
                          : "bg-[#0a0f1e] border-[#1e2d45] hover:border-[#2a3a55]"
                      }`}
                    >
                      <div className="text-2xl mb-2">{serviceEmoji(s.serviceType)}</div>
                      <p
                        className={`font-black text-sm ${
                          selectedServiceId === s.id ? "text-amber-400" : "text-white"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{taxiServiceTypeLabel(s.serviceType)}</p>
                      <p
                        className={`text-sm font-black mt-2 ${
                          selectedServiceId === s.id ? "text-amber-400" : "text-slate-300"
                        }`}
                      >
                        {formatPricePerUnit(Number(s.price), "km")}
                      </p>
                      {s.avgRating != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs text-slate-500">{s.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#1a2234] to-[#111827] px-6 py-5 border-b border-[#1e2d45]">
                <h3 className="font-black text-white flex items-center gap-2">
                  <Receipt size={16} className="text-amber-400" /> Buyurtma xulosasi
                </h3>
              </div>

              <div className="p-5 space-y-4">
                {selectedService && (
                  <div className="bg-[#0a0f1e] rounded-xl p-4 border border-[#1e2d45]">
                    <p className="text-xs text-slate-500 uppercase font-black mb-1">Xizmat</p>
                    <p className="font-black text-white">{selectedService.title}</p>
                    <p className="text-xs text-slate-400">{taxiServiceTypeLabel(selectedService.serviceType)}</p>
                  </div>
                )}

                {estimate ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Masofa</span>
                      <span className="text-white font-bold">
                        {Number(estimate.estimatedDistanceKm).toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Taxminiy vaqt</span>
                      <span className="text-white font-bold">~{estimate.estimatedMinutes} daqiqa</span>
                    </div>
                    <div className="border-t border-amber-500/20 pt-2 flex justify-between">
                      <span className="text-amber-400 font-black">Taxminiy narx</span>
                      <span className="text-amber-400 font-black text-lg">
                        {Number(estimate.estimatedPrice).toLocaleString()} so&apos;m
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0a0f1e] border border-dashed border-[#1e2d45] rounded-xl p-4 text-center">
                    <p className="text-slate-500 text-sm">Narxni hisoblang</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void calculateEstimate()}
                  disabled={estimating || !selectedService}
                  className="w-full bg-[#1a2234] hover:bg-[#1e2d45] border border-[#1e2d45] text-white font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  {estimating ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                  {estimating ? "Hisoblanmoqda..." : "Narxni hisoblash"}
                </button>

                <button
                  type="button"
                  onClick={() => void submitOrder()}
                  disabled={submitting || !selectedServiceId || !pickupAddress || !dropoffAddress}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-30 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                  {submitting ? "Yuborilmoqda..." : "Buyurtma berish 🚖"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
