import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS, PAYMENT_PROVIDER_STYLES } from "@/lib/constants";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate, formatDateTime, formatPrice } from "@/lib/formatDate";

type PaymentRow = {
  id: string;
  provider: string;
  status: string;
  amount: unknown;
  currency?: string;
  paidAt?: string | null;
  createdAt: string;
  travelPlan?: {
    destination: unknown;
    tourPackage?: { title: string | null } | null;
  } | null;
};

function providerStyle(provider: string) {
  const p = provider.toUpperCase();
  return PAYMENT_PROVIDER_STYLES[p] ?? {
    bg: COLORS.lightGray,
    fg: COLORS.dark,
    label: provider,
  };
}

export default function ProfilePaymentsScreen() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const raw = await api.get("/api/user/payments");
      const list = Array.isArray(raw) ? raw : [];
      setItems(list as PaymentRow[]);
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
      const raw = await api.get("/api/user/payments");
      const list = Array.isArray(raw) ? raw : [];
      setItems(list as PaymentRow[]);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
    } finally {
      setRefreshing(false);
    }
  }, []);

  function planSummary(p: PaymentRow) {
    const d = p.travelPlan?.destination;
    if (typeof d === "string" && d) return d;
    const t = p.travelPlan?.tourPackage?.title;
    if (t) return t;
    return "Sayohat rejasi";
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {listError ? <Text style={styles.inlineErr}>{listError}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="💳" title="To'lovlar yo'q" subtitle="Hali tranzaksiyalar qayd etilmagan" />
          )
        }
        renderItem={({ item }) => {
          const ps = providerStyle(item.provider);
          return (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.amount}>{formatPrice(Number(item.amount))}</Text>
              </View>
              <View style={styles.badges}>
                <View style={[styles.pBadge, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.pTxt, { color: ps.fg }]}>{ps.label}</Text>
                </View>
                <PaymentStatusBadge status={item.status} />
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={Boolean(selected)} transparent animationType="slide">
        <View style={styles.sheetWrap}>
          <TouchableWithoutFeedback onPress={() => setSelected(null)}>
            <View style={styles.sheetFlex} />
          </TouchableWithoutFeedback>
          <View style={styles.sheet}>
            {selected ? (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>To'lov</Text>
                <Text style={styles.sheetRow}>
                  <Text style={styles.sheetLbl}>ID: </Text>
                  {selected.id}
                </Text>
                <Text style={styles.sheetRow}>
                  <Text style={styles.sheetLbl}>Reja: </Text>
                  {planSummary(selected)}
                </Text>
                <Text style={styles.sheetRow}>
                  <Text style={styles.sheetLbl}>Provayder: </Text>
                  {providerStyle(selected.provider).label}
                </Text>
                <Text style={styles.sheetRow}>
                  <Text style={styles.sheetLbl}>Summa: </Text>
                  {formatPrice(Number(selected.amount))}
                </Text>
                <View style={styles.sheetBadgeRow}>
                  <Text style={styles.sheetLbl}>Holat: </Text>
                  <PaymentStatusBadge status={selected.status} />
                </View>
                <Text style={styles.sheetRow}>
                  <Text style={styles.sheetLbl}>To'langan: </Text>
                  {selected.paidAt ? formatDateTime(selected.paidAt) : "—"}
                </Text>
                <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.closeTxt}>Yopish</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
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
  },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  amount: { fontSize: 16, fontWeight: "900", color: COLORS.primary },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" },
  pBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pTxt: { fontSize: 12, fontWeight: "900" },
  sheetWrap: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheetFlex: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lightGray,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: COLORS.primary, marginBottom: 14 },
  sheetRow: { fontSize: 15, color: COLORS.text, marginBottom: 10, lineHeight: 22 },
  sheetLbl: { fontWeight: "800", color: COLORS.textSecondary },
  sheetBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  closeTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
