import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTravelPlan } from "@/hooks/useTravelPlan";
import { LoadingScreen } from "@/components/LoadingScreen";
import { EmptyState } from "@/components/EmptyState";
import { TravelPlanStatusBadge } from "@/components/TravelPlanStatusBadge";
import { COLORS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/formatDate";

type PlanItem = { id: string; type: string; title: string; totalPrice: unknown };
type PayRow = { id: string; provider: string; status: string; amount: unknown; paidAt?: string | null };

export default function TravelPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plan, loading, error, reload } = useTravelPlan(id);

  if (loading) {
    return <LoadingScreen text="Sayohat rejasi..." />;
  }

  if (error || !plan) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom", "left", "right"]}>
        <EmptyState
          icon="⚠️"
          title={error ? "Xatolik" : "Topilmadi"}
          subtitle={error ?? "Sayohat rejasi mavjud emas"}
        />
      </SafeAreaView>
    );
  }

  const destination = typeof plan.destination === "string" ? plan.destination : "—";
  const startDate = plan.startDate ? formatDate(plan.startDate as string) : "";
  const endDate = plan.endDate ? formatDate(plan.endDate as string) : "";
  const status = String(plan.status ?? "");
  const total = Number(plan.totalAmount ?? 0);

  const items = (plan.items as PlanItem[] | undefined) ?? [];
  const hotelItems = items.filter((i) => i.type === "HOTEL");
  const hotelLinked = (plan.hotelBookingsLinked as Array<{
    id: string;
    hotel?: { name: string };
    roomType?: { name: string | null } | null;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: unknown;
    status: string;
  }>) ?? [];
  const homestays = (plan.homeStayBookings as Array<{
    id: string;
    listing?: { title: string };
    checkIn: string;
    checkOut: string;
    totalPrice: unknown;
    status: string;
  }>) ?? [];
  const taxis = (plan.taxiOrders as Array<{
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    estimatedPrice: unknown;
    status: string;
  }>) ?? [];
  const guides = (plan.guideBookings as Array<{
    id: string;
    listing?: { title: string };
    guide?: { first_name: string; last_name: string | null };
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: unknown;
    status: string;
  }>) ?? [];
  const payments = (plan.payments as PayRow[] | undefined) ?? [];

  const subHotelItems = hotelItems.reduce((s, i) => s + Number(i.totalPrice), 0);
  const subHotelLinked = hotelLinked.reduce((s, h) => s + Number(h.totalAmount), 0);
  const subHomestay = homestays.reduce((s, h) => s + Number(h.totalPrice), 0);
  const subTaxi = taxis.reduce((s, t) => s + Number(t.estimatedPrice), 0);
  const subGuide = guides.reduce((s, g) => s + Number(g.totalPrice), 0);

  const successPay = payments.find((p) => p.status === "SUCCESS");

  return (
    <SafeAreaView style={styles.safeWrap} edges={["bottom"]}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.dest}>{destination}</Text>
        <Text style={styles.dates}>
          {startDate} — {endDate}
        </Text>
        <View style={styles.badgeRow}>
          <TravelPlanStatusBadge status={status} />
        </View>
      </View>

      <Text style={styles.sec}>Mehmonxona</Text>
      {hotelItems.length === 0 && hotelLinked.length === 0 ? (
        <Text style={styles.muted}>Yo'q</Text>
      ) : (
        <>
          {hotelItems.map((i) => (
            <View key={i.id} style={styles.line}>
              <Text style={styles.lineT}>{i.title}</Text>
              <Text style={styles.lineP}>{formatPrice(Number(i.totalPrice))}</Text>
            </View>
          ))}
          {hotelLinked.map((h) => (
            <View key={h.id} style={styles.line}>
              <Text style={styles.lineT}>
                {h.hotel?.name ?? "Mehmonxona"} · {h.roomType?.name ?? ""}
              </Text>
              <Text style={styles.lineP}>{formatPrice(Number(h.totalAmount))}</Text>
            </View>
          ))}
          <Text style={styles.sub}>Jami: {formatPrice(subHotelItems + subHotelLinked)}</Text>
        </>
      )}

      <Text style={styles.sec}>Uy mehmonxonasi</Text>
      {homestays.length === 0 ? (
        <Text style={styles.muted}>Yo'q</Text>
      ) : (
        <>
          {homestays.map((b) => (
            <View key={b.id} style={styles.line}>
              <Text style={styles.lineT}>{b.listing?.title ?? "Listing"}</Text>
              <Text style={styles.lineP}>{formatPrice(Number(b.totalPrice))}</Text>
            </View>
          ))}
          <Text style={styles.sub}>Jami: {formatPrice(subHomestay)}</Text>
        </>
      )}

      <Text style={styles.sec}>Taxi</Text>
      {taxis.length === 0 ? (
        <Text style={styles.muted}>Yo'q</Text>
      ) : (
        <>
          {taxis.map((t) => (
            <View key={t.id} style={styles.line}>
              <Text style={styles.lineT} numberOfLines={2}>
                {t.pickupAddress} → {t.dropoffAddress}
              </Text>
              <Text style={styles.lineP}>{formatPrice(Number(t.estimatedPrice))}</Text>
            </View>
          ))}
          <Text style={styles.sub}>Jami: {formatPrice(subTaxi)}</Text>
        </>
      )}

      <Text style={styles.sec}>Ekskursiya</Text>
      {guides.length === 0 ? (
        <Text style={styles.muted}>Yo'q</Text>
      ) : (
        <>
          {guides.map((g) => (
            <View key={g.id} style={styles.line}>
              <Text style={styles.lineT} numberOfLines={2}>
                {g.listing?.title ?? "Qo'llanma"}{" "}
                {g.guide
                  ? `(${g.guide.first_name} ${g.guide.last_name ?? ""})`
                  : ""}
              </Text>
              <Text style={styles.lineP}>{formatPrice(Number(g.totalPrice))}</Text>
            </View>
          ))}
          <Text style={styles.sub}>Jami: {formatPrice(subGuide)}</Text>
        </>
      )}

      <View style={styles.totalBox}>
        <Text style={styles.totalLbl}>Jami</Text>
        <Text style={styles.totalVal}>{formatPrice(total)}</Text>
      </View>

      {status === "PENDING_PAYMENT" ? (
        <View style={styles.paySection}>
          <Text style={styles.payAmt}>{formatPrice(total)}</Text>
          <Pressable style={styles.payBtn} onPress={() => router.push(`/payment/${id}`)}>
            <Text style={styles.payBtnTxt}>To'lov qilish</Text>
          </Pressable>
        </View>
      ) : null}

      {status === "CONFIRMED" ? (
        <View style={styles.okBanner}>
          <Text style={styles.okTxt}>Tasdiqlandi</Text>
          {successPay ? (
            <Text style={styles.receipt}>
              To'lov: {successPay.provider} · {formatPrice(Number(successPay.amount))}
              {successPay.paidAt ? ` · ${formatDate(successPay.paidAt)}` : ""}
            </Text>
          ) : (
            <Text style={styles.receipt}>To'lov ma'lumotlari mavjud emas</Text>
          )}
        </View>
      ) : null}

      <Pressable style={styles.refresh} onPress={() => void reload()}>
        <Text style={styles.refreshTxt}>Yangilash</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center" },
  safeWrap: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  dest: { fontSize: 24, fontWeight: "900", color: COLORS.primary },
  dates: { marginTop: 6, fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },
  badgeRow: { marginTop: 10, alignSelf: "flex-start" },
  sec: { marginTop: 20, fontSize: 14, fontWeight: "900", color: COLORS.dark },
  muted: { color: COLORS.gray, marginTop: 6 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
    gap: 12,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  lineT: { flex: 1, fontSize: 14, fontWeight: "700", color: COLORS.text },
  lineP: { fontSize: 14, fontWeight: "900", color: COLORS.primary },
  sub: { marginTop: 6, fontSize: 14, fontWeight: "800", color: COLORS.textSecondary },
  totalBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLbl: { fontSize: 18, fontWeight: "900", color: COLORS.dark },
  totalVal: { fontSize: 20, fontWeight: "900", color: COLORS.primary },
  paySection: { marginTop: 20, alignItems: "center" },
  payAmt: { fontSize: 22, fontWeight: "900", color: COLORS.dark },
  payBtn: {
    marginTop: 12,
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  payBtnTxt: { fontWeight: "900", color: COLORS.dark, fontSize: 16 },
  okBanner: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.surfaceSuccess,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  okTxt: { fontSize: 18, fontWeight: "900", color: COLORS.success },
  receipt: { marginTop: 8, fontSize: 14, color: COLORS.dark, fontWeight: "600" },
  refresh: { marginTop: 24, alignSelf: "center", padding: 12 },
  refreshTxt: { color: COLORS.primaryLight, fontWeight: "800" },
});
