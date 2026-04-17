"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  guest?: { first_name: string; last_name: string };
};

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  region: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  images: string[];
  host: { name: string; avatar: string | null };
  avgRating: number | null;
  reviewCount: number;
  reviews: Review[];
};

type AvailabilityResponse = {
  available: boolean;
  unavailableDates: string[];
};

type WidgetAvailability = {
  available: boolean;
  unavailableDates: string[];
  totalPrice: number;
  nights: number;
};

function getNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const diff = +new Date(checkOut) - +new Date(checkIn);
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function HomeStayDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [mainImage, setMainImage] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestCount, setGuestCount] = useState(2);
  const [booking, setBooking] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [widgetAvailability, setWidgetAvailability] = useState<WidgetAvailability | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dRes, aRes] = await Promise.all([
          fetch(`/api/homestay/${params.id}`),
          fetch(`/api/homestay/${params.id}/availability`),
        ]);
        const dJson = await dRes.json();
        const aJson = (await aRes.json()) as { success?: boolean; data?: AvailabilityResponse };
        if (dRes.ok && dJson.success) {
          setListing(dJson.data);
          setMainImage(dJson.data.images?.[0] || "");
        }
        if (aRes.ok && aJson.success) {
          setBlockedDates(aJson.data?.unavailableDates ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    if (params.id) void load();
  }, [params.id]);

  const nights = useMemo(
    () => widgetAvailability?.nights ?? getNights(checkIn, checkOut),
    [widgetAvailability, checkIn, checkOut],
  );
  const total = useMemo(
    () =>
      widgetAvailability?.totalPrice ??
      (listing ? Number(listing.pricePerNight) * nights : 0),
    [widgetAvailability, listing, nights],
  );

  const ratingsBreakdown = useMemo(() => {
    const arr = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: (listing?.reviews || []).filter((x) => x.rating === r).length,
    }));
    return arr;
  }, [listing]);

  function isUnavailable(dateStr: string) {
    return blockedDates.includes(dateStr);
  }

  useEffect(() => {
    async function checkAvailability() {
      if (!listing || !checkIn || !checkOut || guestCount < 1) {
        setAvailabilityError(null);
        setWidgetAvailability(null);
        return;
      }
      setCheckingAvailability(true);
      try {
        const res = await fetch(`/api/homestay/${listing.id}/check-availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkIn, checkOut, guestCount }),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error || "Availability tekshirib bo'lmadi");
        }
        const data = json.data as WidgetAvailability;
        setWidgetAvailability(data);
        setAvailabilityError(data.available ? null : "Bu sanalar band");
      } catch (error) {
        setWidgetAvailability(null);
        setAvailabilityError(error instanceof Error ? error.message : "Server xatosi");
      } finally {
        setCheckingAvailability(false);
      }
    }

    void checkAvailability();
  }, [listing, checkIn, checkOut, guestCount]);

  async function bookNow() {
    if (!listing) return;
    if (!checkIn || !checkOut) {
      toast.error("Check-in va check-out ni tanlang");
      return;
    }
    if (!widgetAvailability?.available) {
      toast.error("Bu sanalar band");
      return;
    }
    setBooking(true);
    try {
      const res = await fetch("/api/homestay/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, checkIn, checkOut, guestCount }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/homestay/${listing.id}`);
        return;
      }
      if (!res.ok || json.success === false) {
        throw new Error(json.error || "Booking xatoligi");
      }
      toast.success("Booking yaratildi");
      router.push("/user/bookings/homestay");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div id="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }} className="bg-slate-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading || !listing ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400 font-bold">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="h-[360px] bg-slate-100">
                    {mainImage ? <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="p-3 flex gap-2 overflow-x-auto">
                    {(listing.images || []).map((img) => (
                      <button key={img} onClick={() => setMainImage(img)} className={`w-20 h-16 rounded-lg overflow-hidden border-2 ${mainImage === img ? "border-blue-500" : "border-transparent"}`}>
                        <img src={img} alt={listing.title} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h1 className="text-2xl font-black text-slate-900">{listing.title}</h1>
                  <p className="text-sm text-slate-500 font-semibold">{listing.address}, {listing.city}, {listing.region}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600">
                      {(listing.host?.name || "H").slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{listing.host?.name || "Host"}</p>
                      <p className="text-xs text-slate-500">Host</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">{listing.description}</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-black text-slate-900 mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {listing.amenities.map((a) => (
                      <div key={a} className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-black text-slate-900">Reviews</h2>
                    <div className="flex items-center gap-1 text-amber-600 font-black">
                      <Star size={14} fill="currentColor" />
                      {listing.avgRating?.toFixed(1) ?? "-"} ({listing.reviewCount})
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ratingsBreakdown.map((r) => (
                      <div key={r.rating} className="flex items-center gap-3">
                        <span className="w-8 text-sm font-bold text-slate-600">{r.rating}★</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${listing.reviewCount ? (r.count / listing.reviewCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-xs text-slate-500 font-bold text-right">{r.count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {listing.reviews.map((review) => (
                      <div key={review.id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800">
                            {review.guest ? `${review.guest.first_name} ${review.guest.last_name}` : "Guest"}
                          </p>
                          <p className="text-xs font-black text-amber-600">{review.rating}★</p>
                        </div>
                        {review.comment ? <p className="text-sm text-slate-600 mt-2">{review.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="xl:sticky xl:top-24">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <div className="text-2xl font-black text-slate-900">
                    {Number(listing.pricePerNight).toLocaleString()}
                    <span className="text-xs font-bold text-slate-500 ml-1">UZS / night</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => {
                          if (isUnavailable(e.target.value)) {
                            toast.error("Bu sana band qilingan");
                            return;
                          }
                          setCheckIn(e.target.value);
                        }}
                        className="h-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => {
                          if (isUnavailable(e.target.value)) {
                            toast.error("Bu sana band qilingan");
                            return;
                          }
                          setCheckOut(e.target.value);
                        }}
                        className="h-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Guests
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={listing.maxGuests}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="h-input"
                      />
                    </div>
                  </div>

                  {availabilityError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {availabilityError}
                    </div>
                  ) : null}

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>
                        {Number(listing.pricePerNight).toLocaleString()} × {nights || 0} night
                      </span>
                      <span>{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-900 mt-2 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>{total.toLocaleString()} UZS</span>
                    </div>
                  </div>

                  <button
                    onClick={() => void bookNow()}
                    disabled={
                      booking ||
                      checkingAvailability ||
                      !checkIn ||
                      !checkOut ||
                      nights <= 0 ||
                      widgetAvailability?.available === false
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50"
                  >
                    {booking ? "Booking..." : checkingAvailability ? "Checking..." : "Book Now"}
                  </button>
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
