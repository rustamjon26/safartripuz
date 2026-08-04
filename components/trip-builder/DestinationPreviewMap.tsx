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

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [map, center]);
  return null;
}

type Props = {
  destination: string;
  className?: string;
  height?: number;
};

export default function DestinationPreviewMap({
  destination,
  className = "",
  height = 96,
}: Props) {
  const center = resolveDestinationCenter(destination);
  const zoom = destination.trim() ? 11 : 5;

  return (
    <div
      className={`rounded-2xl border border-[#d8e3fb] overflow-hidden relative ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Recenter center={center} />
        {destination.trim() ? (
          <Marker position={center} icon={markerIcon} />
        ) : null}
      </MapContainer>
      {destination.trim() ? (
        <span className="absolute bottom-2 left-2 z-[500] bg-white/95 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#000917] border border-[#0d2137]/10 shadow-sm">
          {destination}
        </span>
      ) : null}
    </div>
  );
}
