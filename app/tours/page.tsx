"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Palmtree, MapPin, CalendarDays, CheckCircle2, ChevronRight, MoonStar, Tag } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type TourPackage = {
  id: string;
  title: string;
  description: string;
  destination: string;
  category: string;
  days: number;
  nights: number;
  price: number;
  imageUrl: string | null;
  highlights: string[];
};

export default function ToursPage() {
  const router = useRouter();
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [selectedTour, setSelectedTour] = useState<TourPackage | null>(null);
  const [startDate, setStartDate] = useState("");
  const [pax, setPax] = useState(1);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    async function fetchTours() {
      try {
        const res = await fetch("/api/tours");
        if (!res.ok) throw new Error("Yuklashda xatolik");
        const data = await res.json();
        setTours(data);
      } catch (err) {
        toast.error("Turlarni yuklashda muammo yuzaga keldi");
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
  }, []);

  const categories = ["Barchasi", ...Array.from(new Set(tours.map(t => t.category)))];
  const filteredTours = activeCategory === "Barchasi" ? tours : tours.filter(t => t.category === activeCategory);

  async function confirmBuy() {
    if (!selectedTour) return;
    if (!startDate) {
      toast.error("Iltimos, boshlanish sanasini tanlang");
      return;
    }
    
    setIsBuying(true);
    try {
      const res = await fetch(`/api/tours/${selectedTour.id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          pax
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Xatolik yuz berdi");
      }
      
      toast.success("Sayohat paketi muvaffaqiyatli band qilindi! 🎉");
      router.push(`/payments/checkout/${data.planId}`);
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
      setIsBuying(false);
    }
  }

  function getCategoryColor(category: string) {
    if (category.toLowerCase().includes("ekstrim")) return "bg-red-50 text-red-600 border-red-200";
    if (category.toLowerCase().includes("oila")) return "bg-green-50 text-green-600 border-green-200";
    if (category.toLowerCase().includes("tarix")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (category.toLowerCase().includes("ziyorat")) return "bg-teal-50 text-teal-700 border-teal-200";
    return "bg-blue-50 text-blue-600 border-blue-200";
  }

  return (
    <DashboardShell title="Tayyor Sayohatlar" subtitle="Mutaxassislarimiz tomonidan yig'ilgan eksklyuziv turlar">
      
      {/* Filters */}
      {!loading && tours.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-8 pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${
                activeCategory === cat
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20 flex-col gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-slate-500 font-bold">Katalog yuklanmoqda...</p>
        </div>
      ) : filteredTours.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-white rounded-3xl p-16">
          <Palmtree className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-black text-slate-800">Hozircha turlar mavjud emas</h3>
          <p className="text-slate-500 max-w-sm text-center mt-2">Tez orada operatorlarimiz yangi ajoyib turlarni shu yerga joylashadi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTours.map((tour) => (
            <div key={tour.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col">
              
              {/* Image Header */}
              <div className="relative h-56 overflow-hidden">
                {tour.imageUrl ? (
                  <img src={tour.imageUrl} alt={tour.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Palmtree className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/90 z-10" />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider backdrop-blur-md bg-white border ${getCategoryColor(tour.category)}`}>
                    {tour.category}
                  </span>
                </div>

                {/* Info over image */}
                <div className="absolute bottom-4 left-4 right-4 z-20 text-white">
                  <div className="flex items-center gap-1.5 text-slate-200 text-xs font-bold uppercase tracking-widest mb-1.5">
                    <MapPin size={12} /> {tour.destination}
                  </div>
                  <h3 className="font-black text-xl leading-tight text-white shadow-sm drop-shadow-md">{tour.title}</h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1">
                
                {/* Days / Nights Stats */}
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><CalendarDays size={14} /></div>
                    <div>
                      <span className="block text-xs font-black text-slate-400 uppercase tracking-widest">Kun</span>
                      <span className="block text-sm font-bold text-slate-900">{tour.days} Kun</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100 mx-2"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center"><MoonStar size={14} /></div>
                    <div>
                      <span className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tun</span>
                      <span className="block text-sm font-bold text-slate-900">{tour.nights} Tun</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-500 leading-relaxed mb-5 line-clamp-3 flex-1">
                  {tour.description}
                </p>

                {/* Highlights */}
                {Array.isArray(tour.highlights) && tour.highlights.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {tour.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm font-medium text-slate-700">{h}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer / Price & Button */}
                <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-50">
                  <div>
                    <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Tag size={12}/> Narx</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-black text-2xl text-slate-900 tracking-tight">
                        {Number(tour.price).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase">so'm</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedTour(tour)}
                    className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-transform hover:scale-105 group-hover:bg-blue-600 focus:ring-4 focus:ring-blue-100 outline-none"
                  >
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buy Modal */}
      {selectedTour && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-black text-slate-800 mb-2">{selectedTour.title}</h2>
            <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">
              Sayohat paketini band qilish uchun quyidagi ma'lumotlarni kiriting.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Boshlanish sanasi</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Odamlar soni</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPax(p => Math.max(1, p - 1))} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 text-xl font-bold">-</button>
                  <span className="text-lg font-black w-8 text-center">{pax}</span>
                  <button onClick={() => setPax(p => Math.min(20, p + 1))} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 text-xl font-bold">+</button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500 mb-1">
                <span>Bir kishi uchun:</span>
                <span>{Number(selectedTour.price).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between items-center text-lg font-black text-slate-800 pt-2 border-t border-slate-200 mt-2">
                <span>Umumiy summa:</span>
                <span>{(Number(selectedTour.price) * pax).toLocaleString()} so'm</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setSelectedTour(null); setStartDate(""); setPax(1); }}
                className="flex-1 px-5 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                disabled={isBuying}
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmBuy}
                disabled={isBuying}
                className="flex-1 px-5 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {isBuying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Band qilish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
