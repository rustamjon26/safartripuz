"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { formatPrice, formatPricePerUnit } from "@/lib/displayHelpers";
import { BedDouble, MapPin, Star, Users } from "lucide-react";

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  pricePerNight: number;
  capacity: number;
  capacityAdults: number;
  capacityChildren: number;
};

type HotelDetail = {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  stars: number;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  images: string[];
  roomTypes: RoomType[];
};

export default function HotelDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [mainImage, setMainImage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hotels/${params.id}`);
        const json = (await res.json()) as {
          success?: boolean;
          data?: HotelDetail;
          message?: string;
        };
        if (!res.ok || json.success === false || !json.data) {
          throw new Error(json.message || "Mehmonxona topilmadi");
        }
        if (!cancelled) {
          setHotel(json.data);
          setMainImage(json.data.images?.[0] || "");
        }
      } catch (e) {
        if (!cancelled) {
          setHotel(null);
          setError(e instanceof Error ? e.message : "Xatolik");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (params.id) void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const cheapest = hotel?.roomTypes[0];
  const nightsHint = useMemo(() => {
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, Math.ceil((+new Date(checkOut) - +new Date(checkIn)) / 86400000));
  }, [searchParams]);

  function startTrip() {
    if (!hotel) return;
    const dest = hotel.city || hotel.name;
    router.push(`/trip-builder?dest=${encodeURIComponent(dest)}`);
  }

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/hotels"
            className="inline-flex text-sm font-bold text-slate-500 hover:text-orange-600 mb-4"
          >
            ← Mehmonxonalar
          </Link>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400 font-bold">
              Yuklanmoqda...
            </div>
          ) : error || !hotel ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
              <h1 className="text-xl font-black text-slate-900 mb-2">Mehmonxona topilmadi</h1>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <Link
                href="/hotels"
                className="inline-flex px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold"
              >
                Ro&apos;yxatga qaytish
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="h-[360px] bg-gradient-to-br from-orange-100 via-amber-50 to-slate-100">
                    {mainImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mainImage} alt={hotel.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  {hotel.images.length > 1 ? (
                    <div className="p-3 flex gap-2 overflow-x-auto">
                      {hotel.images.map((img) => (
                        <button
                          key={img}
                          type="button"
                          onClick={() => setMainImage(img)}
                          className={`w-20 h-16 rounded-lg overflow-hidden border-2 ${
                            mainImage === img ? "border-orange-500" : "border-transparent"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-2xl font-black text-slate-900">{hotel.name}</h1>
                    {hotel.stars > 0 ? (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: hotel.stars }).map((_, i) => (
                          <Star key={i} size={14} className="text-orange-500 fill-orange-500" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500 font-semibold flex items-center gap-1.5">
                    <MapPin size={14} className="text-orange-500" />
                    {[hotel.address, hotel.city].filter(Boolean).join(", ") || "Manzil kiritilmagan"}
                  </p>
                  {hotel.rating != null ? (
                    <p className="text-sm font-bold text-amber-600">
                      {hotel.rating.toFixed(1)} ★ · {hotel.reviewCount} ta baho
                    </p>
                  ) : null}
                  {hotel.description ? (
                    <p className="text-sm leading-relaxed text-slate-600">{hotel.description}</p>
                  ) : null}
                </div>

                {hotel.amenities.length > 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-black text-slate-900 mb-4">Qulayliklar</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {hotel.amenities.map((a) => (
                        <div
                          key={a}
                          className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700"
                        >
                          {a}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h2 className="font-black text-slate-900">Xona turlari</h2>
                  {hotel.roomTypes.length === 0 ? (
                    <p className="text-sm text-slate-500 font-semibold">
                      Xona turlari hali kiritilmagan. Safar rejalashtirish orqali so&apos;rang.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {hotel.roomTypes.map((rt) => (
                        <div
                          key={rt.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-100 rounded-2xl p-4"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{rt.name}</p>
                            {rt.description ? (
                              <p className="text-sm text-slate-500 mt-1">{rt.description}</p>
                            ) : null}
                            <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1">
                              <Users size={12} /> {rt.capacity} mehmon
                            </p>
                          </div>
                          <p className="text-lg font-black text-orange-500 shrink-0">
                            {formatPricePerUnit(rt.pricePerNight, "kecha")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="xl:sticky xl:top-24">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  {cheapest ? (
                    <div className="text-2xl font-black text-slate-900">
                      {formatPrice(cheapest.pricePerNight)}
                      <span className="text-xs font-bold text-slate-500 ml-1">/ kecha</span>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-500">Narx so&apos;ralganda aniqlanadi</p>
                  )}
                  {nightsHint > 0 ? (
                    <p className="text-xs font-bold text-slate-400">{nightsHint} tun</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={startTrip}
                    className="w-full px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 flex items-center justify-center gap-2"
                  >
                    <BedDouble size={16} />
                    Safarni boshlash
                  </button>
                  <p className="text-[11px] text-slate-400 font-semibold text-center">
                    Bron qilish uchun hisobingizga kiring — avval mehmonxonani ko&apos;rishingiz mumkin.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
