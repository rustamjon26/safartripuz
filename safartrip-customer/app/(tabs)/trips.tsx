import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { TravelPlanStatusBadge } from "@/components/TravelPlanStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { formatDate, formatPrice } from "@/lib/formatDate";

type PlanRow = {
  id: string;
  destination: unknown;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: unknown;
  createdAt: string;
  items: { id: string }[];
  _count?: { homeStayBookings: number; taxiOrders: number; guideBookings: number };
};

type ListRes = { items: PlanRow[]; total: number };

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = (await api.get("/api/travel-plans?take=50")) as ListRes;
      setItems(res.items ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setListError(null);
    try {
      const res = (await api.get("/api/travel-plans?take=50")) as ListRes;
      setItems(res.items ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
    } finally {
      setRefreshing(false);
    }
  }, []);

  function bookingCount(p: PlanRow) {
    const c = p._count;
    const extra = (c?.homeStayBookings ?? 0) + (c?.taxiOrders ?? 0) + (c?.guideBookings ?? 0);
    return (p.items?.length ?? 0) + extra;
  }

  function renderItem({ item }: { item: PlanRow }) {
    const dest = typeof item.destination === "string" ? item.destination : "Sayohat";
    const pending = item.status === "PENDING_PAYMENT";
    const confirmed = item.status === "CONFIRMED";
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/travel-plan/${item.id}`)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {dest}
          </Text>
          <TravelPlanStatusBadge status={item.status} />
        </View>
        <Text style={styles.cardMeta}>
          {formatDate(item.startDate)} — {formatDate(item.endDate)}
        </Text>
        <Text style={styles.cardMeta}>Yaratilgan: {formatDate(item.createdAt)}</Text>
        <Text style={styles.price}>{formatPrice(Number(item.totalAmount))}</Text>
        <Text style={styles.count}>{bookingCount(item)} ta bron / band</Text>
        {pending ? (
          <View style={styles.bannerAmber}>
            <Text style={styles.bannerAmberTxt}>To'lov kutilmoqda</Text>
          </View>
        ) : null}
        {confirmed ? (
          <View style={styles.bannerGreen}>
            <Text style={styles.bannerGreenTxt}>Tasdiqlandi</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {listError ? <Text style={styles.inlineErr}>{listError}</Text> : null}
      {loading && items.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="🗺" title="Hali sayohat rejangiz yo'q" subtitle="Bosh sahifadan yangi reja yarating" />
            )
          }
        />
      )}
      <Pressable
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push("/hotel")}
      >
        <Ionicons name="add" size={32} color={COLORS.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  inlineErr: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceDanger,
    color: COLORS.danger,
    fontWeight: "700",
  },
  list: { padding: 16, paddingTop: 8 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: "900", color: COLORS.primary },
  cardMeta: { marginTop: 6, fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  price: { marginTop: 10, fontSize: 17, fontWeight: "900", color: COLORS.dark },
  count: { marginTop: 4, fontSize: 13, color: COLORS.gray, fontWeight: "700" },
  bannerAmber: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceWarning,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  bannerAmberTxt: { fontWeight: "900", color: COLORS.warning, textAlign: "center" },
  bannerGreen: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSuccess,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  bannerGreenTxt: { fontWeight: "900", color: COLORS.success, textAlign: "center" },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
