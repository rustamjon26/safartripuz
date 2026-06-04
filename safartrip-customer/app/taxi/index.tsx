import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TaxiMap from "@/components/TaxiMap";
import { useDirections } from "@/hooks/useDirections";
import { useLocation } from "@/hooks/useLocation";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { forwardGeocode, reverseGeocode } from "@/lib/geocoding";
import { formatPrice } from "@/lib/formatDate";

type TaxiService = {
  id: string;
  title: string;
  serviceType: string;
  price: unknown;
  driverCount?: number;
  avgRating?: number | null;
};

type Estimate = {
  estimatedPrice: number;
  estimatedDistanceKm: number;
  estimatedMinutes: number;
};

const DEFAULT_DROPOFF_COORDS = { lat: 41.2995, lng: 69.2401 };

function serviceLabel(serviceType: string): "STANDARD" | "COMFORT" | "MINIVAN" | "PREMIUM" {
  if (serviceType === "INTERCITY_TRANSFER") return "STANDARD";
  if (serviceType === "HOTEL_TRANSFER") return "COMFORT";
  if (serviceType === "TOUR_DAILY_TRANSPORT") return "MINIVAN";
  return "PREMIUM";
}

export default function TaxiOrderScreen() {
  const params = useLocalSearchParams<{ pickup?: string; dropoff?: string }>();
  const [pickup, setPickup] = useState(params.pickup ?? "");
  const [dropoff, setDropoff] = useState(params.dropoff ?? "");
  const [services, setServices] = useState<TaxiService[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateErr, setEstimateErr] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<"NOW" | "LATER">("NOW");
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [showTime, setShowTime] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({
    lat: 41.3111,
    lng: 69.2797,
  });
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number }>({
    ...DEFAULT_DROPOFF_COORDS,
  });
  const [coordsReady, setCoordsReady] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { coords, permissionStatus, loading: locationLoading, refetch } = useLocation();

  const { result: directionsResult } = useDirections({
    origin: coordsReady ? pickupCoords : null,
    destination: dropoffCoords,
    enabled: coordsReady,
  });

  useEffect(() => {
    if (coords) {
      setPickupCoords(coords);
      setCoordsReady(true);
      void reverseGeocode(coords.lat, coords.lng).then((address) => {
        setPickup(address);
      });
    }
  }, [coords]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = (await api.get("/api/taxi/services")) as {
          data: { data: TaxiService[] };
        };
        const list = res.data?.data ?? [];
        if (!mounted) return;
        setServices(list);
        if (list[0]) setServiceId(list[0].id);
      } catch {
        if (mounted) setServices([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const runEstimate = useCallback(async () => {
    if (!serviceId) return;
    setEstimating(true);
    setEstimateErr(null);
    try {
      const res = (await api.post("/api/taxi/estimate", {
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        serviceId,
      })) as { data: Estimate };
      setEstimate(res.data);
    } catch (e) {
      setEstimate(null);
      setEstimateErr(e instanceof Error ? e.message : "Xato");
    } finally {
      setEstimating(false);
    }
  }, [serviceId, pickupCoords, dropoffCoords]);

  useEffect(() => {
    if (!serviceId) return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      void runEstimate();
    }, 500);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [serviceId, pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng, runEstimate]);

  const selected = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  const dropoffGeocoded = useMemo(
    () =>
      dropoffCoords.lat !== DEFAULT_DROPOFF_COORDS.lat ||
      dropoffCoords.lng !== DEFAULT_DROPOFF_COORDS.lng,
    [dropoffCoords],
  );

  async function handleGeocodeDropoff() {
    if (!dropoff.trim()) return;
    const result = await forwardGeocode(dropoff.trim());
    if (result) setDropoffCoords({ lat: result.lat, lng: result.lng });
  }

  async function submit() {
    if (!pickup.trim() || !dropoff.trim() || !serviceId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        pickupAddress: pickup.trim(),
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffAddress: dropoff.trim(),
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        serviceId,
        customerNote: note.trim() || undefined,
      };
      if (schedule === "LATER") {
        body.scheduledAt = scheduledAt.toISOString();
      }
      const res = (await api.post("/api/taxi/orders", body)) as { data: { id: string } };
      router.replace(`/taxi/${res.data.id}`);
    } catch (e) {
      setEstimateErr(e instanceof Error ? e.message : "Buyurtma xatosi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
      <Text style={styles.h1}>Taxi</Text>
      {locationLoading ? (
        <View style={styles.statusGray}>
          <Text style={styles.statusGrayText}>📍 Joylashuv aniqlanmoqda...</Text>
        </View>
      ) : permissionStatus === "denied" ? (
        <View style={styles.statusAmber}>
          <Text style={styles.statusAmberText}>
            Joylashuv ruxsati berilmagan. Sozlamalardan yoqing yoki manzilni qo'lda kiriting.
          </Text>
        </View>
      ) : coordsReady ? (
        <View style={styles.statusGreen}>
          <Text style={styles.statusGreenText}>✓ GPS joylashuv aniqlandi</Text>
        </View>
      ) : null}

      <View style={styles.mapContainer}>
        <TaxiMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          driverCoords={null}
          routePolyline={directionsResult?.polyline}
          routeDistance={directionsResult?.distance}
          routeDuration={directionsResult?.duration}
        />
      </View>

      <Text style={styles.lbl}>Qayerdan</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.inp, styles.inputFlex]}
          placeholder="Manzil"
          placeholderTextColor={COLORS.gray}
          value={pickup}
          onChangeText={setPickup}
          editable={!locationLoading}
        />
        <Pressable
          style={styles.iconBtn}
          onPress={() => void refetch()}
          disabled={locationLoading}
          accessibilityLabel="Mening joylashuvim"
        >
          {locationLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={COLORS.primary} />
          )}
        </Pressable>
      </View>
      <Text style={styles.lbl}>Qayerga</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.inp, styles.inputFlex]}
          placeholder="Manzil"
          placeholderTextColor={COLORS.gray}
          value={dropoff}
          onChangeText={setDropoff}
          onBlur={async () => {
            if (dropoff.trim()) {
              const result = await forwardGeocode(dropoff.trim());
              if (result) setDropoffCoords({ lat: result.lat, lng: result.lng });
            }
          }}
        />
        <Pressable
          style={styles.iconBtn}
          onPress={() => void handleGeocodeDropoff()}
          accessibilityLabel="Manzilni qidirish"
        >
          <Ionicons name="search" size={22} color={COLORS.primary} />
        </Pressable>
        {dropoffGeocoded ? (
          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
        ) : null}
      </View>

      <Text style={styles.lbl}>Xizmat</Text>
      <FlatList
        horizontal
        data={services}
        keyExtractor={(s) => s.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.svcRow}
        renderItem={({ item }) => {
          const on = item.id === serviceId;
          const cat = serviceLabel(item.serviceType);
          return (
            <Pressable
              style={[styles.svcCard, on && styles.svcCardOn]}
              onPress={() => setServiceId(item.id)}
            >
              <Text style={styles.svcCat}>{cat}</Text>
              <Text style={styles.svcTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.svcPrice}>{formatPrice(Number(item.price))}/km</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.estRow}>
        <Pressable style={styles.calcBtn} onPress={() => void runEstimate()}>
          <Text style={styles.calcTxt}>Narx hisoblash</Text>
        </Pressable>
        {estimating ? <ActivityIndicator color={COLORS.primary} style={{ marginLeft: 12 }} /> : null}
      </View>
      {estimateErr ? <Text style={styles.err}>{estimateErr}</Text> : null}
      {estimate ? (
        <View style={styles.estCard}>
          <Text style={styles.estPrice}>{formatPrice(estimate.estimatedPrice)}</Text>
          <Text style={styles.estMeta}>
            {estimate.estimatedDistanceKm.toFixed(1)} km · ~{estimate.estimatedMinutes} daqiqa
          </Text>
          {directionsResult?.duration ? (
            <Text style={styles.routeInfo}>
              🛣️ Taxminiy vaqt: {directionsResult.duration.text}
              {directionsResult.distance ? ` · ${directionsResult.distance.text}` : ""}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.lbl}>Vaqt</Text>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.togBtn, schedule === "NOW" && styles.togBtnOn]}
          onPress={() => setSchedule("NOW")}
        >
          <Text style={[styles.togTxt, schedule === "NOW" && styles.togTxtOn]}>Hozir</Text>
        </Pressable>
        <Pressable
          style={[styles.togBtn, schedule === "LATER" && styles.togBtnOn]}
          onPress={() => setSchedule("LATER")}
        >
          <Text style={[styles.togTxt, schedule === "LATER" && styles.togTxtOn]}>Keyinroq</Text>
        </Pressable>
      </View>
      {schedule === "LATER" ? (
        <>
          <Pressable style={styles.inp} onPress={() => setShowTime(true)}>
            <Text style={{ fontWeight: "700", color: COLORS.primary }}>
              {scheduledAt.toLocaleString()}
            </Text>
          </Pressable>
          {showTime ? (
            <DateTimePicker
              value={scheduledAt}
              mode="datetime"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS === "android") setShowTime(false);
                if (d) setScheduledAt(d);
              }}
            />
          ) : null}
        </>
      ) : null}

      <Text style={styles.lbl}>Izoh</Text>
      <TextInput
        style={[styles.inp, { minHeight: 72 }]}
        multiline
        placeholder="Haydovchiga eslatma"
        placeholderTextColor={COLORS.gray}
        value={note}
        onChangeText={setNote}
      />

      <Pressable
        style={[styles.orderBtn, submitting && { opacity: 0.7 }]}
        disabled={submitting}
        onPress={() => void submit()}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.orderTxt}>Buyurtma berish</Text>
        )}
      </Pressable>
      {selected ? (
        <Text style={styles.hint}>Tanlangan: {serviceLabel(selected.serviceType)}</Text>
      ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  h1: { fontSize: 26, fontWeight: "900", color: COLORS.primary },
  statusGray: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusGrayText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "600", lineHeight: 18 },
  statusAmber: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusAmberText: { fontSize: 13, color: COLORS.dark, fontWeight: "600", lineHeight: 18 },
  statusGreen: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#22C55E",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statusGreenText: { fontSize: 13, color: "#166534", fontWeight: "600", lineHeight: 18 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputFlex: { flex: 1 },
  iconBtn: { padding: 8 },
  lbl: { fontSize: 12, fontWeight: "800", color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  inp: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  svcRow: { gap: 10, paddingVertical: 4 },
  svcCard: {
    width: 132,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  svcCardOn: { borderColor: COLORS.primary, backgroundColor: COLORS.chipSelected },
  svcCat: { fontSize: 11, fontWeight: "900", color: COLORS.primaryLight },
  svcTitle: { fontSize: 13, fontWeight: "700", color: COLORS.dark, marginTop: 4, minHeight: 36 },
  svcPrice: { fontSize: 12, fontWeight: "800", color: COLORS.textSecondary, marginTop: 6 },
  estRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  calcBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  calcTxt: { fontWeight: "900", color: COLORS.dark },
  err: { color: COLORS.danger, fontWeight: "700", marginTop: 8 },
  estCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  estPrice: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  estMeta: { marginTop: 4, color: COLORS.textSecondary, fontWeight: "600" },
  routeInfo: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  toggle: { flexDirection: "row", gap: 10, marginTop: 6 },
  togBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: "center",
  },
  togBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.chipSelected },
  togTxt: { fontWeight: "800", color: COLORS.textSecondary },
  togTxtOn: { color: COLORS.primary },
  orderBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  orderTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  hint: { textAlign: "center", marginTop: 10, color: COLORS.gray, fontSize: 12 },
});
