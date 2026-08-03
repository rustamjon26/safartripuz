"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  MapPin, Home, Car, UserCircle,
  CheckCircle2, Info, Loader2, ArrowRight,
  Check, X, Calendar, Users, Sparkles, Sun, CloudRain, Wind,
  ChevronRight, Building2, Compass, Landmark, Trees, Mountain, Building, Tent,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";
import {
  TRIP_BUILDER_TAB_EVENT,
  dispatchTripBuilderTab,
  type TripBuilderDrawerTab,
  type TripBuilderTabEventDetail,
} from "@/lib/tripBuilderEvents";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ServiceCard, { ServiceCardSkeleton } from "@/components/ui/ServiceCard";
import {
  formatPrice,
  formatPricePerUnit,
  formatUzInteger,
  languageLabel,
  taxiServiceTypeLabel,
} from "@/lib/displayHelpers";
import {
  coverageHint,
  fetchTripAiPlan,
  type TripAiPlan,
} from "./tripAiClient";

type Destination = { id: string; title: string };

type InventoryItem = {
  id: string;
  title: string;
  images?: string[];
  rating?: number;
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
  maxGuests?: number;
  rooms?: number;
  amenities?: string[];
};

type InventoryData = {
  hotels: InventoryItem[];
  homestays: InventoryItem[];
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
type DrawerTab = TripBuilderDrawerTab;

const DRAWER_TITLES: Record<DrawerTab, string> = {
  hotel: "Mehmonxonalar",
  homestay: "HomeStay",
  guide: "Gidlar",
  transport: "Transport",
};

const DEST_VISUAL: Record<string, { icon: React.ElementType; gradient: string }> = {
  samarqand: { icon: Landmark, gradient: "from-amber-700/90 via-amber-900/40 to-gray-900" },
  buxoro:    { icon: Landmark, gradient: "from-orange-800/90 via-amber-900/40 to-gray-900" },
  xiva:      { icon: Landmark, gradient: "from-teal-800/90 via-slate-900/40 to-gray-900" },
  zomin:     { icon: Trees,    gradient: "from-emerald-800/90 via-green-900/40 to-gray-900" },
  toshkent:  { icon: Building, gradient: "from-blue-800/90 via-indigo-900/40 to-gray-900" },
  jizzax:    { icon: Mountain, gradient: "from-slate-600/90 via-gray-800/40 to-gray-900" },
};

const AI_EXAMPLES = ["Samarqandga 2 kun", "Zominda tur", "Buxoroga oilaviy", "Xivaga 3 kun"];

const AI_WELCOME =
  "Salom! Qayerga sayohat qilmoqchisiz? Samarqand, Buxoro, Xiva yoki boshqa manzil — kunlar sonini ham yozing.";

type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: TripAiPlan | null;
};

