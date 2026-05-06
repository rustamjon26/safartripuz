import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function PaymentResultScreen() {
  const { paymentId, planId, provider } = useLocalSearchParams<{
    paymentId?: string;
    planId?: string;
    provider?: string;
  }>();

  return (
    <SafeAreaView style={styles.screen} edges={["bottom", "left", "right"]}>
      <Text style={styles.title}>So'rov qabul qilindi</Text>
      <Text style={styles.meta}>To'lov ID: {paymentId ?? "—"}</Text>
      {provider ? <Text style={styles.meta}>Usul: {provider}</Text> : null}
      <Text style={styles.hint}>
        {provider === "MANUAL"
          ? "Pul o'tkazgach, ma'muriyat tasdiqlashini kuting."
          : "Test rejimida to'lov holati keyinroq yangilanadi."}
      </Text>
      {planId ? (
        <Pressable style={styles.btn} onPress={() => router.replace(`/travel-plan/${planId}`)}>
          <Text style={styles.btnTxt}>Sayohat rejasi</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.btn} onPress={() => router.replace("/(tabs)/trips")}>
          <Text style={styles.btnTxt}>Sayohatlar</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  meta: { marginTop: 10, fontSize: 15, fontWeight: "700", color: COLORS.dark },
  hint: { marginTop: 16, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  btn: {
    marginTop: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
