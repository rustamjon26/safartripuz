"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import BookingCalendar from "@/components/hotel/calendar/BookingCalendar";
import QuickBookModal from "@/components/hotel/calendar/QuickBookModal";
import { useLanguage } from "@/context/LanguageContext";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";

interface HotelMeResponse {
  hotel?: { id: string; name: string };
}

type QuickBookState = {
  roomId: string;
  startDate: string;
  endDate: string;
} | null;

export default function HotelCalendarPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [hotelId, setHotelId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickBook, setQuickBook] = useState<QuickBookState>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHotel() {
      setLoading(true);
      setError(null);
      try {
        const res = await hotelFetch("/api/hotel/me");
        const data = (await res.json()) as HotelMeResponse & { message?: string };
        if (!res.ok || !data.hotel?.id) {
          throw new Error(data.message || "Mehmonxona topilmadi");
        }
        if (!cancelled) setHotelId(data.hotel.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mehmonxona topilmadi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHotel();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBookingClick = useCallback(
    (bookingId: string) => {
      router.push(`/hotel/bookings/${bookingId}`);
    },
    [router],
  );

  const handleRangeSelect = useCallback((roomId: string, start: string, end: string) => {
    setQuickBook({ roomId, startDate: start, endDate: end });
  }, []);

  const handleQuickBookSuccess = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
    toast.success("Bron yaratildi");
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        <span className="text-sm font-bold">Yuklanmoqda…</span>
      </div>
    );
  }

  if (error || !hotelId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
        <p className="text-sm font-bold text-red-700">{error || "Mehmonxona topilmadi"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-[var(--primary)]">{t("nav.calendar")}</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">
          Xonalar bandligini ko&apos;ring va drag bilan tezkor bron qiling
        </p>
      </div>

      <BookingCalendar
        hotelId={hotelId}
        refreshToken={refreshToken}
        onBookingClick={handleBookingClick}
        onRangeSelect={handleRangeSelect}
      />

      {quickBook && (
        <QuickBookModal
          open
          hotelId={hotelId}
          roomId={quickBook.roomId}
          startDate={quickBook.startDate}
          endDate={quickBook.endDate}
          onClose={() => setQuickBook(null)}
          onSuccess={handleQuickBookSuccess}
        />
      )}
    </div>
  );
}
