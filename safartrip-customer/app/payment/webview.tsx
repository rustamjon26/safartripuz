import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { API_BASE_URL, COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/formatDate";

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export default function PaymentWebViewScreen() {
  const { paymentUrl, paymentId, planId, bookingId, totalAmount } =
    useLocalSearchParams<{
      paymentUrl?: string;
      paymentId?: string;
      planId?: string;
      bookingId?: string;
      totalAmount?: string;
    }>();

  const [confirming, setConfirming] = useState(false);

  async function confirmMockPayment() {
    if (!paymentId) {
      Alert.alert("Xato", "To'lov ID topilmadi");
      return;
    }
    setConfirming(true);
    try {
      await api.post(`/api/payments/webhook/mock/${paymentId}`);
      router.replace({
        pathname: "/payment/success",
        params: {
          paymentId,
          planId: planId ?? "",
          bookingId: bookingId ?? "",
          totalAmount: totalAmount ?? "",
        },
      });
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "To'lov tasdiqlanmadi");
    } finally {
      setConfirming(false);
    }
  }

  const amountNum = Number(totalAmount ?? 0);
  const mockPageUrl = paymentUrl ? absoluteUrl(paymentUrl) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <View style={styles.card}>
        <Text style={styles.icon}>💳</Text>
        <Text style={styles.title}>To&apos;lovni tasdiqlash</Text>
        <Text style={styles.sub}>
          Test rejimida (MOCK) to&apos;lovni tasdiqlash uchun quyidagi tugmani bosing.
        </Text>
        {amountNum > 0 ? (
          <Text style={styles.amount}>{formatPrice(amountNum)}</Text>
        ) : null}
        {mockPageUrl ? (
          <Text style={styles.urlHint} numberOfLines={2}>
            {mockPageUrl}
          </Text>
        ) : null}
        <Pressable
          style={[styles.btn, confirming && { opacity: 0.7 }]}
          disabled={confirming}
          onPress={() => void confirmMockPayment()}
        >
          {confirming ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnTxt}>To&apos;lovni tasdiqlash</Text>
          )}
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelTxt}>Bekor qilish</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: "center",
  },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "900", color: COLORS.primary, textAlign: "center" },
  sub: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  amount: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.dark,
  },
  urlHint: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "center",
  },
  btn: {
    marginTop: 24,
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  cancelBtn: { marginTop: 14, paddingVertical: 8 },
  cancelTxt: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 14 },
});
