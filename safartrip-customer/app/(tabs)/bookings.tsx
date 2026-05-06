import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { BookingCard } from "@/components/BookingCard";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { ReviewForm } from "@/components/ReviewForm";
import { formatDate, formatPrice } from "@/lib/formatDate";

type TabKey = "hotel" | "homestay" | "taxi" | "guide";

type HotelBookingRow = {
  id: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: unknown;
  hotel?: { name: string };
  roomType?: { name: string | null } | null;
};

type HomestayBookingRow = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: unknown;
  review?: { id: string } | null;
  listing?: { title: string };
};

type TaxiOrderRow = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
  estimatedPrice: unknown;
};

type GuideBookingRow = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: unknown;
  review?: { id: string } | null;
  listing?: { title: string };
  guide?: { first_name: string; last_name: string | null };
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "hotel", label: "Mehmonxona" },
  { key: "homestay", label: "Uy" },
  { key: "taxi", label: "Taxi" },
  { key: "guide", label: "Ekskursiya" },
];

function unwrapList<T>(raw: unknown): T[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.data)) return o.data as T[];
  const inner = o.data as Record<string, unknown> | undefined;
  if (inner && Array.isArray(inner.data)) return inner.data as T[];
  return [];
}

export default function BookingsScreen() {
  const [tab, setTab] = useState<TabKey>("hotel");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<Record<TabKey, boolean>>({
    hotel: false,
    homestay: false,
    taxi: false,
    guide: false,
  });
  const [listError, setListError] = useState<string | null>(null);
  const [hotelRows, setHotelRows] = useState<HotelBookingRow[]>([]);
  const [homestayRows, setHomestayRows] = useState<HomestayBookingRow[]>([]);
  const [taxiRows, setTaxiRows] = useState<TaxiOrderRow[]>([]);
  const [guideRows, setGuideRows] = useState<GuideBookingRow[]>([]);
  const [reviewOpen, setReviewOpen] = useState<{ kind: "homestay" | "guide"; id: string } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchTab = useCallback(async (showMainLoader: boolean) => {
    if (showMainLoader) setLoading(true);
    setListError(null);
    try {
      if (tab === "hotel") {
        const res = (await api.get("/api/user/hotel-bookings")) as { data: HotelBookingRow[] };
        setHotelRows(Array.isArray(res.data) ? res.data : []);
      } else if (tab === "homestay") {
        const res = await api.get("/api/homestay/bookings");
        setHomestayRows(unwrapList<HomestayBookingRow>(res));
      } else if (tab === "taxi") {
        const res = await api.get("/api/taxi/orders?limit=50");
        setTaxiRows(unwrapList<TaxiOrderRow>(res));
      } else {
        const res = await api.get("/api/guide/bookings?limit=50");
        setGuideRows(unwrapList<GuideBookingRow>(res));
      }
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
      if (tab === "hotel") setHotelRows([]);
      if (tab === "homestay") setHomestayRows([]);
      if (tab === "taxi") setTaxiRows([]);
      if (tab === "guide") setGuideRows([]);
    } finally {
      if (showMainLoader) setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchTab(true);
  }, [fetchTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing((r) => ({ ...r, [tab]: true }));
    try {
      await fetchTab(false);
    } finally {
      setRefreshing((r) => ({ ...r, [tab]: false }));
    }
  }, [fetchTab, tab]);

  const listData = useMemo(() => {
    if (tab === "hotel") return hotelRows;
    if (tab === "homestay") return homestayRows;
    if (tab === "taxi") return taxiRows;
    return guideRows;
  }, [tab, hotelRows, homestayRows, taxiRows, guideRows]);

  async function cancelHotel(id: string) {
    Alert.alert("Bekor qilish", "Mehmonxona bronini bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/api/user/hotel-bookings/${id}`, { action: "cancel" });
            await fetchTab(false);
          } catch (e) {
            Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
          }
        },
      },
    ]);
  }

  async function cancelHomestay(id: string) {
    Alert.alert("Bekor qilish", "Uy mehmonxonasi bronini bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/api/homestay/bookings/${id}`, { cancellationReason: "Mijoz bekor qildi" });
            await fetchTab(false);
          } catch (e) {
            Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
          }
        },
      },
    ]);
  }

  async function cancelGuide(id: string) {
    Alert.alert("Bekor qilish", "Ekskursiya bronini bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          try {
            await api.patch(`/api/guide/bookings/${id}`, { cancellationReason: "Mijoz bekor qildi" });
            await fetchTab(false);
          } catch (e) {
            Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
          }
        },
      },
    ]);
  }

  async function submitReview(rating: number, comment: string) {
    if (!reviewOpen) return;
    setReviewSubmitting(true);
    try {
      if (reviewOpen.kind === "homestay") {
        await api.post(`/api/homestay/bookings/${reviewOpen.id}/review`, {
          rating,
          comment: comment || undefined,
        });
      } else {
        await api.post(`/api/guide/bookings/${reviewOpen.id}/review`, {
          rating,
          comment: comment || undefined,
        });
      }
      setReviewOpen(null);
      await fetchTab(false);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Xato");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function renderItem({ item }: { item: unknown }) {
    if (tab === "hotel") {
      const b = item as HotelBookingRow;
      const room = b.roomType?.name ?? "Xona";
      return (
        <BookingCard
          title={b.hotel?.name ?? "Mehmonxona"}
          subtitle={room}
          date={`${formatDate(b.checkInDate)} — ${formatDate(b.checkOutDate)}`}
          price={formatPrice(Number(b.totalAmount))}
          status={b.status}
          onCancel={b.status === "PENDING" ? () => void cancelHotel(b.id) : undefined}
        />
      );
    }
    if (tab === "homestay") {
      const b = item as HomestayBookingRow;
      return (
        <BookingCard
          title={b.listing?.title ?? "Uy mehmonxonasi"}
          subtitle={`${b.nights} tun`}
          date={`${formatDate(b.checkIn)} — ${formatDate(b.checkOut)}`}
          price={formatPrice(Number(b.totalPrice))}
          status={b.status}
          onCancel={["PENDING", "CONFIRMED"].includes(b.status) ? () => void cancelHomestay(b.id) : undefined}
          onReview={
            b.status === "COMPLETED" && !b.review
              ? () => {
                  setReviewOpen({ kind: "homestay", id: b.id });
                }
              : undefined
          }
        />
      );
    }
    if (tab === "taxi") {
      const o = item as TaxiOrderRow;
      return (
        <BookingCard
          title={`${o.pickupAddress} →`}
          subtitle={o.dropoffAddress}
          date={formatDate(o.createdAt)}
          price={formatPrice(Number(o.estimatedPrice))}
          status={o.status}
          statusVariant="taxi"
          onPress={() => router.push(`/taxi/${o.id}`)}
        />
      );
    }
    const g = item as GuideBookingRow;
    const gname = g.guide
      ? `${g.guide.first_name} ${g.guide.last_name ?? ""}`.trim()
      : "Qo'llanma";
    return (
      <BookingCard
        title={g.listing?.title ?? "Ekskursiya"}
        subtitle={`${gname} · ${g.startTime}–${g.endTime} · ${g.hours} soat · ${g.groupSize} kishi`}
        date={formatDate(g.date)}
        price={formatPrice(Number(g.totalPrice))}
        status={g.status}
        onCancel={["PENDING", "CONFIRMED"].includes(g.status) ? () => void cancelGuide(g.id) : undefined}
        onReview={
          g.status === "COMPLETED" && !g.review
            ? () => {
                setReviewOpen({ kind: "guide", id: g.id });
              }
            : undefined
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {listError ? <Text style={styles.inlineErr}>{listError}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} style={[styles.tab, on && styles.tabOn]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabTxt, on && styles.tabTxtOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && listData.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : (
        <FlatList
          data={listData as Array<{ id: string }>}
          keyExtractor={(row) => row.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing[tab]} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="📅" title="Hozircha bronlar yo'q" subtitle="Yangi xizmatlar bron qiling" />
            )
          }
        />
      )}

      <Modal visible={Boolean(reviewOpen)} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setReviewOpen(null)}>
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              <ReviewForm
                key={reviewOpen ? `${reviewOpen.kind}-${reviewOpen.id}` : "closed"}
                plain
                isLoading={reviewSubmitting}
                onSubmit={(rating, comment) => void submitReview(rating, comment)}
              />
              <Pressable style={styles.modalBtnGhostOnly} onPress={() => setReviewOpen(null)}>
                <Text style={styles.modalBtnGhostTxt}>Bekor</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    overflow: "hidden",
  },
  tabs: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  tabOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabTxt: { fontWeight: "800", color: COLORS.textSecondary, fontSize: 14 },
  tabTxtOn: { color: COLORS.white },
  list: { padding: 16, paddingBottom: 32 },
  modalBg: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
  },
  modalBtnGhostOnly: { marginTop: 12, alignSelf: "center", paddingVertical: 8 },
  modalBtnGhostTxt: { fontWeight: "800", color: COLORS.gray },
});
