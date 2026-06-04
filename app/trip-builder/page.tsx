"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  MapPin, Home, Car, UserCircle,
  CheckCircle2, Info, Loader2, ArrowRight,
  Check, X, Calendar, Users, Sparkles, Wand2, Sun, CloudRain, Wind,
  ChevronRight, Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";
import DashboardShell from "@/components/dashboard/DashboardShell";
import {
  formatPrice,
  formatPricePerUnit,
  formatUzInteger,
  languageLabel,
  taxiServiceTypeLabel,
} from "@/lib/displayHelpers";

type Destination = { id: string; title: string };

type InventoryItem = {
  id: string;
  title: string;
  price?: number;
  nightlyPrice?: number;
  roomTypeId?: string;
  roomTypeName?: string;
  pricePerDay?: number;
  pricePerHour?: number;
  city?: string;
  region?: string;
  type?: string;
  language?: string;
  availableRooms?: number;
  avgRating?: number;
  reviewCount?: number;
};

type InventoryData = {
  hotels: InventoryItem[];
  taxis: InventoryItem[];
  guides: InventoryItem[];
};

const TABS = [
  { id: "ai",        label: "AI",           icon: Sparkles },
  { id: "basics",    label: "Manzil",       icon: MapPin },
  { id: "hotel",     label: "Mehmonxona",   icon: Home },
  { id: "transport", label: "Transport",    icon: Car },
  { id: "guide",     label: "Gid",          icon: UserCircle },
] as const;

type TabId = typeof TABS[number]["id"];

const DEST_VISUAL: Record<string, { emoji: string; gradient: string }> = {
  samarqand: { emoji: "🕌", gradient: "from-amber-700/90 via-amber-900/40 to-gray-900" },
  buxoro:    { emoji: "🏰", gradient: "from-orange-800/90 via-amber-900/40 to-gray-900" },
  xiva:      { emoji: "🏛️", gradient: "from-teal-800/90 via-slate-900/40 to-gray-900" },
  zomin:     { emoji: "🌲", gradient: "from-emerald-800/90 via-green-900/40 to-gray-900" },
  toshkent:  { emoji: "🌆", gradient: "from-blue-800/90 via-indigo-900/40 to-gray-900" },
  jizzax:    { emoji: "🏔️", gradient: "from-slate-600/90 via-gray-800/40 to-gray-900" },
};

const AI_EXAMPLES = ["Samarqandga 2 kun", "Zominda tur", "Buxoroga oilaviy", "Xivaga 3 kun"];

