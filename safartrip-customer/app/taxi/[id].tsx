import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/formatDate";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewForm } from "@/components/ReviewForm";

const FLOW = ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;
const LABELS = ["Kutilmoqda", "Qabul", "Yetib keldi", "Yo'lda", "Tugallandi"];

type Order = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: unknown;
  finalPrice?: unknown | null;
  driver?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    driverProfile?: { rating: number | null; totalTrips: number } | null;
    taxiVehicles?: { make: string; model: string; plateNumber: string }[];
  } | null;
  vehicle?: { make: string; model: string; plateNumber: string; color: string } | null;
  service?: { title: string } | null;
  review?: { id: string } | null;
};

const ACTIVE = new Set(["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"]);

export default function TaxiOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    if (mountedRef.current) setLoadError(null);
    try {
      const res = (await api.get(`/api/taxi/orders/${id}`)) as { data: Order };
      if (!mountedRef.current) return;
      setOrder(res.data);
    } catch (e) {
      if (!mountedRef.current) return;
      setLoadError(e instanceof Error ? e.message : "Xato");
      setOrder(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order?.status || !ACTIVE.has(order.status)) return;
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [order?.status, load]);

  const stepIdx = order ? FLOW.indexOf(order.status as (typeof FLOW)[number]) : -1;

  async function cancelOrder() {
    Alert.alert("Bekor qilish", "Buyurtmani bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/api/taxi/orders/${id}`, { cancellationReason: "Mijoz bekor qildi" });
            await load();
          } catch (e) {
            Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
          }
        },
      },
    ]);
  }

  async function sendReview(rating: number, comment: string) {
    if (!id) return;
    setReviewing(true);
    try {
      await api.post(`/api/taxi/orders/${id}/review`, { rating, comment: comment || undefined });
      await load();
      Alert.alert("Rahmat", "Sharh qoldirildi");
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return <LoadingScreen text="Buyurtma..." />;
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom", "left", "right"]}>
        <Text style={styles.muted}>{loadError ?? "Buyurtma topilmadi"}</Text>
      </SafeAreaView>
    );
  }

  const showDriver =
    order.driver &&
    ["ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(order.status);
  const v =
    order.vehicle ??
    (order.driver?.taxiVehicles?.[0]
      ? {
          make: order.driver.taxiVehicles[0].make,
          model: order.driver.taxiVehicles[0].model,
          plateNumber: order.driver.taxiVehicles[0].plateNumber,
          color: "",
        }
      : null);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Buyurtma</Text>
      <Text style={styles.id}>#{order.id.slice(0, 8)}</Text>

      <View style={styles.steps}>
        {FLOW.map((st, i) => {
          const done = stepIdx >= i;
          const cur = stepIdx === i;
          return (
            <View key={st} style={styles.stepCol}>
              <View style={[styles.stepDot, done && styles.stepDotOn, cur && styles.stepDotCur]} />
              <Text style={[styles.stepLbl, done && styles.stepLblOn]} numberOfLines={2}>
                {LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>

      {order.status === "CANCELLED" ? (
        <Text style={styles.cancelBanner}>Buyurtma bekor qilindi</Text>
      ) : null}

      {showDriver && order.driver ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Haydovchi</Text>
          <Text style={styles.dName}>
            {order.driver.first_name} {order.driver.last_name}
          </Text>
          {order.driver.phone ? (
            <Pressable
              style={styles.phoneRow}
              onPress={() => void Linking.openURL(`tel:${order.driver!.phone}`)}
            >
              <Ionicons name="call" size={18} color={COLORS.primary} />
              <Text style={styles.phone}>{order.driver.phone}</Text>
            </Pressable>
          ) : null}
          {order.driver.driverProfile?.rating != null ? (
            <Text style={styles.meta}>
              Reyting: {order.driver.driverProfile.rating.toFixed(1)} ·{" "}
              {order.driver.driverProfile.totalTrips} safar
            </Text>
          ) : null}
          {v ? (
            <Text style={styles.meta}>
              {v.make} {v.model} · {v.plateNumber}
              {v.color ? ` · ${v.color}` : ""}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marshrut</Text>
        <Text style={styles.route}>📍 {order.pickupAddress}</Text>
        <Text style={styles.arrow}>↓</Text>
        <Text style={styles.route}>📍 {order.dropoffAddress}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Narx</Text>
        <Text style={styles.priceRow}>
          Taxminiy: <Text style={styles.bold}>{formatPrice(Number(order.estimatedPrice))}</Text>
        </Text>
        {order.status === "COMPLETED" && order.finalPrice != null ? (
          <Text style={styles.priceRow}>
            Yakuniy: <Text style={styles.bold}>{formatPrice(Number(order.finalPrice))}</Text>
          </Text>
        ) : null}
      </View>

      {order.status === "PENDING" || order.status === "ACCEPTED" ? (
        <Pressable style={styles.cancelBtn} onPress={() => void cancelOrder()}>
          <Text style={styles.cancelTxt}>Bekor qilish</Text>
        </Pressable>
      ) : null}

      {order.status === "COMPLETED" && !order.review ? (
        <ReviewForm
          key={order.id}
          isLoading={reviewing}
          onSubmit={(rating, comment) => void sendReview(rating, comment)}
        />
      ) : null}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 24 },
  muted: { color: COLORS.gray },
  h1: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  id: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  steps: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 8 },
  stepCol: { width: "18%", alignItems: "center" },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.lightGray,
    marginBottom: 6,
  },
  stepDotOn: { backgroundColor: COLORS.primaryLight },
  stepDotCur: { borderWidth: 2, borderColor: COLORS.primary },
  stepLbl: { fontSize: 9, textAlign: "center", color: COLORS.gray, fontWeight: "600" },
  stepLblOn: { color: COLORS.dark },
  cancelBanner: {
    textAlign: "center",
    padding: 12,
    backgroundColor: COLORS.surfaceDanger,
    borderRadius: 10,
    color: COLORS.danger,
    fontWeight: "800",
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cardTitle: { fontSize: 12, fontWeight: "900", color: COLORS.textSecondary, marginBottom: 8 },
  dName: { fontSize: 18, fontWeight: "900", color: COLORS.dark },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  phone: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  meta: { marginTop: 6, fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  route: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  arrow: { textAlign: "center", color: COLORS.gray, marginVertical: 4 },
  priceRow: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  bold: { fontWeight: "900", color: COLORS.primary },
  cancelBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: "center",
  },
  cancelTxt: { color: COLORS.danger, fontWeight: "900" },
});
