import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PLATFORM_FEE_PERCENT, COLORS } from "@/lib/constants";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

type OrderLog = {
  id: string;
  status?: string;
  note?: string;
  actorRole?: string;
  createdAt?: string;
};

type DriverOrderDetail = {
  id: string;
  status: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  estimatedPrice?: number;
  finalPrice?: number;
  distanceKm?: number;
  estimatedDistanceKm?: number;
  vehicleId?: string | null;
  customer?: {
    name?: string;
    phone?: string;
  };
  logs?: OrderLog[];
};

const FLOW = ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;
const ACTIVE_STATUSES = new Set(["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"]);

function formatMoney(value?: number) {
  return `${Number(value ?? 0).toLocaleString()} so'm`;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function normalizeOrder(payload: any): DriverOrderDetail | null {
  return (payload?.data?.data ?? payload?.data ?? payload) as DriverOrderDetail | null;
}

function logText(entry: OrderLog) {
  if (entry.note) return entry.note;
  if (entry.status) return `Status: ${entry.status}`;
  return "Holat yangilandi";
}

function roleText(role?: string) {
  if (role === "system") return "Tizim";
  if (role === "customer") return "Mijoz";
  return "Siz";
}

function nextAction(status: string): "accept" | "arrive" | "start" | "complete" | null {
  if (status === "PENDING") return "accept";
  if (status === "ACCEPTED") return "arrive";
  if (status === "ARRIVED") return "start";
  if (status === "IN_PROGRESS") return "complete";
  return null;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<DriverOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [completeError, setCompleteError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    if (mountedRef.current) setError(null);
    try {
      const response = await api.get(`/api/taxi/driver/orders/${id}`);
      if (!mountedRef.current) return;
      const normalized = normalizeOrder(response);
      setOrder(normalized);
      if (normalized?.estimatedPrice && !showComplete) {
        setFinalPrice(String(normalized.estimatedPrice));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Buyurtmani olishda xatolik");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [id, showComplete]);

  useEffect(() => {
    setIsLoading(true);
    void fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!order || !ACTIVE_STATUSES.has(order.status)) return;
    const timer = setInterval(() => {
      void fetchOrder();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchOrder, order]);

  const fee = useMemo(() => {
    const value = Number(order?.finalPrice ?? 0);
    return (value * PLATFORM_FEE_PERCENT) / 100;
  }, [order?.finalPrice]);
  const net = useMemo(() => Number(order?.finalPrice ?? 0) - fee, [fee, order?.finalPrice]);

  async function patchAction(
    action: "accept" | "arrive" | "start" | "complete" | "cancel",
    payload?: { finalPrice?: number; distanceKm?: number },
  ) {
    if (!id) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.patch(`/api/taxi/driver/orders/${id}`, { action, ...payload });
      await fetchOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Holat yangilanmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  function onCancel() {
    Alert.alert("Buyurtmani bekor qilish", "Haqiqatan ham bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha, bekor qilish",
        style: "destructive",
        onPress: () => void patchAction("cancel"),
      },
    ]);
  }

  async function onCompleteSubmit() {
    const final = Number(finalPrice);
    const distance = Number(distanceKm);
    if (!finalPrice || !distanceKm || Number.isNaN(final) || Number.isNaN(distance) || final <= 0 || distance <= 0) {
      setCompleteError("Maydonlar majburiy va 0 dan katta bo'lishi kerak");
      return;
    }
    setCompleteError(null);
    await patchAction("complete", { finalPrice: final, distanceKm: distance });
    setShowComplete(false);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <LoadingScreen text="Buyurtma yuklanmoqda..." />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Xatolik yuz berdi</Text>
          <Text style={styles.errorText}>{error ?? "Buyurtma topilmadi"}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchOrder()}>
            <Text style={styles.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const isBadState = order.status === "CANCELLED" || order.status === "DISPUTE";
  const action = nextAction(order.status);
  const showCustomerCard = FLOW.indexOf(order.status as (typeof FLOW)[number]) >= 1;
  const logs = order.logs ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <View style={styles.screen}>
      <FlatList
        data={logs}
        keyExtractor={(item, index) => item.id ?? `${index}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Buyurtma #{order.id.slice(-6)}</Text>
            <StatusBadge status={order.status} />

            <View style={styles.progressWrap}>
              {FLOW.map((step, index) => {
                const done = !isBadState && index < currentStep;
                const active = !isBadState && index === currentStep;
                const stepColor = isBadState
                  ? COLORS.danger
                  : done || active
                    ? COLORS.primary
                    : COLORS.gray;
                return (
                  <View key={step} style={styles.stepCol}>
                    <View style={[styles.stepDot, { backgroundColor: stepColor }]}>
                      {done ? <MaterialIcons name="check" size={14} color={COLORS.white} /> : null}
                    </View>
                    {index < FLOW.length - 1 ? (
                      <View
                        style={[
                          styles.stepLine,
                          { backgroundColor: !isBadState && index < currentStep ? COLORS.primary : COLORS.gray },
                        ]}
                      />
                    ) : null}
                    <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step}</Text>
                  </View>
                );
              })}
            </View>

            {showCustomerCard ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mijoz ma'lumotlari</Text>
                <Text style={styles.cardText}>Ism: {order.customer?.name ?? "-"}</Text>
                <Pressable onPress={() => order.customer?.phone && void Linking.openURL(`tel:${order.customer.phone}`)}>
                  <Text style={[styles.cardText, styles.phone]}>
                    Telefon: {order.customer?.phone ?? "-"}
                  </Text>
                </Pressable>
                <Text style={styles.cardText}>
                  Biriktirilgan transport: {order.vehicleId ?? "—"}
                </Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yo'nalish</Text>
              <View style={styles.routeRow}>
                <MaterialIcons name="my-location" size={18} color={COLORS.success} />
                <Text style={styles.cardText}>{order.pickupAddress ?? "-"}</Text>
              </View>
              <View style={styles.routeArrow}>
                <MaterialIcons name="south" size={18} color={COLORS.textSecondary} />
              </View>
              <View style={styles.routeRow}>
                <MaterialIcons name="place" size={18} color={COLORS.danger} />
                <Text style={styles.cardText}>{order.dropoffAddress ?? "-"}</Text>
              </View>
              {order.estimatedDistanceKm ? (
                <Text style={styles.distanceText}>Taxminiy masofa: {order.estimatedDistanceKm} km</Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Narx</Text>
              <Text style={styles.cardText}>Taxminiy narx: {formatMoney(order.estimatedPrice)}</Text>
              {order.status === "COMPLETED" ? (
                <>
                  <Text style={[styles.cardText, styles.finalPrice]}>
                    Yakuniy narx: {formatMoney(order.finalPrice)}
                  </Text>
                  <Text style={styles.cardText}>Platform fee ({PLATFORM_FEE_PERCENT}%): {formatMoney(fee)}</Text>
                  <Text style={styles.netText}>Sof daromad: {formatMoney(net)}</Text>
                </>
              ) : null}
            </View>

            <Text style={styles.logsTitle}>Status loglar</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.logRow}>
            <View style={styles.logMarker}>
              <View style={styles.logDot} />
              {index !== logs.length - 1 ? <View style={styles.logLine} /> : null}
            </View>
            <View style={styles.logContent}>
              <Text style={styles.logText}>{logText(item)}</Text>
              <Text style={styles.logMeta}>
                {roleText(item.actorRole)} • {formatTime(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyLog}>Loglar mavjud emas</Text>}
      />
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      {(order.status === "PENDING" || order.status === "ACCEPTED") ? (
        <Pressable style={styles.cancelSmallBtn} onPress={onCancel}>
          <Text style={styles.cancelSmallText}>Bekor qilish</Text>
        </Pressable>
      ) : null}

      {action ? (
        <Pressable
          disabled={isSubmitting}
          onPress={() => {
            if (action === "complete") {
              setDistanceKm(order.distanceKm ? String(order.distanceKm) : "");
              setFinalPrice(String(order.finalPrice ?? order.estimatedPrice ?? ""));
              setShowComplete(true);
              return;
            }
            void patchAction(action);
          }}
          style={[
            styles.actionBtn,
            action === "accept"
              ? { backgroundColor: COLORS.success }
              : action === "arrive"
                ? { backgroundColor: COLORS.primaryLight }
                : { backgroundColor: COLORS.primary },
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.actionText}>
            {action === "accept"
              ? "Qabul qilish"
              : action === "arrive"
                ? "Yetib keldim"
                : action === "start"
                  ? "Yo'lga chiqdik"
                  : "Yakunlash"}
          </Text>
        </Pressable>
      ) : null}

      <Modal visible={showComplete} transparent animationType="slide" onRequestClose={() => setShowComplete(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Reysni yakunlash</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={finalPrice}
              onChangeText={setFinalPrice}
              placeholder="Yakuniy narx"
            />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={distanceKm}
              onChangeText={setDistanceKm}
              placeholder="Masofa (km)"
            />
            {completeError ? <Text style={styles.completeError}>{completeError}</Text> : null}
            <Pressable
              style={[styles.sheetBtn, isSubmitting && styles.disabled]}
              disabled={isSubmitting}
              onPress={() => void onCompleteSubmit()}
            >
              <Text style={styles.sheetBtnText}>Yakunlash</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  content: {
    padding: 14,
    paddingBottom: 24,
    gap: 10,
  },
  headerWrap: {
    gap: 12,
  },
  title: {
    color: COLORS.dark,
    fontSize: 22,
    fontWeight: "700",
  },
  progressWrap: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepCol: {
    flex: 1,
    alignItems: "center",
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    position: "absolute",
    top: 10,
    right: -24,
    width: 48,
    height: 2,
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 15,
  },
  cardText: {
    color: COLORS.text,
    fontSize: 14,
  },
  phone: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeArrow: {
    marginLeft: 3,
  },
  distanceText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  finalPrice: {
    color: COLORS.success,
    fontWeight: "700",
  },
  netText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  logsTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 16,
    marginTop: 4,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  logMarker: {
    width: 16,
    alignItems: "center",
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  logLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.gray,
    marginTop: 2,
    minHeight: 34,
  },
  logContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  logText: {
    color: COLORS.text,
    fontSize: 14,
  },
  logMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  emptyLog: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  actionBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelSmallBtn: {
    alignSelf: "center",
    marginBottom: 8,
  },
  cancelSmallText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlayDark,
  },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  sheetTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 18,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
  },
  sheetBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  sheetBtnText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  completeError: {
    color: COLORS.danger,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.dark,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  inlineError: {
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 8,
    fontSize: 13,
  },
});
