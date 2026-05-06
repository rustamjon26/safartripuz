import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { StatCard } from "@/components/StatCard";
import { COLORS } from "@/lib/constants";
import { useDriver } from "@/hooks/useDriver";
import { useActiveOrder } from "@/hooks/useActiveOrder";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function DashboardScreen() {
  const {
    profile,
    isLoading: driverLoading,
    error,
    refetch: refetchDriver,
    isOnline,
    toggleOnline,
    isToggling,
  } = useDriver();
  const { activeOrder, isLoading: orderLoading, refetch: refetchOrder, error: activeOrderError } = useActiveOrder();
  const [refreshing, setRefreshing] = useState(false);

  const isLoading = driverLoading && !profile;
  const stats = useMemo(
    () => [
      { label: "Bugungi reyslar", value: profile?.todayTrips ?? 0 },
      {
        label: "Bugungi daromad",
        value: `${Number(profile?.todayEarnings ?? 0).toLocaleString()} so'm`,
      },
      {
        label: "Umumiy reyslar",
        value: profile?.driverProfile?.totalTrips ?? 0,
      },
      {
        label: "Reyting",
        value: `${Number(profile?.driverProfile?.rating ?? 0).toFixed(1)} ⭐`,
      },
    ],
    [profile],
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchDriver(), refetchOrder()]);
    setRefreshing(false);
  }

  if (isLoading) {
    return <LoadingScreen text="Dashboard yuklanmoqda..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <View style={styles.onlineCard}>
        <View>
          <Text style={styles.onlineTitle}>Holat</Text>
          <Text style={[styles.onlineText, isOnline ? styles.onlineOn : styles.onlineOff]}>
            {isOnline ? "Onlayn" : "Offlayn"}
          </Text>
        </View>
        <View style={styles.onlineRight}>
          {isToggling ? <ActivityIndicator color={COLORS.primary} /> : null}
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            thumbColor={COLORS.white}
            trackColor={{ true: COLORS.success, false: COLORS.gray }}
            disabled={isToggling}
            style={styles.switch}
          />
        </View>
      </View>

      {profile?.onboarding ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Profilingizni to'ldiring</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => [styles.bannerButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.bannerButtonText}>Boshlash</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View key={item.label} style={styles.statItem}>
            <StatCard
              label={item.label}
              value={item.value}
              icon={
                item.label === "Bugungi reyslar"
                  ? "directions-car"
                  : item.label === "Bugungi daromad"
                    ? "payments"
                    : item.label === "Umumiy reyslar"
                      ? "route"
                      : "star"
              }
              color={item.label === "Reyting" ? COLORS.warning : undefined}
            />
          </View>
        ))}
      </View>

      {activeOrder ? (
        <View style={styles.activeOrderCard}>
          <View style={styles.activeOrderHeader}>
            <Text style={styles.activeOrderTitle}>Faol buyurtma</Text>
            <StatusBadge status={activeOrder.status} />
          </View>
          <Text style={styles.activeOrderText}>
            Olish manzili: {activeOrder.pickupAddress ?? "-"}
          </Text>
          <Text style={styles.activeOrderText}>
            Mijoz: {activeOrder.customer?.name ?? "-"}
          </Text>
          <Pressable
            onPress={() => router.push(`/orders/${activeOrder.id}`)}
            style={({ pressed }) => [styles.activeOrderButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.activeOrderButtonText}>Batafsil</Text>
          </Pressable>
        </View>
      ) : null}

      {error || activeOrderError ? (
        <View style={styles.errorBox}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {activeOrderError ? <Text style={styles.errorText}>{activeOrderError}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed ? styles.buttonPressed : null]}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            onPress={() => void onRefresh()}
          >
            <Text style={styles.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : null}
      {orderLoading && !activeOrder ? (
        <Text style={styles.helperText}>Faol buyurtma tekshirilmoqda...</Text>
      ) : null}
      </ScrollView>
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
  content: {
    padding: 16,
    gap: 12,
  },
  onlineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  onlineText: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
  },
  onlineOn: {
    color: COLORS.success,
  },
  onlineOff: {
    color: COLORS.gray,
  },
  onlineRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  switch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
  banner: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  bannerText: {
    color: COLORS.dark,
    fontSize: 15,
    fontWeight: "600",
  },
  bannerButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.warning,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bannerButtonText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  statItem: {
    width: "50%",
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  activeOrderCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  activeOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  activeOrderTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  activeOrderText: {
    color: COLORS.white,
    fontSize: 14,
  },
  activeOrderButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeOrderButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#FDEDEC",
    borderRadius: 12,
    padding: 14,
    gap: 10,
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
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
