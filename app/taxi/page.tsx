"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import {
  MapPin,
  Clock,
  Car,
  Calculator,
  Receipt,
  Star,
  Loader2,
  Zap,
  Calendar,
  Bus,
  Truck,
  Building2,
  Map as MapIcon,
} from "lucide-react";
import type { ElementType } from "react";
import { toast } from "sonner";
import { formatPricePerUnit, taxiServiceTypeLabel } from "@/lib/displayHelpers";
import { geocodeAddress } from "@/lib/taxi/geocodeAddress";

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

const SERVICE_TYPE_ICONS: Record<string, ElementType> = {
  STANDARD: Car,
  COMFORT: Car,
  BUSINESS: Car,
  MINIBUS: Bus,
  CARGO: Truck,
  INTERCITY_TRANSFER: Bus,
  HOTEL_TRANSFER: Building2,
  TOUR_DAILY_TRANSPORT: MapIcon,
};

function ServiceIcon({ serviceType, className }: { serviceType: string; className?: string }) {
  const Icon = SERVICE_TYPE_ICONS[serviceType] ?? Car;
  return <Icon size={24} className={className} />;
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

  async function resolveRouteCoords() {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      throw new Error("Qayerdan va qayerga manzillarini kiriting");
    }
    const [pickup, dropoff] = await Promise.all([
      geocodeAddress(pickupAddress),
      geocodeAddress(dropoffAddress),
    ]);
    return { pickup, dropoff };
  }

  async function calculateEstimate() {
    if (!selectedServiceId) {
      toast.error("Avval xizmat turini tanlang");
      return;
    }
    setEstimating(true);
    try {
      const { pickup, dropoff } = await resolveRouteCoords();
      const res = await fetch("/api/taxi/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
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
      const { pickup, dropoff } = await resolveRouteCoords();
      const res = await fetch("/api/taxi/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: pickup.label || pickupAddress.trim(),
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropoffAddress: dropoff.label || dropoffAddress.trim(),
          dropoffLat: dropoff.lat,
          dropoffLng: dropoff.lng,
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
    <DashboardShell title="Taxi Xizmati" subtitle="Tez, qulay va xavfsiz sayohat">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-amber-500" /> Manzillar
              </h2>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500" />
                  <input
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Qayerdan ketmoqchisiz?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3 px-2">
                  <div className="w-px h-6 bg-gray-50 ml-1" />
                  <span className="text-xs text-gray-400">↕</span>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500" />
                  <input
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Qayerga borasiz?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3.5 text-gray-900 placeholder:text-gray-400 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-amber-500" /> Vaqt
              </h2>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setScheduleType("NOW")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    scheduleType === "NOW"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Zap size={16} /> Hozir
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("SCHEDULED")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                    scheduleType === "SCHEDULED"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Calendar size={16} /> Rejalashtirilgan
                  </span>
                </button>
              </div>
              {scheduleType === "SCHEDULED" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 [color-scheme:light]"
                />
              )}
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Qo'shimcha izoh (ixtiyoriy)"
                className="w-full mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 text-sm outline-none min-h-[80px] resize-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                <Car size={18} className="text-amber-500" /> Xizmat turi
              </h2>
              {loadingServices ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse h-24" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Car size={40} className="text-slate-300 mb-3" />
                  <p className="text-gray-900 text-sm font-bold">
                    Hozircha faol taxi xizmati yo‘q
                  </p>
                  <p className="text-gray-500 text-xs mt-1.5 max-w-sm">
                    Tez orada partnerlar xizmat qo‘shadi. Keyinroq qayta urinib
                    ko‘ring yoki support bilan bog‘laning.
                  </p>
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
                          ? "bg-amber-50 border-amber-300 shadow-md"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <ServiceIcon
                        serviceType={s.serviceType}
                        className={`mb-2 ${selectedServiceId === s.id ? "text-orange-500" : "text-slate-500"}`}
                      />
                      <p
                        className={`font-black text-sm ${
                          selectedServiceId === s.id ? "text-amber-700" : "text-gray-900"
                        }`}
                      >
                        {s.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{taxiServiceTypeLabel(s.serviceType)}</p>
                      <p
                        className={`text-sm font-black mt-2 ${
                          selectedServiceId === s.id ? "text-amber-400" : "text-gray-700"
                        }`}
                      >
                        {formatPricePerUnit(Number(s.price), "km")}
                      </p>
                      {s.avgRating != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs text-gray-500">{s.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-100 to-white px-6 py-5 border-b border-gray-200">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <Receipt size={16} className="text-amber-500" /> Buyurtma xulosasi
                </h3>
              </div>

              <div className="p-5 space-y-4">
                {selectedService && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase font-black mb-1">Xizmat</p>
                    <p className="font-black text-gray-900">{selectedService.title}</p>
                    <p className="text-xs text-gray-500">{taxiServiceTypeLabel(selectedService.serviceType)}</p>
                  </div>
                )}

                {estimate ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Masofa</span>
                      <span className="text-gray-900 font-bold">
                        {Number(estimate.estimatedDistanceKm).toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Taxminiy vaqt</span>
                      <span className="text-gray-900 font-bold">~{estimate.estimatedMinutes} daqiqa</span>
                    </div>
                    <div className="border-t border-amber-200 pt-2 flex justify-between">
                      <span className="text-amber-700 font-black">Taxminiy narx</span>
                      <span className="text-amber-600 font-black text-lg">
                        {Number(estimate.estimatedPrice).toLocaleString()} so&apos;m
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-gray-500 text-sm">Narxni hisoblang</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void calculateEstimate()}
                  disabled={estimating || !selectedService}
                  className="w-full bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 font-black py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
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
                  {submitting ? "Yuborilmoqda..." : "Buyurtma berish"}
                </button>
              </div>
            </div>
          </div>
        </div>
    </DashboardShell>
  );
}
