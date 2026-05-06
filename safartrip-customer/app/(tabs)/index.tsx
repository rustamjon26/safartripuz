import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@/hooks/useUser";
import { api, AuthRedirectError } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/formatDate";
import { TravelPlanStatusBadge } from "@/components/TravelPlanStatusBadge";
import { LoadingScreen } from "@/components/LoadingScreen";

type TravelPlanRow = {
  id: string;
  destination: unknown;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
};

type TravelPlansResponse = {
  items: TravelPlanRow[];
  total?: number;
};

const ACTIVE_STATUSES = new Set(["PENDING_PAYMENT", "CONFIRMED"]);

function destinationLabel(v: unknown): string {
  if (typeof v === "string" && v.trim()) return v;
  if (v && typeof v === "object" && "name" in v && typeof (v as { name: unknown }).name === "string") {
    return (v as { name: string }).name;
  }
  return "—";
}

const SERVICE_CARDS = [
  { key: "hotel", icon: "🏨", label: "Mehmonxona", path: "/hotel" as const },
  { key: "homestay", icon: "🏠", label: "Uy mehmonxona", path: "/homestay" as const },
  { key: "taxi", icon: "🚕", label: "Taxi", path: "/taxi" as const },
  { key: "guide", icon: "🧭", label: "Ekskursiya", path: "/guide" as const },
];

export default function ExploreHomeScreen() {
  const searchRef = useRef<TextInput>(null);
  const { user, isLoading: userLoading, refetch: refetchUser } = useUser();
  const [search, setSearch] = useState("");
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [items, setItems] = useState<TravelPlanRow[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async () => {
    setPlansError(null);
    setPlansLoading(true);
    try {
      const data = (await api.get("/api/travel-plans?take=30")) as TravelPlansResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (e instanceof AuthRedirectError) {
        setPlansError(null);
      } else {
        setPlansError(e instanceof Error ? e.message : "Xato");
      }
      setItems([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUser(), loadPlans()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPlans, refetchUser]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const activePlan = useMemo(
    () => items.find((p) => ACTIVE_STATUSES.has(p.status)) ?? null,
    [items],
  );

  if (userLoading && !user) {
    return <LoadingScreen text="Yuklanmoqda..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.greeting} numberOfLines={1}>
          Salom, {user?.first_name ?? "mehmon"}! 👋
        </Text>
        <Pressable onPress={() => searchRef.current?.focus()} hitSlop={12} style={styles.searchIcon}>
          <Ionicons name="search-outline" size={26} color={COLORS.primary} />
        </Pressable>
      </View>

      <TextInput
        ref={searchRef}
        style={styles.searchBar}
        placeholder="Shahar, mehmonxona yoki xizmat..."
        placeholderTextColor={COLORS.gray}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        onSubmitEditing={() => {
          const q = search.trim();
          if (!q) return;
          router.push({ pathname: "/hotel", params: { q } });
        }}
      />

      <Text style={styles.sectionTitle}>Xizmat kategoriyalari</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {SERVICE_CARDS.map((c) => (
          <Pressable
            key={c.key}
            style={styles.catCard}
            onPress={() => router.push(c.path)}
          >
            <Text style={styles.catEmoji}>{c.icon}</Text>
            <Text style={styles.catLabel}>{c.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Faol sayohatingiz</Text>
      {plansLoading ? (
        <Text style={styles.muted}>Yuklanmoqda...</Text>
      ) : plansError ? (
        <View style={styles.errBox}>
          <Text style={styles.err}>{plansError}</Text>
          <Pressable
            style={styles.retryBtn}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            onPress={() => void loadPlans()}
          >
            <Text style={styles.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : activePlan ? (
        <View style={styles.planCard}>
          <Text style={styles.planDest}>{destinationLabel(activePlan.destination)}</Text>
          <Text style={styles.planDates}>
            {formatDate(activePlan.startDate)} — {formatDate(activePlan.endDate)}
          </Text>
          <View style={styles.planRow}>
            <TravelPlanStatusBadge status={activePlan.status} />
            <Text style={styles.planPrice}>{formatPrice(Number(activePlan.totalAmount) || 0)}</Text>
          </View>
          <Pressable
            style={styles.planBtn}
            onPress={() => router.push(`/travel-plan/${activePlan.id}`)}
          >
            <Text style={styles.planBtnText}>Ko'rish</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/trips")}>
          <Text style={styles.ctaText}>Yangi sayohat rejalashtiring</Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Tezkor buyurtma</Text>
      <View style={styles.taxiBox}>
        <Text style={styles.taxiHint}>Taxi</Text>
        <TextInput
          style={styles.input}
          placeholder="Qayerdan?"
          placeholderTextColor={COLORS.gray}
          value={pickup}
          onChangeText={setPickup}
        />
        <TextInput
          style={styles.input}
          placeholder="Qayerga?"
          placeholderTextColor={COLORS.gray}
          value={dropoff}
          onChangeText={setDropoff}
        />
        <Pressable
          style={styles.orderBtn}
          onPress={() =>
            router.push({
              pathname: "/taxi",
              params: {
                pickup: pickup.trim(),
                dropoff: dropoff.trim(),
              },
            })
          }
        >
          <Text style={styles.orderBtnText}>Buyurtma</Text>
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  greeting: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
    marginRight: 8,
  },
  searchIcon: {
    padding: 4,
  },
  searchBar: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.dark,
    marginBottom: 12,
  },
  catRow: {
    gap: 12,
    paddingBottom: 8,
    marginBottom: 20,
  },
  catCard: {
    width: 132,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: "center",
  },
  catEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  muted: {
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  err: {
    color: COLORS.danger,
    fontWeight: "600",
    marginBottom: 8,
  },
  errBox: {
    backgroundColor: COLORS.surfaceDanger,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: 8,
  },
  planDest: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.primary,
  },
  planDates: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.dark,
  },
  planBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  planBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
  cta: {
    backgroundColor: COLORS.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  ctaText: {
    fontWeight: "900",
    fontSize: 15,
    color: COLORS.dark,
  },
  taxiBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  taxiHint: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 10,
  },
  orderBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  orderBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
});
