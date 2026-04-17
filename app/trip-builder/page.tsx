"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  MapPin, Home, Car, UserCircle,
  CheckCircle2, Plus, Info, ChevronRight, Loader2, ArrowRight,
  ShoppingBag, Check, X, Calendar, Users, Sparkles, Wand2, Sun, CloudRain, Wind
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

type Destination = { id: string; title: string };

type InventoryItem = {
  id: string;
  title: string;
  price?: number;
  nightlyPrice?: number;
  pricePerDay?: number;
  city?: string;
  region?: string;
  type?: string;
  language?: string;
  availableRooms?: number;
};

type InventoryData = {
  hotels: InventoryItem[];
  taxis: InventoryItem[];
  guides: InventoryItem[];
};

const TABS = [
  { id: "ai",        label: "AI Yordamchi", icon: Sparkles },
  { id: "basics",    label: "Manzil",       icon: MapPin },
  { id: "hotel",     label: "Mehmonxona",   icon: Home },
  { id: "transport", label: "Transport",    icon: Car },
  { id: "guide",     label: "Gid",          icon: UserCircle },
] as const;

type TabId = typeof TABS[number]["id"];

export default function TripBuilderPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDest, setLoadingDest] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("ai");

  // Selection State
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

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

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
      if (data.hotel) setSelectedHotel({ ...data.hotel, nightlyPrice: data.hotel.nightlyPrice });
      if (data.taxi) setSelectedTaxi({ ...data.taxi, price: data.taxi.price });
      if (data.guide) setSelectedGuide({ ...data.guide, pricePerDay: data.guide.pricePerDay });
      
      setAiMessage(data.message || "Safar muvaffaqiyatli yig'ildi!");
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
    setSubmitting(true);
    try {
      const res = await fetch("/api/travel-plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), pax,
          hotel: selectedHotel ? { id: selectedHotel.id, title: selectedHotel.title, roomCount, nightlyPrice: selectedHotel.nightlyPrice } : undefined,
          taxi: selectedTaxi ? { id: selectedTaxi.id, title: selectedTaxi.title, price: selectedTaxi.price } : undefined,
          guide: selectedGuide ? { id: selectedGuide.id, title: selectedGuide.title, pricePerDay: selectedGuide.pricePerDay } : undefined,
        }),
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) throw new Error("Server xatosi");
      toast.success("Safaringiz saqlandi! 🎉");
      setTimeout(() => router.push("/bookings"), 1500);
    } catch {
      toast.error("Saqlashda xatolik");
    } finally { setSubmitting(false); }
  }

  function ItemCard({ item, isSelected, onToggle }: { item: InventoryItem; isSelected: boolean; onToggle: () => void }) {
    const price = item.nightlyPrice || item.price || item.pricePerDay || 0;
    const priceSub = item.nightlyPrice ? "so'm/tun" : item.pricePerDay ? "so'm/kun" : "so'm";
    const sub = item.city || item.type || item.language || "";
    return (
      <div onClick={() => { onToggle(); triggerCartBounce(); }}
        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 group ${
          isSelected ? "border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-600/10 scale-[1.02]" : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}>
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-in zoom-in duration-200">
            <Check size={12} strokeWidth={3} className="text-white" />
          </div>
        )}
        <h3 className={`font-black text-sm leading-tight pr-8 ${isSelected ? "text-blue-900" : "text-slate-900"}`}>{item.title}</h3>
        {sub && <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">{sub}</p>}
        <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100">
          <div><span className="font-black text-slate-900">{price.toLocaleString()}</span><span className="text-xs text-slate-400 ml-1">{priceSub}</span></div>
          <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isSelected ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}>{isSelected ? <X size={14} /> : <Plus size={14} />}</button>
        </div>
      </div>
    );
  }

  function CatalogSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(k => (
          <div key={k} className="p-5 rounded-2xl border-2 border-slate-100 bg-white animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-1/4 mb-6"></div>
            <div className="flex justify-between items-end border-t border-slate-50 pt-3">
              <div className="h-5 bg-slate-200 rounded w-20"></div><div className="w-8 h-8 bg-slate-100 rounded-full"></div>
            </div>
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
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl py-16 bg-slate-50/50">
          <Info className="w-10 h-10 text-slate-300 mb-3" />
          <h3 className="font-black text-slate-700">Tizimda takliflar yo'q</h3>
          <p className="text-slate-500 text-sm text-center mt-1 max-w-xs">{destination} hududida hozircha "{label}" mavjud emas.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(item => <ItemCard key={item.id} item={item} isSelected={selectedItem?.id === item.id} onToggle={() => setSelected(selectedItem?.id === item.id ? null : item)} />)}
      </div>
    );
  }

  // Visual Timeline Node component
  function TimelineNode({
    icon: Icon, title, time, isAdded, onNavigate, onRemove, children
  }: {
    icon: any; title: string; time: string; isAdded: boolean; onNavigate: () => void; onRemove?: () => void; children?: React.ReactNode;
  }) {
    return (
      <div className="relative pl-10 py-3 group">
        {/* The timeline line connecting boxes */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200 -z-10 group-last:bottom-auto group-last:h-full"></div>
        {/* The icon circle */}
        <div className={`absolute left-0 top-[18px] w-8 h-8 rounded-full flex items-center justify-center border-4 border-white transition-all shadow-sm ${
          isAdded ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 cursor-pointer"
        }`} onClick={!isAdded ? onNavigate : undefined}>
          <Icon size={14} strokeWidth={isAdded ? 3 : 2} />
        </div>
        
        {/* Main Content Box */}
        <div className={`rounded-2xl transition-all duration-300 ${
            isAdded ? "bg-white border border-slate-200 shadow-sm p-4 animate-in slide-in-from-right-4" 
                    : "border-2 border-dashed border-slate-200 bg-slate-50/50 p-3 hover:bg-blue-50 hover:border-blue-200 cursor-pointer text-slate-500 hover:text-blue-600"
          }`}
          onClick={!isAdded ? onNavigate : undefined}
        >
          {isAdded ? (
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">{time}</span>
                {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-all"><X size={15} /></button>}
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-2">{title}</h4>
              {children}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{time}</span>
                <span className="text-sm font-bold">+ {title} tanlash</span>
              </div>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform opacity-50" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Contextual Weather Advice Heuristic
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

  return (
    <DashboardShell title="Safar Yig'uvchi" subtitle="AI ob-havo va Timeline yordamida safaringizni chizing">
      {/* Scrollable Tab Bar */}
      <div className="flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm mb-6 gap-1 overflow-x-auto hide-scrollbar w-full max-w-full">
        {TABS.map(tab => {
          const isDisabled = tab.id !== "basics" && tab.id !== "ai" && !destination;
          const isAI = tab.id === "ai";
          return (
            <button key={tab.id} onClick={() => !isDisabled && setActiveTab(tab.id)} disabled={isDisabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                activeTab === tab.id
                  ? isAI ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : isDisabled
                  ? "text-slate-300 cursor-not-allowed"
                  : isAI ? "text-violet-600 hover:bg-violet-50 bg-violet-50/30" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}>
              <tab.icon size={16} className={isAI && activeTab !== tab.id ? "text-violet-500" : ""} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start w-full max-w-full">
        {/* Main Content Area */}
        <div className="flex-1 w-full min-w-0 max-w-full">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-8 min-h-[400px] transition-all relative overflow-hidden w-full">
            
            {/* Weather & Context Banner (Visible when destination exists) */}
            {destination && activeTab !== "ai" && weather && (
              <div className="mb-8 p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl flex gap-4 items-start animate-in slide-in-from-top-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-sky-100 flex items-center justify-center shrink-0">
                  <weather.icon size={24} className="text-sky-500" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm mb-1">{destination} hududidagi prognoz (<span className="text-blue-600">{weather.temp}</span>)</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{weather.tip}</p>
                </div>
              </div>
            )}

            {/* AI MAGIC TAB */}
            {activeTab === "ai" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600"><Sparkles size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Safar yig'ishga erinasizmi?</h2>
                    <p className="text-sm font-medium text-slate-500">Istaganingizni yozing, AI o'zi yig'ib beradi.</p>
                  </div>
                </div>
                
                <form onSubmit={handleAIGenerate} className="relative mb-6">
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Masalan: Men oilam (4 kishi) bilan Zominga 3 kunlik arzonroq safar qilmoqchiman."
                    className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-5 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all resize-none"
                  ></textarea>
                  <button type="submit" disabled={aiLoading || !aiPrompt.trim()}
                    className="absolute bottom-4 right-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black px-6 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 text-sm">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Tuzish 🪄
                  </button>
                </form>

                {aiMessage && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold flex items-start gap-3 animate-in zoom-in-95">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />{aiMessage}
                  </div>
                )}
              </div>
            )}

            {/* BASICS TAB */}
            {activeTab === "basics" && (
              <div className="animate-in fade-in duration-300">
                <h2 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2"><MapPin size={18} className="text-slate-400" /> Manzilingizni tanlang</h2>
                {loadingDest ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8"><div className="h-20 bg-slate-100 rounded-2xl animate-pulse col-span-2"></div></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 w-full">
                    {destinations.map(d => (
                      <button key={d.id} onClick={() => setDestination(d.title)}
                        className={`p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 duration-300 w-full ${
                          destination === d.title ? "border-blue-600 bg-blue-50/50 shadow-sm ring-4 ring-blue-600/10 scale-105" : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-1"
                        }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${destination === d.title ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}><MapPin size={18} /></div>
                        <span className={`font-bold text-xs sm:text-sm text-center truncate w-full ${destination === d.title ? "text-blue-900" : "text-slate-700"}`}>{d.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                <h2 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2"><Calendar size={18} className="text-slate-400" /> Sana va kishilar soni</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Boshlanish", type: "date", min: tomorrow, value: startDate, set: setStartDate },
                    { label: "Tugash",     type: "date", min: startDate || tomorrow, value: endDate, set: setEndDate },
                  ].map(f => (
                    <div key={f.label} className="bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-2xl p-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">{f.label}</label>
                      <input type={f.type} min={f.min} value={f.value} onChange={e => f.set(e.target.value)}
                        className="w-full bg-transparent font-bold text-slate-900 outline-none text-sm cursor-pointer" />
                    </div>
                  ))}
                  <div className="bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-2xl p-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1"><Users size={10} /> Kishilar</label>
                    <input type="number" min={1} value={pax} onChange={e => setPax(Number(e.target.value))}
                      className="w-full bg-transparent font-black text-slate-900 text-xl outline-none" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => {
                    if (!destination || !startDate || !endDate) return toast.error("Manzil va sanani to'ldiring!"); 
                    setActiveTab("hotel"); 
                  }}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 text-sm">
                    Katalogni ko'rish <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* CATALOG TABS */}
            {(activeTab === "hotel" || activeTab === "transport" || activeTab === "guide") && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black text-slate-900">{activeTab === "hotel" ? "Mehmonxonalar" : activeTab === "transport" ? "Transport" : "Gid xizmati"}</h2>
                  <span className="bg-slate-100 text-slate-600 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{destination}</span>
                </div>
                <CatalogSection tabId={activeTab as "hotel" | "transport" | "guide"} />
              </div>
            )}
          </div>
        </div>

        {/* Right: User's Trip Timeline ("Sayohat Hikoyasi") */}
        <div className="w-full xl:w-[350px] shrink-0 xl:sticky xl:top-24 max-w-full">
          <div className={`bg-white rounded-[2rem] border shadow-sm transition-all duration-300 w-full ${cartBash ? "scale-[1.02] border-indigo-400 shadow-indigo-500/20" : "border-slate-100 scale-100"}`}>
            
            {/* Timeline Header */}
            <div className={`px-6 py-5 rounded-t-[2rem] transition-colors ${aiMessage ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" : "bg-slate-900 text-white"}`}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3">
                  {aiMessage ? <Sparkles size={18} className="text-violet-200 animate-pulse" /> : <MapPin size={18} className="text-blue-400" />}
                  <h3 className="font-black text-sm tracking-wide">Sayohat Hikoyasi</h3>
                </div>
              </div>
              <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${aiMessage ? "text-violet-200" : "text-slate-400"}`}>
                {destination || "Manzil Yo'q"} • {days} kun • {pax} kishi
              </p>
            </div>

            {/* Timeline Flow */}
            <div className="p-5 pb-0">
              
              <TimelineNode icon={Car} title="Transport" time="1-KUN, 08:00" isAdded={!!selectedTaxi} onNavigate={() => setActiveTab("transport")} onRemove={() => setSelectedTaxi(null)}>
                {selectedTaxi && (
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-600">{selectedTaxi.title}</span>
                    <span className="font-black text-slate-900 text-sm">{selectedTaxi.price?.toLocaleString()}</span>
                  </div>
                )}
              </TimelineNode>

              <TimelineNode icon={Home} title="Mehmonxona" time="1-KUN, 14:00" isAdded={!!selectedHotel} onNavigate={() => setActiveTab("hotel")} onRemove={() => setSelectedHotel(null)}>
                {selectedHotel && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-600 leading-tight pr-2">{selectedHotel.title}</span>
                      <span className="font-black text-slate-900 text-sm shrink-0">{selectedHotel.nightlyPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pl-1">
                      <span className="text-[10px] text-slate-400 uppercase font-black">{days} tun / xona soni:</span>
                      <input type="number" min={1} value={roomCount} onChange={e => setRoomCount(Number(e.target.value))} className="w-12 h-6 bg-slate-100 border border-slate-200 rounded text-center text-xs font-bold outline-none" />
                    </div>
                  </div>
                )}
              </TimelineNode>

              <TimelineNode icon={UserCircle} title="Gid" time="2-KUN, 10:00" isAdded={!!selectedGuide} onNavigate={() => setActiveTab("guide")} onRemove={() => setSelectedGuide(null)}>
                {selectedGuide && (
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-600 leading-tight pr-2">{selectedGuide.title} ({selectedGuide.language})</span>
                    <span className="font-black text-slate-900 text-sm shrink-0">{selectedGuide.pricePerDay?.toLocaleString()}</span>
                  </div>
                )}
              </TimelineNode>

            </div>

            {/* Total + Checkout */}
            <div className="px-5 pb-5 pt-6 relative">
              <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
              <div className="flex justify-between items-end mb-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Jami byudjet</span>
                <div className="text-right leading-none">
                  <span className="block text-2xl font-black text-blue-600 tracking-tight">{grandTotal.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative top-[-2px]">so'm</span>
                </div>
              </div>
              <button onClick={checkout} disabled={submitting || !destination || (!selectedHotel && !selectedTaxi && !selectedGuide)}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 text-sm group">
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                {submitting ? "Saqlanmoqda..." : "Safarni Rejalashtirish"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
