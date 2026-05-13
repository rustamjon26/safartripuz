"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { MapPin, Crosshair, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

// Tashkent center as a reasonable default focus for Uzbekistan.
const DEFAULT_CENTER: [number, number] = [41.311081, 69.240562];
const DEFAULT_ZOOM = 6;
const PICKED_ZOOM = 14;

/** Desktop / IP-based fixes often report ~10–100 km error — warn user. */
const LOOSE_ACCURACY_M = 5000;

export type LocationValue = {
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Optional address string displayed under the picker for orientation. */
  hint?: string;
  className?: string;
};

// React-Leaflet must be loaded only on the client (Leaflet touches `window`).
// Dynamically importing the inner map keeps SSR/Next.js builds happy.
const MapView = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[320px] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
      <Loader2 size={18} className="animate-spin mr-2" /> Xarita yuklanmoqda...
    </div>
  ),
});

type GeocodeResult = { lat: number; lon: number; label: string };

export default function LocationPicker({
  value,
  onChange,
  hint,
  className = "",
}: Props) {
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const mapRef = useRef<LeafletMap | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (
      value.latitude !== null &&
      value.longitude !== null &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude)
    ) {
      return [value.latitude, value.longitude];
    }
    return DEFAULT_CENTER;
  }, [value.latitude, value.longitude]);

  const hasPick =
    value.latitude !== null &&
    value.longitude !== null &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude);

  const setMap = useCallback((m: LeafletMap | null) => {
    mapRef.current = m;
  }, []);

  const onMapClick = useCallback(
    (e: LeafletMouseEvent) => {
      onChange({
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      });
    },
    [onChange],
  );

  const onMarkerDragEnd = useCallback(
    (latlng: { lat: number; lng: number }) => {
      onChange({
        latitude: Number(latlng.lat.toFixed(6)),
        longitude: Number(latlng.lng.toFixed(6)),
      });
    },
    [onChange],
  );

  function applyCoords(lat: number, lng: number, moveMap = true) {
    const next = {
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
    };
    onChange(next);
    if (moveMap && mapRef.current) {
      mapRef.current.setView([next.latitude, next.longitude], PICKED_ZOOM);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      toast.error("Kamida 2 ta belgi yozing (masalan: Zomin, Jizzakh)");
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as {
        results?: GeocodeResult[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Qidiruv muvaffaqiyatsiz");
      const list = data.results ?? [];
      if (list.length === 0) {
        toast.info("Hech narsa topilmadi. 'Zomin, Jizzakh' yoki to‘liq manzil yozib ko‘ring.");
        return;
      }
      setResults(list);
      if (list.length === 1) {
        applyCoords(list[0].lat, list[0].lon);
        setResults([]);
        toast.success("Joy tanlandi — kerak bo‘lsa markerdan aniqroq torting.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qidiruvda xatolik");
    } finally {
      setSearching(false);
    }
  }

  function handleUseMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Brauzeringiz joylashuvni qo‘llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        applyCoords(pos.coords.latitude, pos.coords.longitude);

        if (acc > LOOSE_ACCURACY_M || Number.isNaN(acc)) {
          toast.warning(
            "GPS aniqligi past yoki kompyuter IP orqali taxmin qilindi — Samarqand/Toshkent kabi boshqa joy chiqishi mumkin. Aniq joy uchun: pastdagi qidiruvga «Zomin, Jizzakh» yozing yoki xaritada belgini torting.",
            { duration: 8000 },
          );
        } else {
          toast.success("Joy olindi — yana ham aniq bo‘lishi uchun markerdan surib qo‘ying.");
        }
        setLocating(false);
      },
      (err: GeolocationPositionError) => {
        setLocating(false);
        const msg =
          err.code === 1
            ? "Joylashuv ruxsati rad etildi. Qidiruv orqali yoki xaritada tanlang."
            : err.code === 3
              ? "Vaqt tugadi. Qidiruvga «Zomin, Jizzakh» yozing yoki xaritada bosing."
              : "Joylashuv olinmadi. Qidiruv orqali yoki xaritada tanlang.";
        toast.error(msg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
      },
    );
  }

  // When the parent value changes externally (e.g. form loads existing data),
  // recenter the map so the marker stays in view.
  useEffect(() => {
    if (!mapRef.current) return;
    if (hasPick) {
      mapRef.current.setView(center, PICKED_ZOOM, { animate: false });
    }
  }, [center, hasPick]);

  function setLatField(raw: string) {
    const lat = raw === "" ? null : Number(raw);
    onChange({
      latitude: Number.isFinite(lat) ? (lat as number) : null,
      longitude: value.longitude,
    });
  }

  function setLngField(raw: string) {
    const lng = raw === "" ? null : Number(raw);
    onChange({
      latitude: value.latitude,
      longitude: Number.isFinite(lng) ? (lng as number) : null,
    });
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Manzil qidiruv: masalan Zomin, Jizzakh yoki ko‘cha nomi"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500"
          autoComplete="street-address"
        />
        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black disabled:opacity-50 shrink-0"
        >
          {searching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Qidirish
        </button>
      </form>

      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
        <strong className="text-slate-700">«Mening joyim»</strong> kompyuterni taxminiy (ba’zan Samarqand/Toshkent) ko‘rsatishi mumkin — GPS yoki
        shahar bo‘yicha qidiruv aniqroq.
      </p>

      {results.length > 1 ? (
        <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-slate-50">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  applyCoords(r.lat, r.lon);
                  setResults([]);
                  toast.success("Tanlandi — markerdan aniqroq surishingiz mumkin.");
                }}
                className="w-full text-left px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-emerald-50 transition-colors"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <MapView
          center={center}
          zoom={hasPick ? PICKED_ZOOM : DEFAULT_ZOOM}
          marker={hasPick ? center : null}
          onReady={setMap}
          onMapClick={onMapClick}
          onMarkerDragEnd={onMarkerDragEnd}
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-500">
          <MapPin size={13} />
          {hasPick ? (
            <span>
              {value.latitude!.toFixed(6)}, {value.longitude!.toFixed(6)}
            </span>
          ) : (
            <span className="text-amber-600">
              Lokatsiyani xaritadan tanlang (majburiy)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-bold text-slate-700 disabled:opacity-50"
        >
          {locating ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Crosshair size={13} />
          )}
          Mening joyim
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            min={-90}
            max={90}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono outline-none focus:border-emerald-500"
            value={value.latitude ?? ""}
            onChange={(e) => setLatField(e.target.value)}
            placeholder="41.311081"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            min={-180}
            max={180}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono outline-none focus:border-emerald-500"
            value={value.longitude ?? ""}
            onChange={(e) => setLngField(e.target.value)}
            placeholder="69.240562"
          />
        </div>
      </div>

      {hint ? (
        <p className="text-[11px] text-slate-400 font-semibold">{hint}</p>
      ) : null}
    </div>
  );
}
