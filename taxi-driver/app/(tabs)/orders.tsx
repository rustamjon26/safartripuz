import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OrderCard, type DriverOrder } from "@/components/OrderCard";
import { COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { useOrders } from "@/hooks/useOrders";
import { api } from "@/lib/api";

type TabType = "active" | "history";

export default function OrdersScreen() {
  const [tab, setTab] = useState<TabType>("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeModal, setCompleteModal] = useState<{
    visible: boolean;
    order: DriverOrder | null;
  }>({ visible: false, order: null });
  const [finalPrice, setFinalPrice] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeHook = useOrders({
    status: "PENDING,ACCEPTED,ARRIVED,IN_PROGRESS",
  });
  const historyHook = useOrders({ status: "COMPLETED,CANCELLED" });
  const current = tab === "active" ? activeHook : historyHook;

  const isRefreshing = current.isLoading && current.orders.length > 0;

  const activeStatuses = useMemo(
    () => new Set(["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"]),
    [],
  );

  function mapAction(status: string): "accept" | "arrive" | "start" | "complete" | "cancel" | null {
    if (status === "PENDING") return "accept";
    if (status === "ACCEPTED") return "arrive";
    if (status === "ARRIVED") return "start";
    if (status === "IN_PROGRESS") return "complete";
    return null;
  }

  async function patchOrder(
    id: string,
    action: "accept" | "arrive" | "start" | "complete" | "cancel",
    payload?: { finalPrice?: number; distanceKm?: number },
  ) {
    setActionError(null);
    try {
      await api.patch(`/api/taxi/driver/orders/${id}`, { action, ...payload });
      await Promise.all([activeHook.refetch(), historyHook.refetch()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Buyurtma holati yangilanmadi");
    }
  }

  async function handleAction(order: DriverOrder) {
    const action = mapAction(order.status);
    if (!action) return;
    if (action === "complete") {
      setFinalPrice(String(order.estimatedPrice ?? ""));
      setDistanceKm("");
      setModalError(null);
      setCompleteModal({ visible: true, order });
      return;
    }
    await patchOrder(order.id, action);
  }

  async function submitComplete() {
    if (!completeModal.order) return;
    const final = Number(finalPrice);
    const distance = Number(distanceKm);
    if (!finalPrice || !distanceKm || Number.isNaN(final) || Number.isNaN(distance) || final <= 0 || distance <= 0) {
      setModalError("Qiymat va masofa 0 dan katta son bo'lishi kerak");
      return;
    }
    setIsSubmitting(true);
    try {
      await patchOrder(completeModal.order.id, "complete", {
        finalPrice: final,
        distanceKm: distance,
      });
      setCompleteModal({ visible: false, order: null });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <View style={styles.screen}>
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.tabButton, tab === "active" && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Faol</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("history")}
          style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Tarix</Text>
        </Pressable>
      </View>

      {tab === "active" ? (
        <FlatList
          data={activeHook.orders.filter((o) => activeStatuses.has(o.status))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push(`/orders/${item.id}`)}
              onAction={handleAction}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void activeHook.refetch()} />
          }
          ListEmptyComponent={
            !activeHook.isLoading ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="local-taxi" size={38} color={COLORS.gray} />
                <Text style={styles.emptyText}>Faol buyurtmalar yo'q</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={historyHook.orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/orders/${item.id}`)}
              style={({ pressed }) => [styles.historyCard, pressed && styles.cardPressed]}
            >
              <View style={styles.historyTop}>
                <Text style={styles.historyDate}>
                  {item.date ?? item.createdAt?.slice(0, 10) ?? "-"}
                </Text>
                <StatusBadge status={item.status} size="sm" />
              </View>
              <Text style={styles.historyRoute}>
                {item.pickupAddress ?? "-"} {"->"} {item.dropoffAddress ?? "-"}
              </Text>
              <Text style={styles.historyPrice}>
                {Number(item.estimatedPrice ?? 0).toLocaleString()} so'm
              </Text>
            </Pressable>
          )}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (historyHook.hasMore) void historyHook.loadMore();
          }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void historyHook.refetch()} />
          }
          ListEmptyComponent={
            !historyHook.isLoading ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="history" size={38} color={COLORS.gray} />
                <Text style={styles.emptyText}>Tarix bo'sh</Text>
              </View>
            ) : null
          }
        />
      )}
      {current.error ? <Text style={styles.screenError}>{current.error}</Text> : null}
      {actionError ? <Text style={styles.screenError}>{actionError}</Text> : null}

      <Modal
        visible={completeModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModal({ visible: false, order: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reysni yakunlash</Text>
            <TextInput
              style={styles.input}
              value={finalPrice}
              onChangeText={setFinalPrice}
              placeholder="Yakuniy narx"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={distanceKm}
              onChangeText={setDistanceKm}
              placeholder="Masofa (km)"
              keyboardType="numeric"
            />
            {modalError ? <Text style={styles.error}>{modalError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setCompleteModal({ visible: false, order: null })}
              >
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, isSubmitting && styles.disabled]}
                onPress={() => void submitComplete()}
                disabled={isSubmitting}
              >
                <Text style={styles.submitText}>Yakunlash</Text>
              </Pressable>
            </View>
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    margin: 12,
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 10,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.95,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyDate: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  historyRoute: {
    color: COLORS.text,
    fontSize: 14,
  },
  historyPrice: {
    color: COLORS.dark,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 18,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  submitText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.7,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
  },
  screenError: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
});
