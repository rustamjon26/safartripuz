import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/formatDate";

export default function BookingSuccessScreen() {
  const { paymentId, planId, bookingId, totalAmount } = useLocalSearchParams<{
    paymentId?: string;
    planId?: string;
    bookingId?: string;
    totalAmount?: string;
  }>();

  const amountNum = Number(totalAmount ?? 0);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Bron tasdiqlandi!</Text>
      <Text style={styles.hint}>To&apos;lov muvaffaqiyatli amalga oshirildi.</Text>
      {amountNum > 0 ? (
        <Text style={styles.amount}>{formatPrice(amountNum)}</Text>
      ) : null}
      {bookingId ? <Text style={styles.meta}>Bron ID: {bookingId}</Text> : null}
      {paymentId ? <Text style={styles.meta}>To&apos;lov ID: {paymentId}</Text> : null}
      {planId ? (
        <Pressable style={styles.btn} onPress={() => router.replace(`/travel-plan/${planId}`)}>
          <Text style={styles.btnTxt}>Sayohat rejasi</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.btnSecondary} onPress={() => router.replace("/(tabs)/bookings")}>
        <Text style={styles.btnSecondaryTxt}>Bronlarim</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 56 },
  title: { marginTop: 12, fontSize: 24, fontWeight: "900", color: COLORS.primary },
  hint: { marginTop: 10, fontSize: 15, color: COLORS.textSecondary, textAlign: "center" },
  amount: { marginTop: 16, fontSize: 26, fontWeight: "900", color: COLORS.dark },
  meta: { marginTop: 8, fontSize: 13, fontWeight: "700", color: COLORS.gray },
  btn: {
    marginTop: 28,
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  btnSecondary: {
    marginTop: 12,
    alignSelf: "stretch",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnSecondaryTxt: { color: COLORS.primary, fontWeight: "900", fontSize: 16 },
});
