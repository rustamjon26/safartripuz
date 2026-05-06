import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { removeToken, removeUser } from "@/lib/storage";
import { useUser } from "@/hooks/useUser";
import { LoadingScreen } from "@/components/LoadingScreen";
import { EmptyState } from "@/components/EmptyState";
import { COLORS } from "@/lib/constants";
import { formatPrice } from "@/lib/formatDate";

function initials(first?: string, last?: string) {
  const a = (first?.trim()?.[0] ?? "").toUpperCase();
  const b = (last?.trim()?.[0] ?? "").toUpperCase();
  return (a + b) || "?";
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuPressed]}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      onPress={onPress}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, isLoading, stats, error, refetch } = useUser();

  function logout() {
    Alert.alert("Chiqish", "Hisobdan chiqasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          await removeToken();
          await removeUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading) {
    return <LoadingScreen text="Profil..." />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.screen} edges={["bottom"]}>
        <EmptyState
          icon="⚠️"
          title="Profil yuklanmadi"
          subtitle={error ?? "Qayta urinib ko'ring"}
          ctaLabel="Yangilash"
          onCta={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const fullName = `${user.first_name} ${user.last_name}`.trim() || "Mehmon";

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initials(user?.first_name, user?.last_name)}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        {user?.email ? <Text style={styles.contact}>{user.email}</Text> : null}
        {user?.phone ? <Text style={styles.contact}>{user.phone}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{stats?.travelPlans ?? 0}</Text>
          <Text style={styles.statLbl}>Jami sayohatlar</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{stats?.bookings ?? 0}</Text>
          <Text style={styles.statLbl}>Jami bronlar</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statVal} numberOfLines={1}>
            {formatPrice(stats?.totalSpent ?? 0)}
          </Text>
          <Text style={styles.statLbl}>Jami sarflagan</Text>
        </View>
      </View>

      <View style={styles.menuCard}>
        <MenuRow icon="👤" label="Profilni tahrirlash" onPress={() => router.push("/profile/edit")} />
        <MenuRow icon="🎫" label="Bronlarim" onPress={() => router.push("/(tabs)/bookings")} />
        <MenuRow icon="🗺" label="Sayohatlarim" onPress={() => router.push("/(tabs)/trips")} />
        <MenuRow icon="💳" label="To'lovlar tarixi" onPress={() => router.push("/profile/payments")} />
        <MenuRow icon="❓" label="Yordam" onPress={() => router.push("/profile/help")} />
        <MenuRow icon="📞" label="Aloqa" onPress={() => router.push("/profile/contact")} />
      </View>

      <Pressable
        style={styles.logout}
        android_ripple={{ color: "rgba(220,38,38,0.12)" }}
        onPress={() => logout()}
      >
        <Text style={styles.logoutTxt}>Chiqish</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarTxt: { fontSize: 36, fontWeight: "900", color: COLORS.white },
  name: { fontSize: 26, fontWeight: "900", color: COLORS.dark, textAlign: "center" },
  contact: { marginTop: 6, fontSize: 15, color: COLORS.textSecondary, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  statCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statVal: { fontSize: 18, fontWeight: "900", color: COLORS.primary },
  statLbl: { marginTop: 4, fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, textAlign: "center" },
  statDivider: { width: 1, backgroundColor: COLORS.lightGray },
  menuCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: 12,
  },
  menuPressed: { backgroundColor: COLORS.background },
  menuIcon: { fontSize: 20, width: 28, textAlign: "center" },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.dark },
  logout: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceDanger,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: "center",
  },
  logoutTxt: { color: COLORS.danger, fontWeight: "900", fontSize: 16 },
});
