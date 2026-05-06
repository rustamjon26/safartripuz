import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { API_BASE_URL, COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/formatDate";
import { LoadingScreen } from "@/components/LoadingScreen";

type Provider = "CLICK" | "PAYME" | "UZUM" | "MANUAL" | "MOCK";

const showMock = __DEV__;

const PROVIDER_UI: {
  id: Provider;
  label: string;
  icon: string;
}[] = [
  { id: "CLICK", label: "Click", icon: "💳" },
  { id: "PAYME", label: "Payme", icon: "💳" },
  { id: "UZUM", label: "Uzum", icon: "🏦" },
  { id: "MANUAL", label: "Qo'lda o'tkazma", icon: "📋" },
  { id: "MOCK", label: "Test (MOCK)", icon: "🧪" },
];

function absolutePaymentUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export default function PaymentScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [total, setTotal] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [manual, setManual] = useState<{ cardNumber: string; cardHolder: string } | null>(null);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!planId) return;
    setLoadingPlan(true);
    setErr(null);
    try {
      const plan = (await api.get(`/api/travel-plans/${planId}`)) as {
        totalAmount: unknown;
        status: string;
      };
      setPlanStatus(plan.status);
      setTotal(Number(plan.totalAmount));
      const [pRes, mRes] = await Promise.all([
        api.get("/api/payments/providers") as Promise<{ providers: Provider[] }>,
        api.get("/api/payments/manual-info") as Promise<{ cardNumber: string; cardHolder: string }>,
      ]);
      const fromApi = Array.isArray(pRes.providers) ? pRes.providers : [];
      const realProviders = (fromApi as Provider[]).filter((p) => p !== "MOCK");
      const merged: Provider[] = showMock ? [...realProviders, "MOCK"] : realProviders;
      const providersList: Provider[] =
        merged.length > 0 ? merged : showMock ? ["MOCK", "MANUAL"] : ["MANUAL"];
      setProviders(providersList);
      setManual(mRes);
      const first = providersList[0];
      if (first) setSelected(first);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoadingPlan(false);
    }
  }, [planId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay() {
    if (!planId || !selected) return;
    setPaying(true);
    setErr(null);
    try {
      const res = (await api.post("/api/payments/create", {
        planId,
        provider: selected,
      })) as { paymentId?: string; paymentUrl?: string; error?: string };
      if (res.error) throw new Error(res.error);
      const url = res.paymentUrl ?? "";
      const pid = res.paymentId ?? "";
      if (selected === "MANUAL" || selected === "MOCK") {
        router.replace({
          pathname: "/payment/result",
          params: { paymentId: pid, planId, provider: selected },
        });
        return;
      }
      if (url) {
        const open = absolutePaymentUrl(url);
        const can = await Linking.canOpenURL(open);
        if (can) await Linking.openURL(open);
        else throw new Error("URL ochilmadi");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "To'lovda xato");
    } finally {
      setPaying(false);
    }
  }

  if (loadingPlan) {
    return <LoadingScreen text="To'lov..." />;
  }

  if (planStatus && planStatus !== "PENDING_PAYMENT") {
    return (
      <SafeAreaView style={styles.center} edges={["bottom", "left", "right"]}>
        <Text style={styles.blockTxt}>Bu reja uchun to'lov talab qilinmaydi yoki allaqachon yakunlangan.</Text>
        <Pressable style={styles.blockBtn} onPress={() => router.back()}>
          <Text style={styles.blockBtnTxt}>Orqaga</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const visibleProviders = PROVIDER_UI.filter((p) => providers.includes(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>To'lov</Text>
      {total != null ? (
        <Text style={styles.total}>{formatPrice(total)}</Text>
      ) : null}
      {err ? <Text style={styles.err}>{err}</Text> : null}

      {selected === "MANUAL" && manual ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualLbl}>Karta raqami</Text>
          <Text style={styles.manualVal}>{manual.cardNumber}</Text>
          <Text style={styles.manualLbl}>Karta egasi</Text>
          <Text style={styles.manualVal}>{manual.cardHolder}</Text>
        </View>
      ) : null}

      <Text style={styles.sec}>To'lov usuli</Text>
      <View style={styles.grid}>
        {visibleProviders.map((p) => {
          const on = selected === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.card, on && styles.cardOn]}
              onPress={() => setSelected(p.id)}
            >
              <Text style={styles.icon}>{p.icon}</Text>
              <Text style={[styles.cardLbl, on && styles.cardLblOn]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.payBtn, (!selected || paying) && { opacity: 0.6 }]}
        disabled={!selected || paying}
        onPress={() => void pay()}
      >
        {paying ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.payTxt}>To'lash</Text>
        )}
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
  h1: { fontSize: 22, fontWeight: "900", color: COLORS.primary },
  total: { fontSize: 28, fontWeight: "900", color: COLORS.dark, marginTop: 8 },
  err: { color: COLORS.danger, fontWeight: "700", marginTop: 10 },
  manualBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  manualLbl: { fontSize: 12, fontWeight: "800", color: COLORS.gray, marginTop: 8 },
  manualVal: { fontSize: 16, fontWeight: "800", color: COLORS.dark },
  sec: { marginTop: 22, fontSize: 15, fontWeight: "900", color: COLORS.dark },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  card: {
    width: "47%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    alignItems: "center",
  },
  cardOn: { borderColor: COLORS.primary, backgroundColor: COLORS.chipSelected },
  icon: { fontSize: 28, marginBottom: 6 },
  cardLbl: { fontWeight: "800", color: COLORS.textSecondary, textAlign: "center" },
  cardLblOn: { color: COLORS.primary },
  payBtn: {
    marginTop: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  payTxt: { color: COLORS.white, fontWeight: "900", fontSize: 17 },
  blockTxt: { textAlign: "center", color: COLORS.textSecondary, fontSize: 16, paddingHorizontal: 24 },
  blockBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  blockBtnTxt: { color: COLORS.white, fontWeight: "900" },
});
