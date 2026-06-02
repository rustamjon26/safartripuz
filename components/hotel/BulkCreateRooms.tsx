"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BedDouble,
  Building,
  Hash,
  Layers,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  formatPreviewSummary,
  generatePreviewRoomNumbers,
} from "@/lib/hotel/previewRoomNumbers";

type RoomTypeOption = {
  id: string;
  name: string;
  basePrice: number | string;
  capacityAdults: number;
  capacityChildren?: number;
  isActive?: boolean;
};

type BulkSuccessData = {
  created_count: number;
  rooms: Array<{ id: string; room_number: string; floor: number }>;
};

type BulkCreateRoomsProps = {
  hotelId?: string;
  roomTypes?: RoomTypeOption[];
  initialRoomTypeId?: string;
  onSuccess?: () => void;
};

export default function BulkCreateRooms({
  hotelId: hotelIdProp,
  roomTypes: roomTypesProp,
  initialRoomTypeId,
  onSuccess,
}: BulkCreateRoomsProps) {
  const [hotelId, setHotelId] = useState(hotelIdProp ?? "");
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>(roomTypesProp ?? []);
  const [loadingTypes, setLoadingTypes] = useState(!roomTypesProp?.length);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [startNumber, setStartNumber] = useState(101);
  const [floor, setFloor] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateNumbers, setDuplicateNumbers] = useState<string[]>([]);
  const [successData, setSuccessData] = useState<BulkSuccessData | null>(null);

  const preview = useMemo(
    () =>
      generatePreviewRoomNumbers({
        count: Math.min(200, Math.max(1, count)),
        startNumber,
        prefix,
      }),
    [count, startNumber, prefix],
  );

  useEffect(() => {
    if (hotelIdProp) setHotelId(hotelIdProp);
    if (roomTypesProp?.length) {
      setRoomTypes(roomTypesProp);
      setLoadingTypes(false);
    }
  }, [hotelIdProp, roomTypesProp]);

  useEffect(() => {
    if (initialRoomTypeId) setSelectedRoomTypeId(initialRoomTypeId);
  }, [initialRoomTypeId]);

  useEffect(() => {
    if (hotelIdProp && roomTypesProp?.length) return;

    async function bootstrap() {
      setLoadingTypes(true);
      try {
        let id = hotelIdProp;
        if (!id) {
          const meRes = await fetch("/api/hotel/me");
          const meData = await meRes.json();
          if (!meRes.ok) throw new Error(meData.message || "Mehmonxona topilmadi");
          id = meData.hotel?.id as string;
          setHotelId(id);
        }

        if (!roomTypesProp?.length && id) {
          const rtRes = await fetch(`/api/hotels/${id}/room-types`);
          if (!rtRes.ok) {
            const rtData = await rtRes.json();
            throw new Error(rtData.error || "Xona turlarini yuklab bo'lmadi");
          }
          const rtData = await rtRes.json();
          setRoomTypes(rtData.items ?? rtData.roomTypes ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ma'lumotlarni yuklashda xatolik");
      } finally {
        setLoadingTypes(false);
      }
    }

    void bootstrap();
  }, [hotelIdProp, roomTypesProp]);

  useEffect(() => {
    if (!selectedRoomTypeId && roomTypes.length) {
      setSelectedRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypes, selectedRoomTypeId]);

  function formatRoomTypeLabel(rt: RoomTypeOption) {
    const price = Number(rt.basePrice).toLocaleString("uz-UZ");
    const capacity = rt.capacityAdults + (rt.capacityChildren ?? 0);
    return `${rt.name} — ${price} so'm / tun, ${capacity} kishilik`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicateNumbers([]);
    setSuccessData(null);

    if (!hotelId) {
      setError("Mehmonxona ID topilmadi");
      return;
    }
    if (!selectedRoomTypeId) {
      setError("Xona turini tanlang");
      return;
    }
    if (count < 1 || count > 200) {
      setError("Xona soni 1 dan 200 gacha bo'lishi kerak");
      return;
    }
    if (startNumber < 1 || startNumber > 9999) {
      setError("Boshlang'ich raqam 1 dan 9999 gacha bo'lishi kerak");
      return;
    }
    if (floor < 1 || floor > 99) {
      setError("Qavat 1 dan 99 gacha bo'lishi kerak");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/rooms/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type_id: selectedRoomTypeId,
          count,
          start_number: startNumber,
          floor,
          number_prefix: prefix.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const dupes: string[] = data.duplicates ?? data.skipped ?? [];
        setDuplicateNumbers(dupes);
        const dupMsg =
          dupes.length > 0
            ? `Takroriy xona raqamlari: ${dupes.join(", ")}`
            : data.error || "Xatolik yuz berdi";
        setError(dupMsg);
        toast.error(dupMsg);
        return;
      }

      setSuccessData(data);
      toast.success(`${data.created_count} ta xona muvaffaqiyatli yaratildi`);
      onSuccess?.();
    } catch {
      const msg = "Server bilan bog'lanishda xatolik";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  if (loadingTypes) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 size={32} className="animate-spin mb-4" />
        <p className="font-bold text-sm tracking-widest uppercase">Yuklanmoqda...</p>
      </div>
    );
  }

  if (roomTypes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
        <Layers size={40} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-black text-[var(--primary)] mb-2">Xona turi topilmadi</h3>
        <p className="text-sm text-slate-500 font-medium">
          Avval &quot;Xona turlari&quot; bo&apos;limida kamida bitta tur yarating.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--primary)] font-display">
                Ko&apos;p xona yaratish
              </h2>
              <p className="text-[12px] text-slate-500 font-semibold mt-0.5">
                Bir vaqtning o&apos;zida 200 tagacha xona qo&apos;shing
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Room type select */}
          <div>
            <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={13} /> Xona turi
            </label>
            <select
              value={selectedRoomTypeId ?? ""}
              onChange={(e) => setSelectedRoomTypeId(e.target.value || null)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-[14px] outline-none focus:border-[var(--accent)]"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id} disabled={rt.isActive === false}>
                  {formatRoomTypeLabel(rt)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Count */}
            <div>
              <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hash size={13} /> Xona soni
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-black text-[15px] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Start number */}
            <div>
              <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BedDouble size={13} /> Boshlang&apos;ich raqam
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={startNumber}
                onChange={(e) =>
                  setStartNumber(Math.min(9999, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-black text-[15px] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Floor */}
            <div>
              <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building size={13} /> Qavat
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={floor}
                onChange={(e) => setFloor(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[14px] outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Prefix */}
            <div>
              <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 block">
                Prefiks (ixtiyoriy)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.slice(0, 10))}
                placeholder="A yoki bo'sh qoldiring"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-[14px] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-light-blue)]/40 p-4">
            <p className="text-[11px] font-black text-[var(--secondary)] uppercase tracking-wider mb-2">
              Live preview
            </p>
            <p className="text-[14px] font-bold text-[var(--primary)] leading-relaxed">
              Jami{" "}
              <span className="text-[var(--accent)]">{preview.length}</span> ta xona yaratiladi:{" "}
              {formatPreviewSummary(preview) || "—"}
            </p>
            {preview.length > 0 && preview.length <= 10 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {preview.map((n) => (
                  <span
                    key={n}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[12px] font-bold text-slate-700"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="text-[13px] font-semibold">{error}</div>
            </div>
          )}

          {/* Success */}
          {successData && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-[13px] font-semibold">
              {successData.created_count} ta xona muvaffaqiyatli yaratildi. Jismoniy xonalar
              ro&apos;yxatida ko&apos;rishingiz mumkin.
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-white text-[14px] font-bold rounded-xl hover:bg-[var(--secondary)] transition-colors disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Yaratilmoqda...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Yaratish
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