function newChatId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function destKey(title: string) {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDestVisual(title: string) {
  const key = destKey(title);
  for (const [k, v] of Object.entries(DEST_VISUAL)) {
    if (key.includes(k)) return v;
  }
  return { icon: MapPin, gradient: "from-slate-700/90 to-gray-900" };
}

function pickDrawerItems(data: InventoryData, tab: DrawerTab): InventoryItem[] {
  if (tab === "hotel") return data.hotels ?? [];
  if (tab === "homestay") return data.homestays ?? [];
  if (tab === "guide") return data.guides ?? [];
  return data.taxis ?? [];
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

  const [selectedHotel, setSelectedHotel]       = useState<InventoryItem | null>(null);
  const [selectedHomestay, setSelectedHomestay] = useState<InventoryItem | null>(null);
  const [selectedTaxi, setSelectedTaxi]         = useState<InventoryItem | null>(null);
  const [selectedGuide, setSelectedGuide]   = useState<InventoryItem | null>(null);

  const [inventory, setInventory]   = useState<InventoryData | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChat, setAiChat] = useState<AiChatMessage[]>([
    { id: "welcome", role: "assistant", text: AI_WELCOME },
  ]);
  const [aiSuggestedTotal, setAiSuggestedTotal] = useState<number | null>(null);
  const [tripAiPlan, setTripAiPlan] = useState<TripAiPlan | null>(null);
  const [tripAiLoading, setTripAiLoading] = useState(false);
  const [tripAiError, setTripAiError] = useState("");
  const [priceEditOpen, setPriceEditOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [aiChat, aiLoading, tripAiLoading]);

  const [cartBash, setCartBash] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("hotel");
  const [drawerInventory, setDrawerInventory] = useState<InventoryData | null>(null);
  const [drawerItems, setDrawerItems] = useState<InventoryItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

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
    function handleTabEvent(e: Event) {
      const detail = (e as CustomEvent<TripBuilderTabEventDetail>).detail;
      if (!detail?.open || !detail.tab) return;
      setDrawerTab(detail.tab);
      setDrawerOpen(true);
    }
    window.addEventListener(TRIP_BUILDER_TAB_EVENT, handleTabEvent);
    return () => window.removeEventListener(TRIP_BUILDER_TAB_EVENT, handleTabEvent);
  }, []);

  useEffect(() => {
    if (!destination) {
      setInventory(null);
      setSelectedHotel(null);
      setSelectedHomestay(null);
      setSelectedTaxi(null);
      setSelectedGuide(null);
      setTripAiPlan(null);
      setTripAiError("");
      return;
    }
    async function fetchInventory() {
      setLoadingInv(true);
      try {
        const res = await fetch(`/api/builder/inventory?dest=${encodeURIComponent(destination)}`);
        if (!res.ok) throw new Error("inventory fetch failed");
        setInventory(await res.json());
      } catch {
        toast.error("Xizmatlarni yuklashda xato");
        setInventory(null);
      } finally { setLoadingInv(false); }
    }
    void fetchInventory();
  }, [destination]);

  useEffect(() => {
    if (!drawerOpen) {
      setDrawerInventory(null);
      setDrawerItems([]);
      setDrawerLoading(false);
      return;
    }
    let cancelled = false;
    async function fetchDrawerInventory() {
      setDrawerLoading(true);
      try {
        const res = await fetch(`/api/builder/inventory?dest=${encodeURIComponent(destination || "")}`);
        if (!res.ok) throw new Error("drawer inventory fetch failed");
        const data: InventoryData = await res.json();
        if (!cancelled) setDrawerInventory(data);
      } catch {
        if (!cancelled) {
          toast.error("Xizmatlarni yuklashda xato");
          setDrawerInventory(null);
          setDrawerItems([]);
        }
      } finally {
        if (!cancelled) setDrawerLoading(false);
      }
    }
    void fetchDrawerInventory();
    return () => { cancelled = true; };
  }, [drawerOpen, destination]);

  useEffect(() => {
    if (!drawerInventory) return;
    setDrawerItems(pickDrawerItems(drawerInventory, drawerTab));
  }, [drawerInventory, drawerTab]);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const days = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  }, [startDate, endDate]);

  const hotelTotal = selectedHotel?.nightlyPrice ? selectedHotel.nightlyPrice * days * roomCount : 0;
  const homestayTotal = selectedHomestay?.nightlyPrice ? selectedHomestay.nightlyPrice * days : 0;
  const taxiTotal  = selectedTaxi?.price ?? 0;
  const guideTotal = selectedGuide?.pricePerDay ? selectedGuide.pricePerDay * days : 0;
  const grandTotal = hotelTotal + homestayTotal + taxiTotal + guideTotal;

  const triggerCartBounce = () => {
    setCartBash(true);
    setTimeout(() => setCartBash(false), 300);
  };

  async function loadTripAiPlan(opts?: {
    region?: string;
    startDate?: string;
    endDate?: string;
    pax?: number;
    switchToAiTab?: boolean;
    /** Skip toasts — chat UI shows status instead. */
    quiet?: boolean;
  }): Promise<TripAiPlan | null> {
    const region = opts?.region ?? destination;
    const sd = opts?.startDate ?? startDate;
    const ed = opts?.endDate ?? endDate;
    const people = opts?.pax ?? pax;
    if (!region || !sd || !ed) {
      if (!opts?.quiet) toast.error("Manzil va sanani to'ldiring!");
      return null;
    }

    setTripAiLoading(true);
    setTripAiError("");
    try {
      const result = await fetchTripAiPlan({
        region,
        startDate: sd,
        endDate: ed,
        pax: people,
        lang: "uz",
      });
      if (!result.ok) {
        if (result.status === 401) {
          const back =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/trip-builder";
          router.push(loginWithNext(back || "/trip-builder"));
          return null;
        }
        setTripAiPlan(null);
        const msg = result.message || "Kunlik reja yaratilmadi";
        setTripAiError(msg);
        if (!opts?.quiet) toast.error(msg);
        return null;
      }
      setTripAiPlan(result.plan);
      if (opts?.switchToAiTab) setActiveTab("ai");
      if (!opts?.quiet) {
        toast.success("Joylar kunlik rejasi tayyor");
        triggerCartBounce();
      }
      return result.plan;
    } catch (e) {
      setTripAiPlan(null);
      const msg = e instanceof Error ? e.message : "TripAI xatosi";
      setTripAiError(msg);
      if (!opts?.quiet) toast.error(msg);
      return null;
    } finally {
      setTripAiLoading(false);
    }
  }

  function pushAiChat(msg: Omit<AiChatMessage, "id">): void {
    setAiChat((prev) => [...prev, { ...msg, id: newChatId() }]);
  }

  async function sendAiMessage(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text || aiLoading) return;

    pushAiChat({ role: "user", text });
    setAiPrompt("");
    setAiLoading(true);
    setTripAiError("");

    try {
      const res = await fetch("/api/builder/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        needsClarification?: boolean;
        message?: string;
        data?: {
          destination: string;
          startDate: string;
          endDate: string;
          pax: number;
          hotel?: InventoryItem | null;
          taxi?: InventoryItem | null;
          guide?: InventoryItem | null;
          aiMessage?: string;
          message?: string;
        };
      };

      if (res.status === 401) {
        pushAiChat({
          role: "assistant",
          text: "Davom etish uchun tizimga kiring — keyin suhbatni davom ettiramiz.",
        });
        const back =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/trip-builder";
        router.push(loginWithNext(back || "/trip-builder"));
        return;
      }

      if (json.needsClarification && json.message) {
        pushAiChat({ role: "assistant", text: json.message });
        return;
      }

      if (!res.ok || !json.success || !json.data) {
        pushAiChat({
          role: "assistant",
          text: json.message || "Kechirasiz, hozir javob bera olmadim. Qayta yozib ko‘ring.",
        });
        return;
      }

      const { data } = json;
      setDestination(data.destination);
      setStartDate(data.startDate);
      setEndDate(data.endDate);
      setPax(data.pax);
      if (data.hotel) {
        setSelectedHotel({
          ...data.hotel,
          roomTypeId: data.hotel.roomTypeId,
          nightlyPrice: data.hotel.nightlyPrice,
        });
      }
      if (data.taxi) setSelectedTaxi({ ...data.taxi, price: data.taxi.price });
      if (data.guide) {
        setSelectedGuide({
          ...data.guide,
          pricePerDay: data.guide.pricePerDay,
          pricePerHour: data.guide.pricePerHour,
        });
      }

      const tripDays = Math.max(
        1,
        Math.ceil(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000,
        ),
      );
      const h = data.hotel?.nightlyPrice ? data.hotel.nightlyPrice * tripDays : 0;
      const t = data.taxi?.price ?? 0;
      const g = data.guide?.pricePerDay ? data.guide.pricePerDay * tripDays : 0;
      setAiSuggestedTotal(h + t + g);
      triggerCartBounce();

      const summary =
        (typeof data.aiMessage === "string" && data.aiMessage.trim()) ||
        (typeof data.message === "string" && data.message.trim()) ||
        `${data.destination} uchun reja tayyorlandi: ${data.startDate} → ${data.endDate}, ${data.pax} kishi.`;

      pushAiChat({ role: "assistant", text: summary });

      const plan = await loadTripAiPlan({
        region: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        pax: data.pax,
        quiet: true,
      });

      if (plan) {
        pushAiChat({
          role: "assistant",
          text: `${plan.regionDisplay} bo‘yicha kunlik marshrut tayyor. Kunlarni pastdan ko‘ring yoki Manzil / Mehmonxona bosqichiga o‘ting.`,
          plan,
        });
      }
      // Plan failure stays in the chat thread via tripAiError + retry.
    } catch {
      pushAiChat({
        role: "assistant",
        text: "Aloqa xatosi. Internetni tekshirib, qayta yozing.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleAIGenerate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    await sendAiMessage(aiPrompt);
  }

  const aiAssisted = aiChat.some((m) => m.role === "user") || Boolean(tripAiPlan);

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
          homestay: selectedHomestay
            ? { id: selectedHomestay.id, title: selectedHomestay.title }
            : undefined,
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

  function drawerItemToCardProps(item: InventoryItem, tab: DrawerTab) {
    if (tab === "hotel") {
      return {
        title: item.title,
        image: item.images?.[0],
        placeholderIcon: Building2,
        city: item.city,
        subtitle: item.roomTypeName,
        price: item.nightlyPrice,
        priceUnit: "so'm/kecha",
        starCount: item.rating ?? 4,
      };
    }
    if (tab === "homestay") {
      return {
        title: item.title,
        image: item.images?.[0],
        placeholderIcon: Tent,
        placeholderGradient: "from-emerald-100 via-teal-50 to-slate-100",
        city: item.city,
        subtitle: item.rooms ? `${item.rooms} xona · HomeStay` : "HomeStay",
        price: item.nightlyPrice,
        priceUnit: "so'm/kecha",
        rating: item.avgRating,
        ratingCount: item.reviewCount,
      };
    }
    if (tab === "guide") {
      return {
        title: item.title,
        image: item.images?.[0],
        placeholderIcon: Compass,
        placeholderGradient: "from-violet-100 via-indigo-50 to-slate-100",
        city: item.region || item.city,
        subtitle: item.language ? languageLabel(item.language) : undefined,
        price: item.pricePerDay,
        priceUnit: "so'm/kun",
        rating: item.avgRating,
      };
    }
    return {
      title: item.title,
      placeholderIcon: Car,
      placeholderGradient: "from-orange-100 via-amber-50 to-slate-100",
      subtitle: item.type ? taxiServiceTypeLabel(item.type) : undefined,
      price: item.price,
      priceUnit: "so'm",
    };
  }

  function DrawerCatalogSkeleton() {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((k) => (
          <ServiceCardSkeleton key={k} />
        ))}
      </div>
    );
  }

  function catalogTabToDrawerTab(tabId: "hotel" | "transport" | "guide"): DrawerTab {
    if (tabId === "hotel") return "hotel";
    if (tabId === "guide") return "guide";
    return "transport";
  }

  function CatalogSkeleton() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <ServiceCardSkeleton key={k} />
        ))}
      </div>
    );
  }

  function CatalogSection({
    tabId,
    onItemSelected,
  }: {
    tabId: "hotel" | "transport" | "guide";
    onItemSelected?: () => void;
  }) {
    const items = tabId === "hotel" ? inventory?.hotels : tabId === "transport" ? inventory?.taxis : inventory?.guides;
    const selectedItem = tabId === "hotel" ? selectedHotel : tabId === "transport" ? selectedTaxi : selectedGuide;
    const setSelected = tabId === "hotel" ? setSelectedHotel : tabId === "transport" ? setSelectedTaxi : setSelectedGuide;
    const label = tabId === "hotel" ? "mehmonxona" : tabId === "transport" ? "transport" : "gid";

    const handleSelect = (item: InventoryItem) => {
      const isDeselecting = selectedItem?.id === item.id;
      setSelected(isDeselecting ? null : item);
      if (aiSuggestedTotal != null) setAiSuggestedTotal(null);
      if (!isDeselecting) onItemSelected?.();
    };

    if (loadingInv) {
      return <CatalogSkeleton />;
    }
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-3xl py-16 bg-white/50">
          <Info className="w-10 h-10 text-gray-400 mb-3" />
          <h3 className="font-black text-gray-900">Tizimda takliflar yo&apos;q</h3>
          <p className="text-gray-500 text-sm text-center mt-1 max-w-xs">{destination} hududida hozircha &quot;{label}&quot; mavjud emas.</p>
        </div>
      );
    }

    const drawerTab = catalogTabToDrawerTab(tabId);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const cardProps = drawerItemToCardProps(item, drawerTab);
          return (
            <ServiceCard
              key={item.id}
              {...cardProps}
              isSelected={isSelected}
              onClick={() => {
                handleSelect(item);
                triggerCartBounce();
              }}
            />
          );
        })}
      </div>
    );
  }

  function renderDrawerCatalog() {
    const selectedItem =
      drawerTab === "hotel"
        ? selectedHotel
        : drawerTab === "homestay"
          ? selectedHomestay
          : drawerTab === "guide"
            ? selectedGuide
            : selectedTaxi;
    const setSelected =
      drawerTab === "hotel"
        ? setSelectedHotel
        : drawerTab === "homestay"
          ? setSelectedHomestay
          : drawerTab === "guide"
            ? setSelectedGuide
            : setSelectedTaxi;
    const label =
      drawerTab === "hotel"
        ? "mehmonxona"
        : drawerTab === "homestay"
          ? "homestay"
          : drawerTab === "guide"
            ? "gid"
            : "transport";

    const handleSelect = (item: InventoryItem) => {
      const isDeselecting = selectedItem?.id === item.id;
      setSelected(isDeselecting ? null : item);
      if (aiSuggestedTotal != null) setAiSuggestedTotal(null);
      if (!isDeselecting) setDrawerOpen(false);
    };

    if (drawerLoading) return <DrawerCatalogSkeleton />;

    if (drawerItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-3xl py-16 bg-white/50">
          <Info className="w-10 h-10 text-gray-400 mb-3" />
          <h3 className="font-black text-gray-900">Tizimda takliflar yo&apos;q</h3>
          <p className="text-gray-500 text-sm text-center mt-1 max-w-xs">
            {destination
              ? `${destination} hududida hozircha "${label}" mavjud emas.`
              : `Hozircha "${label}" takliflari mavjud emas.`}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {drawerItems.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const cardProps = drawerItemToCardProps(item, drawerTab);
          return (
            <ServiceCard
              key={item.id}
              {...cardProps}
              isSelected={isSelected}
              onClick={() => {
                handleSelect(item);
                triggerCartBounce();
              }}
            />
          );
        })}
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
  const hasServices = !!(selectedHotel || selectedHomestay || selectedTaxi || selectedGuide);
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

      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="Yopish"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl sm:rounded-none sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:max-h-none w-full sm:w-[480px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-black text-gray-900">{DRAWER_TITLES[drawerTab]}</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Yopish"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {destination && (
                <div className="mb-4">
                  <span className="bg-gray-100 text-gray-600 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                    {destination}
                  </span>
                </div>
              )}
              {renderDrawerCatalog()}
            </div>
          </div>
        </div>
      )}

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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-4 sm:p-6 flex flex-col min-h-[520px] max-h-[min(780px,75vh)]">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Sparkles size={20} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">AI Sayohat Yordamchisi</h2>
                <p className="text-sm text-gray-500">Yozing — javob shu yerda chiqadi</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 min-h-0">
              {aiChat.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-br-md"
                        : "bg-white border border-violet-100 text-gray-800 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.plan && msg.plan.days.length > 0 ? (
                      <div className="mt-3 space-y-3 border-t border-violet-100 pt-3">
                        {msg.plan.narration ? (
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {msg.plan.narration}
                          </p>
                        ) : null}
                        {(() => {
                          const plan = msg.plan;
                          if (!plan) return null;
                          const hint = coverageHint(plan.meta.dataCoverage);
                          return hint ? (
                            <p className="text-xs text-amber-700 font-semibold">{hint}</p>
                          ) : null;
                        })()}
                        {msg.plan.days.map((day) => (
                          <div
                            key={`${msg.id}-${day.day}`}
                            className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"
                          >
                            <h4 className="font-black text-xs text-gray-900 mb-2">
                              {day.title || `${day.day}-kun`}
                              <span className="ml-2 text-gray-400 font-bold">
                                {day.date}
                              </span>
                            </h4>
                            <ul className="space-y-1.5">
                              {day.slots.map((slot, idx) => (
                                <li
                                  key={`${msg.id}-${day.day}-${idx}-${slot.startTime}`}
                                  className="flex gap-2 text-xs items-start"
                                >
                                  <span className="text-violet-600 font-mono shrink-0 pt-0.5">
                                    {slot.startTime}–{slot.endTime}
                                  </span>
                                  <span
                                    className={
                                      slot.status === "NO_DATA"
                                        ? "text-gray-400 italic"
                                        : "text-gray-900 font-semibold"
                                    }
                                  >
                                    {slot.status === "NO_DATA"
                                      ? "Ma'lumot yo'q"
                                      : slot.siteName ?? "Joy"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {(aiLoading || tripAiLoading) && (
                <div className="flex justify-start">
                  <div className="bg-white border border-violet-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-violet-700 font-bold flex items-center gap-2 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {aiLoading ? "Yozmoqda..." : "Kunlik reja tuzilmoqda..."}
                  </div>
                </div>
              )}

              {tripAiError && !tripAiLoading && !aiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <p className="font-bold">{tripAiError}</p>
                    <button
                      type="button"
                      disabled={!destination || !startDate || !endDate}
                      onClick={() => void loadTripAiPlan({ quiet: false })}
                      className="text-xs font-black uppercase tracking-widest text-violet-700 hover:text-violet-900 disabled:opacity-40"
                    >
                      Qayta urinish
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                {AI_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    disabled={aiLoading}
                    onClick={() => void sendAiMessage(ex)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-violet-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all disabled:opacity-40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <form onSubmit={handleAIGenerate} className="relative">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendAiMessage(aiPrompt);
                    }
                  }}
                  placeholder="Masalan: Samarqandga 2 kun oilaviy..."
                  rows={2}
                  disabled={aiLoading}
                  className="w-full bg-white border-2 border-violet-100 rounded-2xl p-4 pr-28 text-gray-900 placeholder:text-gray-400 resize-none outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="absolute bottom-3 right-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition-all shadow-lg shadow-violet-500/25"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Yuborish
                </button>
              </form>
            </div>
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
                  const DestIcon = vis.icon;
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
                        <DestIcon size={28} className="text-white mb-1" />
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
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                disabled={tripAiLoading || !destination || !startDate || !endDate}
                onClick={() =>
                  void loadTripAiPlan({ switchToAiTab: true })
                }
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-violet-500/20 text-sm"
              >
                {tripAiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Joylar kunlik rejasini yaratish
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!destination || !startDate || !endDate) return toast.error("Manzil va sanani to'ldiring!");
                  setActiveTab("hotel");
                }}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-2xl shadow-lg text-sm"
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
            aiAssisted
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              : "bg-gray-900 text-white"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {aiAssisted ? (
              <Sparkles size={16} className="text-violet-200 animate-pulse" />
            ) : (
              <MapPin size={16} className="text-amber-400" />
            )}
            <h3 className="font-black text-sm">Sayohat Rejasi</h3>
          </div>
          <p className={`text-xs uppercase tracking-widest font-bold ${aiAssisted ? "text-violet-200" : "text-gray-400"}`}>
            {destination || "Manzil tanlanmagan"} • {days} kun • {pax} kishi
          </p>
        </div>

        {tripAiPlan && tripAiPlan.days.length > 0 && (
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest font-black text-violet-600 mb-2">
              Joylar rejasi
            </p>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {tripAiPlan.days.map((day) => {
                const placed = day.slots.filter((s) => s.status === "PLACED");
                return (
                  <div key={day.day}>
                    <p className="text-xs font-black text-gray-900 mb-1">
                      {day.day}-kun
                    </p>
                    {placed.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Joylar yo&apos;q</p>
                    ) : (
                      placed.slice(0, 4).map((slot, i) => (
                        <p
                          key={`${day.day}-s-${i}`}
                          className="text-[11px] text-gray-500 truncate"
                        >
                          <span className="text-violet-500 font-mono">
                            {slot.startTime}
                          </span>{" "}
                          {slot.siteName}
                        </p>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className="text-[11px] font-bold text-violet-600 mt-2 hover:text-violet-800"
            >
              Batafsil →
            </button>
          </div>
        )}

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
            icon={Tent}
            title="HomeStay"
            time="1-KUN, 15:00"
            isAdded={!!selectedHomestay}
            onNavigate={() => dispatchTripBuilderTab("homestay")}
            onRemove={() => setSelectedHomestay(null)}
          >
            {selectedHomestay && (
              <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 leading-tight pr-2">{selectedHomestay.title}</span>
                <span className="font-black text-gray-900 text-sm shrink-0">
                  {selectedHomestay.nightlyPrice != null
                    ? formatPricePerUnit(selectedHomestay.nightlyPrice, "kecha")
                    : "—"}
                </span>
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
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-500" />
                    {formatUzInteger(selectedHotel.nightlyPrice)} × {days} kun × {roomCount} xona
                  </span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(hotelTotal)}</span>
                </div>
              )}
              {selectedHomestay?.nightlyPrice != null && (
                <div className="flex justify-between text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Tent size={14} className="text-slate-500" />
                    {formatUzInteger(selectedHomestay.nightlyPrice)} × {days} kun
                  </span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(homestayTotal)}</span>
                </div>
              )}
              {selectedTaxi && (
                <div className="flex justify-between text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Car size={14} className="text-slate-500" />
                    Transport
                  </span>
                  <span className="text-gray-900 font-bold">{formatUzInteger(taxiTotal)}</span>
                </div>
              )}
              {selectedGuide?.pricePerDay != null && (
                <div className="flex justify-between text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Compass size={14} className="text-slate-500" />
                    {formatUzInteger(selectedGuide.pricePerDay)} × {days} kun
                  </span>
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
              {hotelTotal > 0 && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Building2 size={12} /> {formatUzInteger(hotelTotal)}</span>}
              {homestayTotal > 0 && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Tent size={12} /> {formatUzInteger(homestayTotal)}</span>}
              {taxiTotal > 0 && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Car size={12} /> {formatUzInteger(taxiTotal)}</span>}
              {guideTotal > 0 && <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Compass size={12} /> {formatUzInteger(guideTotal)}</span>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void checkout()}
            disabled={submitting || !destination || (!selectedHotel && !selectedHomestay && !selectedTaxi && !selectedGuide)}
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
