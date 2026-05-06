import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { router } from "expo-router";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
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

const TASH_PICKUP = { lat: 41.3111, lng: 69.2797 };
const TASH_DROPOFF = { lat: 41.2995, lng: 69.2401 };

function serviceLabel(serviceType: string): "STANDARD" | "COMFORT" | "MINIVAN" | "PREMIUM" {
  if (serviceType === "INTERCITY_TRANSFER") return "STANDARD";
  if (serviceType === "HOTEL_TRANSFER") return "COMFORT";
  if (serviceType === "TOUR_DAILY_TRANSPORT") return "MINIVAN";
  return "PREMIUM";
}

export default function TaxiOrderScreen() {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
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
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = (await api.get("/api/taxi/services")) as {
          data: { data: TaxiService[] };
        };
        const list = res.data?.data ?? [];
        setServices(list);
        if (list[0]) setServiceId(list[0].id);
      } catch {
        setServices([]);
      }
    })();
  }, []);

  const runEstimate = useCallback(async () => {
    if (!serviceId) return;
    setEstimating(true);
    setEstimateErr(null);
    try {
      const res = (await api.post("/api/taxi/estimate", {
        pickupLat: TASH_PICKUP.lat,
        pickupLng: TASH_PICKUP.lng,
        dropoffLat: TASH_DROPOFF.lat,
        dropoffLng: TASH_DROPOFF.lng,
        serviceId,
      })) as { data: Estimate };
      setEstimate(res.data);
    } catch (e) {
      setEstimate(null);
      setEstimateErr(e instanceof Error ? e.message : "Xato");
    } finally {
      setEstimating(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId) return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      void runEstimate();
    }, 500);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [serviceId, pickup, dropoff, runEstimate]);

  const selected = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  async function submit() {
    if (!pickup.trim() || !dropoff.trim() || !serviceId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        pickupAddress: pickup.trim(),
        pickupLat: TASH_PICKUP.lat,
        pickupLng: TASH_PICKUP.lng,
        dropoffAddress: dropoff.trim(),
        dropoffLat: TASH_DROPOFF.lat,
        dropoffLng: TASH_DROPOFF.lng,
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Taxi</Text>
      <Text style={styles.sub}>Manzillar (demo: Toshkent koordinatalari bilan narx hisoblanadi)</Text>

      <Text style={styles.lbl}>Qayerdan</Text>
      <TextInput
        style={styles.inp}
        placeholder="Manzil"
        placeholderTextColor={COLORS.gray}
        value={pickup}
        onChangeText={setPickup}
      />
      <Text style={styles.lbl}>Qayerga</Text>
      <TextInput
        style={styles.inp}
        placeholder="Manzil"
        placeholderTextColor={COLORS.gray}
        value={dropoff}
        onChangeText={setDropoff}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "900", color: COLORS.primary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, marginBottom: 12 },
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
