"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { MapPin, Crosshair, Loader2 } from "lucide-react";

// Tashkent center as a reasonable default focus for Uzbekistan.
const DEFAULT_CENTER: [number, number] = [41.311081, 69.240562];
const DEFAULT_ZOOM = 6;
const PICKED_ZOOM = 14;

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

export default function LocationPicker({
  value,
  onChange,
  hint,
  className = "",
}: Props) {
  const [locating, setLocating] = useState(false);
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

  function handleUseMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        };
        onChange(next);
        if (mapRef.current) {
          mapRef.current.setView([next.latitude, next.longitude], PICKED_ZOOM);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
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