function destKey(title: string) {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDestVisual(title: string) {
  const key = destKey(title);
  for (const [k, v] of Object.entries(DEST_VISUAL)) {
    if (key.includes(k)) return v;
  }
  return { emoji: "📍", gradient: "from-slate-700/90 to-gray-900" };
}

export default function TripBuilderPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("ai");

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pax, setPax] = useState(2);
  const [roomCount, setRoomCount] = useState(1);

  const [selectedHotel, setSelectedHotel]   = useState<InventoryItem | null>(null);
  const [selectedTaxi, setSelectedTaxi]     = useState<InventoryItem | null>(null);
  const [selectedGuide, setSelectedGuide]   = useState<InventoryItem | null>(null);

  const [inventory, setInventory]   = useState<InventoryData | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiSuggestedTotal, setAiSuggestedTotal] = useState<number | null>(null);
  const [priceEditOpen, setPriceEditOpen] = useState(false);

  const [cartBash, setCartBash] = useState(false);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await fetch("/api/builder/destinations");
        setDestinations(await res.json());
      } catch {
        toast.error("Manzillarni yuklashda xatolik");
      } finally { setLoadingDest(false); }
    }
    void loadDestinations();
  }, []);

  useEffect(() => {
    if (!destination) {
      setInventory(null);
      setSelectedHotel(null); setSelectedTaxi(null); setSelectedGuide(null);
      return;
    }
    async function fetchInventory() {
      setLoadingInv(true);
      try {
        const res = await fetch(`/api/builder/inventory?dest=${encodeURIComponent(destination)}`);
        setInventory(await res.json());
      } catch {
        toast.error("Xizmatlarni yuklashda xato");
      } finally { setLoadingInv(false); }
    }
    void fetchInventory();
  }, [destination]);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const days = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  }, [startDate, endDate]);

  const hotelTotal = selectedHotel?.nightlyPrice ? selectedHotel.nightlyPrice * days * roomCount : 0;
  const taxiTotal  = selectedTaxi?.price ?? 0;
  const guideTotal = selectedGuide?.pricePerDay ? selectedGuide.pricePerDay * days : 0;
  const grandTotal = hotelTotal + taxiTotal + guideTotal;

  const triggerCartBounce = () => {
    setCartBash(true);
    setTimeout(() => setCartBash(false), 300);
  };

  async function handleAIGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiMessage("");
    try {
      const res = await fetch("/api/builder/ai-match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Tanish xatolik");
      
      const { data } = json;
      setDestination(data.destination); setStartDate(data.startDate); setEndDate(data.endDate); setPax(data.pax);
      if (data.hotel)
        setSelectedHotel({
          ...data.hotel,
          roomTypeId: data.hotel.roomTypeId,
          nightlyPrice: data.hotel.nightlyPrice,
        });
      if (data.taxi) setSelectedTaxi({ ...data.taxi, price: data.taxi.price });
      if (data.guide)
        setSelectedGuide({
          ...data.guide,
          pricePerDay: data.guide.pricePerDay,
          pricePerHour: data.guide.pricePerHour,
        });
      
      setAiMessage(data.message || "Safar muvaffaqiyatli yig'ildi!");
      const h = data.hotel?.nightlyPrice ? data.hotel.nightlyPrice * Math.max(1, Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000)) : 0;
      const t = data.taxi?.price ?? 0;
      const g = data.guide?.pricePerDay ? data.guide.pricePerDay * Math.max(1, Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000)) : 0;
      setAiSuggestedTotal(h + t + g);
      toast.success("AI ishladi! Sayohat jadvali yangilandi ✨");
      triggerCartBounce();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally { setAiLoading(false); }
  }

  async function checkout() {
    if (!destination || !startDate || !endDate) {
      toast.error("Sanalarni kiritish shart!");
      setActiveTab("basics");
      return;
    }
    if (selectedHotel && !selectedHotel.roomTypeId) {
      toast.error("Mehmonxona xona turi topilmadi");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/travel-plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), pax,
          hotel: selectedHotel
            ? {
                id: selectedHotel.id,
                roomTypeId: selectedHotel.roomTypeId,
                title: selectedHotel.title,
                roomCount,
              }
            : undefined,
          taxi: selectedTaxi ? { id: selectedTaxi.id, title: selectedTaxi.title } : undefined,
          guide: selectedGuide ? { id: selectedGuide.id, title: selectedGuide.title } : undefined,
        }),
      });
      if (res.status === 401) {
        const back =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/trip-builder";
        router.push(loginWithNext(back || "/trip-builder"));
        return;
      }
      const data = (await res.json()) as { planId?: string; totalAmount?: number; message?: string };
      if (!res.ok) throw new Error(data.message || "Server xatosi");
      toast.success(
        `Safaringiz saqlandi! Jami: ${formatPrice(Number(data.totalAmount ?? grandTotal))} 🎉`,
      );
      if (data.planId) {
        router.push(`/payments/checkout/${data.planId}`);
      } else {
        setTimeout(() => router.push("/bookings"), 1500);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally { setSubmitting(false); }
  }

  function ItemCard({ item, isSelected, onToggle }: { item: InventoryItem; isSelected: boolean; onToggle: () => void }) {
    let sub = "";
    if (item.nightlyPrice != null) sub = item.city || "";
    else if (item.type) sub = taxiServiceTypeLabel(item.type);
    else if (item.language) sub = languageLabel(item.language);
    else sub = item.region || item.city || "";

    let priceLine = formatPrice(0);
    if (item.nightlyPrice != null)
      priceLine = formatPricePerUnit(item.nightlyPrice, "kecha");
    else if (item.pricePerHour != null && item.pricePerHour > 0)
      priceLine = formatPricePerUnit(item.pricePerHour, "soat");
    else if (item.price != null) priceLine = formatPrice(item.price);
    else if (item.pricePerDay != null && item.pricePerDay > 0)
      priceLine = formatPricePerUnit(item.pricePerDay, "kecha");

    return (
      <div
        onClick={() => { onToggle(); triggerCartBounce(); }}
        className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-1 group ${
          isSelected
            ? "bg-blue-50 border-2 border-blue-500 shadow-md ring-4 ring-blue-500/10 scale-[1.02]"
            : "bg-white border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm hover:-translate-y-1"
        }`}
      >
        {isSelected && (
          <div className="absolute top-3 right-3 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
            <Check size={14} strokeWidth={3} className="text-white" />
          </div>
        )}
        <h3 className={`font-black text-sm leading-tight pr-8 mb-1 ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
          {item.title}
        </h3>
        {sub && (
          <p className="text-xs text-gray-500 mb-4 uppercase tracking-wide font-bold">{sub}</p>
        )}
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div className={`font-black text-base ${isSelected ? "text-blue-600" : "text-gray-900"}`}>
            {priceLine}
          </div>
          <button
            type="button"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isSelected
                ? "bg-red-50 text-red-500 hover:bg-red-100"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            {isSelected ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>
    );
  }

  function CatalogSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="p-5 rounded-2xl border border-gray-200 bg-white animate-pulse">
            <div className="h-4 bg-gray-50 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-50 rounded w-1/4 mb-6" />
            <div className="h-5 bg-gray-50 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  function CatalogSection({ tabId }: { tabId: "hotel" | "transport" | "guide" }) {
    const items = tabId === "hotel" ? inventory?.hotels : tabId === "transport" ? inventory?.taxis : inventory?.guides;
    const selectedItem = tabId === "hotel" ? selectedHotel : tabId === "transport" ? selectedTaxi : selectedGuide;
    const setSelected = tabId === "hotel" ? setSelectedHotel : tabId === "transport" ? setSelectedTaxi : setSelectedGuide;
    const label = tabId === "hotel" ? "mehmonxona" : tabId === "transport" ? "transport" : "gid";

    if (loadingInv) return <CatalogSkeleton />;
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-3xl py-16 bg-white/50">
          <Info className="w-10 h-10 text-gray-400 mb-3" />
          <h3 className="font-black text-gray-900">Tizimda takliflar yo&apos;q</h3>
          <p className="text-gray-500 text-sm text-center mt-1 max-w-xs">{destination} hududida hozircha &quot;{label}&quot; mavjud emas.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isSelected={selectedItem?.id === item.id}
            onToggle={() => {
              setSelected(selectedItem?.id === item.id ? null : item);
              if (aiSuggestedTotal != null) setAiSuggestedTotal(null);
            }}
          />
        ))}
      </div>
    );
  }

  function TimelineNode({
    icon: Icon, title, time, isAdded, onNavigate, onRemove, children,
  }: {
    icon: React.ElementType;
    title: string;
    time: string;
    isAdded: boolean;
    onNavigate: () => void;
    onRemove?: () => void;
    children?: React.ReactNode;
  }) {
    return (
      <div className="relative pl-10 py-3 group">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200 -z-10 group-last:bottom-auto group-last:h-full" />
        <div
          className={`absolute left-0 top-[18px] w-8 h-8 rounded-full flex items-center justify-center border-4 border-white transition-all shadow-sm ${
            isAdded
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 cursor-pointer"
          }`}
          onClick={!isAdded ? onNavigate : undefined}
          onKeyDown={undefined}
          role={!isAdded ? "button" : undefined}
          tabIndex={!isAdded ? 0 : undefined}
        >
          <Icon size={14} strokeWidth={isAdded ? 3 : 2} />
        </div>

        <div
          className={`rounded-2xl transition-all duration-300 ${
            isAdded
              ? "bg-white border border-gray-200 shadow-sm p-4 animate-in slide-in-from-right-4"
              : "border-2 border-dashed border-gray-200 bg-gray-50/50 p-3 hover:bg-blue-50 hover:border-blue-200 cursor-pointer text-gray-500 hover:text-blue-600"
          }`}
          onClick={!isAdded ? onNavigate : undefined}
          onKeyDown={undefined}
          role={!isAdded ? "button" : undefined}
          tabIndex={!isAdded ? 0 : undefined}
        >
          {isAdded ? (
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest bg-gray-50 px-2 py-0.5 rounded-md">
                  {time}
                </span>
                {onRemove && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded-md transition-all"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-2">{title}</h4>
              {children}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-0.5">{time}</span>
                <span className="text-sm font-bold">+ {title} tanlash</span>
              </div>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform opacity-50" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const getWeatherAdvice = () => {
    if (!destination) return null;
    const dest = destination.toLowerCase();
    if (dest === "zomin" || dest === "chimyon" || dest.includes("tog")) {
      return { icon: Wind, tip: `Tog'li muhit. ${destination} qishda sovuq, yozda salqin bo'ladi. Issiqroq kiyim olishni unutmang.`, temp: "+12°C" };
    }
    if (dest === "samarqand" || dest === "buxoro" || dest === "xiva") {
      return { icon: Sun, tip: "Havo quruq va issiq. Qulay yozgi kiyim, bosh kiyim va suv zaxirasini olish maslahat beriladi.", temp: "+28°C" };
    }
    return { icon: CloudRain, tip: "O'zgaruvchan havo kutilmoqda. Safar sanasida ob-havoni tekshiring.", temp: "+20°C" };
  };

  const weather = getWeatherAdvice();
  const hasServices = !!(selectedHotel || selectedTaxi || selectedGuide);
  const stepIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <DashboardShell
      title="Safar Yig'uvchi"
      subtitle="AI ob-havo va Timeline yordamida safaringizni chizing"
    >
      <div className="flex bg-white border border-gray-200 p-1.5 rounded-2xl shadow-sm mb-6 gap-1 overflow-x-auto hide-scrollbar w-full">
        {TABS.map((tab) => {
          const isDisabled = tab.id !== "basics" && tab.id !== "ai" && !destination;
          const isAI = tab.id === "ai";
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? isAI
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "bg-gray-900 text-white shadow-md"
                  : isDisabled
                    ? "text-gray-300 cursor-not-allowed"
                    : isAI
                      ? "text-violet-600 hover:bg-violet-50"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full max-w-full">
        <div className="flex-1 w-full min-w-0 max-w-full">
          <div className="hidden lg:flex gap-6">
            <nav className="w-44 shrink-0 space-y-1">
              {TABS.map((tab, i) => {
                const isDisabled = tab.id !== "basics" && tab.id !== "ai" && !destination;
                const isActive = activeTab === tab.id;
                const isDone = i < stepIndex;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-bold transition-all ${
                      isActive
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : isDone
                          ? "text-gray-600 hover:bg-gray-50"
                          : isDisabled
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      isActive ? "bg-amber-500 text-white" : isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-50 text-gray-500"
                    }`}>
                      {isDone && !isActive ? <Check size={12} /> : i + 1}
                    </span>
                    <tab.icon size={16} className="shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex-1 min-w-0">
              {renderMainPanel()}
            </div>
          </div>

          <div className="lg:hidden">{renderMainPanel()}</div>
        </div>

        {/* Right sidebar */}
        <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-24 max-w-full">
          {renderTripSidebar()}
        </div>
      </div>

      {/* Mobile floating price bar */}
      {hasServices && (
        <div className="fixed bottom-20 left-4 right-4 z-50 xl:hidden">
          <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-gray-900/20">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black">Jami</p>
              <p className="text-lg font-black text-amber-600">
                {formatUzInteger(grandTotal)} <span className="text-xs text-gray-500">so&apos;m</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={submitting || !destination}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-black px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Tasdiqlash
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );

  function renderMainPanel() {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-200 p-4 sm:p-8 min-h-[400px] transition-all relative overflow-hidden w-full">
        {destination && activeTab !== "ai" && weather && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-2xl flex gap-4 items-start animate-in slide-in-from-top-4">
            <div className="w-11 h-11 bg-white border border-sky-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <weather.icon size={22} className="text-sky-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm mb-1">
                {destination} — {weather.temp}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{weather.tip}</p>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Sparkles size={22} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">AI Sayohat Yordamchisi</h2>
                <p className="text-sm text-gray-500">Istaganingizni yozing — qolganini men qilaman</p>
              </div>
            </div>
            <form onSubmit={handleAIGenerate} className="relative mb-5">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Masalan: Men oilam (4 kishi) bilan Zominga 3 kunlik arzonroq safar qilmoqchiman."
                className="w-full h-32 bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 text-gray-900 placeholder:text-gray-400 resize-none outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all text-sm"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="absolute bottom-4 right-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-violet-500/25"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Tuzish 🪄
              </button>
            </form>
            <div className="relative z-10 flex flex-wrap gap-2 mb-5">
              {AI_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAiPrompt(ex)}
                  className="text-xs px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
            {aiMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-start gap-3 animate-in zoom-in-95">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                {aiMessage}
              </div>
            )}
          </div>
        )}

        {activeTab === "basics" && (
          <div>
            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <MapPin size={18} className="text-amber-500" /> Manzilingizni tanlang
            </h2>
            {loadingDest ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[2/3] bg-gray-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {destinations.map((d) => {
                  const vis = getDestVisual(d.title);
                  const selected = destination === d.title;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDestination(d.title)}
                      className={`relative aspect-[2/3] rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                        selected ? "border-amber-500 bg-amber-50 shadow-md ring-4 ring-amber-500/10 scale-105" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:-translate-y-1"
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-t ${vis.gradient}`} />
                      <div className="absolute inset-0 flex flex-col justify-end p-4 text-left">
                        <span className="text-3xl mb-1">{vis.emoji}</span>
                        <span className={`font-bold text-sm ${selected ? "text-amber-700" : "text-gray-700"}`}>{d.title}</span>
                      </div>
                      {selected && (
                        <div className="absolute top-3 right-3 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check size={14} strokeWidth={3} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-amber-500" /> Sana va kishilar soni
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { label: "Boshlanish", type: "date" as const, min: tomorrow, value: startDate, set: setStartDate },
                { label: "Tugash", type: "date" as const, min: startDate || tomorrow, value: endDate, set: setEndDate },
              ].map((f) => (
                <div key={f.label} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-4 transition-colors">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    min={f.min}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="w-full bg-transparent font-bold text-gray-900 outline-none text-sm cursor-pointer [color-scheme:light]"
                  />
                </div>
              ))}
              <div className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl p-4">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1 flex items-center gap-1">
                  <Users size={10} /> Kishilar
                </label>
                <input
                  type="number"
                  min={1}
                  value={pax}
                  onChange={(e) => setPax(Number(e.target.value))}
                  className="w-full bg-transparent font-black text-gray-900 text-xl outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!destination || !startDate || !endDate) return toast.error("Manzil va sanani to'ldiring!");
                  setActiveTab("hotel");
                }}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg text-sm"
              >
                Katalogni ko&apos;rish <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {(activeTab === "hotel" || activeTab === "transport" || activeTab === "guide") && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">
                {activeTab === "hotel" ? "Mehmonxonalar" : activeTab === "transport" ? "Transport" : "Gid xizmati"}
              </h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                {destination}
              </span>
            </div>
            <CatalogSection tabId={activeTab as "hotel" | "transport" | "guide"} />
          </div>
        )}
      </div>
    );
  }

  function renderTripSidebar() {
    return (
      <div
        className={`bg-white rounded-[2rem] border shadow-sm transition-all duration-300 w-full sticky top-24 ${
          cartBash ? "scale-[1.02] border-indigo-400 shadow-indigo-500/20" : "border-gray-200 scale-100"
        }`}
      >
        <div
          className={`px-6 py-5 rounded-t-[2rem] transition-colors ${
            aiMessage
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {aiMessage ? (
              <Sparkles size={16} className="text-violet-200 animate-pulse" />
            ) : (
              <MapPin size={16} className="text-amber-400" />
            )}
            <h3 className="font-black text-sm">Sayohat Rejasi</h3>
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold ${aiMessage ? "text-violet-200" : "text-gray-400"}`}>
            {destination || "Manzil tanlanmagan"} • {days} kun • {pax} kishi
          </p>
        </div>

        <div className="p-5 pb-0">
          <TimelineNode
            icon={Car}
            title="Transport"
            time="1-KUN, 08:00"
            isAdded={!!selectedTaxi}
            onNavigate={() => setActiveTab("transport")}
            onRemove={() => setSelectedTaxi(null)}
          >
            {selectedTaxi && (
              <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-500">{selectedTaxi.title}</span>
                <span className="font-black text-gray-900 text-sm">
                  {selectedTaxi.price != null ? formatPrice(selectedTaxi.price) : "—"}
                </span>
              </div>
            )}
          </TimelineNode>

          <TimelineNode
            icon={Home}
            title="Mehmonxona"
            time="1-KUN, 14:00"
            isAdded={!!selectedHotel}
            onNavigate={() => setActiveTab("hotel")}
            onRemove={() => setSelectedHotel(null)}
          >
            {selectedHotel && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 leading-tight pr-2">{selectedHotel.title}</span>
                  <span className="font-black text-gray-900 text-sm shrink-0">
                    {selectedHotel.nightlyPrice != null
                      ? formatPricePerUnit(selectedHotel.nightlyPrice, "kecha")
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between pl-1">
                  <span className="text-[10px] text-gray-500 uppercase font-black">{days} tun / xona soni:</span>
                  <input
                    type="number"
                    min={1}
                    value={roomCount}
                    onChange={(e) => setRoomCount(Number(e.target.value))}
                    className="w-12 h-6 bg-gray-100 border border-gray-200 rounded text-center text-xs font-bold text-gray-900 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}
          </TimelineNode>

          <TimelineNode
            icon={UserCircle}
            title="Gid"
            time="2-KUN, 10:00"
            isAdded={!!selectedGuide}
            onNavigate={() => setActiveTab("guide")}
            onRemove={() => setSelectedGuide(null)}
          >
            {selectedGuide && (
              <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 leading-tight pr-2">
                  {selectedGuide.title} ({languageLabel(selectedGuide.language || "")})
                </span>
                <span className="font-black text-gray-900 text-sm shrink-0">
                  {selectedGuide.pricePerHour != null && selectedGuide.pricePerHour > 0
                    ? formatPricePerUnit(selectedGuide.pricePerHour, "soat")
                    : selectedGuide.pricePerDay != null
                      ? formatPricePerUnit(selectedGuide.pricePerDay, "kecha")
                      : "—"}
                </span>
              </div>
            )}
          </TimelineNode>
        </div>

        <div className="px-5 pb-5 pt-6">
          <button
            type="button"
            onClick={() => setPriceEditOpen(!priceEditOpen)}
            className="w-full text-xs font-bold text-gray-500 hover:text-amber-400 mb-2 py-1 transition-colors"
          >
            Narxni tahrirlash {priceEditOpen ? "▲" : "▼"}
          </button>

          {priceEditOpen && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-200 space-y-2 text-xs">
              {selectedHotel?.nightlyPrice != null && (
                <div className="flex justify-between text-gray-500">
                  <span>🏨 {formatUzInteger(selectedHotel.nightlyPrice)} × {days} kun × {roomCount} xona</span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(hotelTotal)}</span>
                </div>
              )}
              {selectedTaxi && (
                <div className="flex justify-between text-gray-500">
                  <span>🚖 Transport</span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(taxiTotal)}</span>
                </div>
              )}
              {selectedGuide?.pricePerDay != null && (
                <div className="flex justify-between text-gray-500">
                  <span>🧭 {formatUzInteger(selectedGuide.pricePerDay)} × {days} kun</span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(guideTotal)}</span>
                </div>
              )}
              {aiSuggestedTotal != null && aiSuggestedTotal !== grandTotal && (
                <div className="flex justify-between pt-2 border-t border-gray-200 text-gray-500">
                  <span>AI taklifi</span>
                  <span className="line-through">{formatUzInteger(aiSuggestedTotal)}</span>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-black">Jami byudjet</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600">{formatUzInteger(grandTotal)}</span>
              <span className="text-sm text-gray-500 ml-1">so&apos;m</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-200">
              {hotelTotal > 0 && <span className="text-xs text-gray-400">🏨 {formatUzInteger(hotelTotal)}</span>}
              {taxiTotal > 0 && <span className="text-xs text-gray-400">🚖 {formatUzInteger(taxiTotal)}</span>}
              {guideTotal > 0 && <span className="text-xs text-gray-400">🧭 {formatUzInteger(guideTotal)}</span>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={submitting || !destination || (!selectedHotel && !selectedTaxi && !selectedGuide)}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-gray-900/20 flex items-center justify-center gap-2 text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" /> Saqlanmoqda...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Safarni Rejalashtirish →
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
