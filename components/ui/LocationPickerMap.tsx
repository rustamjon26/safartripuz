"use client";

import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L, { type LeafletMouseEvent, type Map as LeafletMap } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Leaflet's default marker icon assumes Webpack-style asset URLs that break
// in modern bundlers. Use a tiny SVG data URL instead — no extra HTTP request.
const markerIcon = L.divIcon({
  className: "safar-leaflet-marker",
  html: `<div style="
    width:32px;height:32px;
    transform:translate(-50%,-100%);
    display:flex;align-items:flex-start;justify-content:center;
  ">
    <svg viewBox="0 0 24 24" width="32" height="32" fill="#10b981" stroke="#065f46" stroke-width="1.5">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 7.5 12.45.3.27.7.27 1 0C13 22 20 15.25 20 10c0-4.42-3.58-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  center: [number, number];
  zoom: number;
  marker: [number, number] | null;
  onReady: (map: LeafletMap | null) => void;
  onMapClick: (e: LeafletMouseEvent) => void;
  onMarkerDragEnd: (latlng: { lat: number; lng: number }) => void;
};

function MapEvents({ onMapClick }: { onMapClick: (e: LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

function MapRefBridge({ onReady }: { onReady: (m: LeafletMap | null) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
    return () => onReady(null);
  }, [map, onReady]);
  return null;
}

export default function LocationPickerMap({
  center,
  zoom,
  marker,
  onReady,
  onMapClick,
  onMarkerDragEnd,
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "320px", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMapClick={onMapClick} />
      <MapRefBridge onReady={onReady} />
      {marker ? (
        <Marker
          position={marker}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              onMarkerDragEnd({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
