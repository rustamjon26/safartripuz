import { useEffect, useMemo, useRef } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

export interface TaxiMapProps {
  pickupCoords: { lat: number; lng: number };
  dropoffCoords: { lat: number; lng: number };
  driverCoords?: { lat: number; lng: number } | null;
  style?: StyleProp<ViewStyle>;
  showRoute?: boolean;
}

type LatLng = { lat: number; lng: number };

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

function getBoundingRegion(points: LatLng[]): MapRegion {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padding = 0.01;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + padding, 0.02),
    longitudeDelta: Math.max(maxLng - minLng + padding, 0.02),
  };
}

function toCoordinate(point: LatLng) {
  return { latitude: point.lat, longitude: point.lng };
}

export default function TaxiMap({
  pickupCoords,
  dropoffCoords,
  driverCoords = null,
  style,
  showRoute = true,
}: TaxiMapProps) {
  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo(
    () => getBoundingRegion([pickupCoords, dropoffCoords]),
    [pickupCoords, dropoffCoords],
  );

  useEffect(() => {
    const points: LatLng[] = [pickupCoords, dropoffCoords];
    if (driverCoords) points.push(driverCoords);
    mapRef.current?.animateToRegion(getBoundingRegion(points), 300);
  }, [pickupCoords, dropoffCoords, driverCoords]);

  const polylineCoords = useMemo(
    () => [toCoordinate(pickupCoords), toCoordinate(dropoffCoords)],
    [pickupCoords, dropoffCoords],
  );

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={style ?? { width: "100%", height: "100%" }}
      initialRegion={initialRegion}
      showsUserLocation={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      zoomControlEnabled={false}
    >
      <Marker coordinate={toCoordinate(pickupCoords)} title="Siz">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#22C55E",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 12 }}>📍</Text>
        </View>
      </Marker>

      <Marker coordinate={toCoordinate(dropoffCoords)} title="Manzil">
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 12 }}>🏁</Text>
        </View>
      </Marker>

      {driverCoords ? (
        <Marker coordinate={toCoordinate(driverCoords)} title="Haydovchi">
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#3B82F6",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#fff",
            }}
          >
            <Text style={{ fontSize: 14 }}>🚕</Text>
          </View>
        </Marker>
      ) : null}

      {showRoute ? (
        <Polyline
          coordinates={polylineCoords}
          strokeColor="#3B82F6"
          strokeWidth={2}
        />
      ) : null}
    </MapView>
  );
}
