"use client";

import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { resolveDestinationCenter } from "@/lib/trip-builder/destinationCenters";

const markerIcon = L.divIcon({
  className: "safar-leaflet-marker",
  html: `<div style="
    width:28px;height:28px;
    transform:translate(-50%,-100%);
    display:flex;align-items:flex-start;justify-content:center;
  ">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="#006781" stroke="#0d2137" stroke-width="1.2">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 7.5 12.45.3.27.7.27 1 0C13 22 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function MapSync({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    // Leaflet often paints grey until container size is known (sidebar/flex).
    const fix = () => {
      map.invalidateSize({ animate: false });
      map.setView(center, zoom, { animate: false });
    };
    fix();
    const t1 = window.setTimeout(fix, 50);
    const t2 = window.setTimeout(fix, 250);
    window.addEventListener("resize", fix);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", fix);
    };
  }, [map, center, zoom]);
  return null;
}

type DestOption = { id: string; title: string };

type Props = {
  destination: string;
  className?: string;
  height?: number;
  /** Quick-pick chips when no destination selected. */
  destinations?: DestOption[];
  onSelectDestination?: (title: string) => void;
};

export default function DestinationPreviewMap({
  destination,
  className = "",
  height = 160,
  destinations = [],
  onSelectDestination,
}: Props) {
  const hasDest = Boolean(destination.trim());
  const center = resolveDestinationCenter(destination);
  const zoom = hasDest ? 12 : 6;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className="rounded-2xl border border-[#d8e3fb] overflow-hidden relative bg-[#e8eef8]"
        style={{ height }}
      >
        <MapContainer
          key={hasDest ? `dest:${destination}` : "uz-overview"}
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          scrollWheelZoom
          dragging
          doubleClickZoom
          zoomControl
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSync center={center} zoom={zoom} />
          {hasDest ? <Marker position={center} icon={markerIcon} /> : null}
        </MapContainer>

        {hasDest ? (
          <span className="pointer-events-none absolute bottom-2 left-2 z-[500] bg-white/95 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#000917] border border-[#0d2137]/10 shadow-sm">
            {destination}
          </span>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-[#0d2137]/70 to-transparent px-3 pb-2.5 pt-8">
            <p className="text-[11px] font-bold text-white drop-shadow">
              Xaritani suring yoki pastdan viloyat tanlang
            </p>
          </div>
        )}
      </div>

      {!hasDest && destinations.length > 0 && onSelectDestination ? (
        <div className="flex flex-wrap gap-1.5">
          {destinations.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDestination(d.title)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f0f3ff] text-[#0d2137] border border-[#d8e3fb] hover:bg-[#006781] hover:text-white hover:border-[#006781] transition-colors"
            >
              {d.title}
            </button>
          ))}
        </div>
      ) : null}

      {hasDest && onSelectDestination ? (
        <button
          type="button"
          onClick={() => onSelectDestination("")}
          className="self-start text-[11px] font-semibold text-[#64748B] hover:text-[#0d2137] underline underline-offset-2"
        >
          Manzilni o‘zgartirish
        </button>
      ) : null}
    </div>
  );
}
