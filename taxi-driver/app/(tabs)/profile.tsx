import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { removeToken, removeUser } from "@/lib/storage";
import { COLORS } from "@/lib/constants";
import { useDriver } from "@/hooks/useDriver";
import { api } from "@/lib/api";

type Vehicle = {
  id: string;
  make?: string;
  model?: string;
  plateNumber?: string;
  category?: string;
  isActive?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  STANDARD: "Standart",
  COMFORT: "Komfort",
  MINIVAN: "Miniven",
  PREMIUM: "Premium",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

export default function ProfileScreen() {
  const { profile, isLoading, refetch, isOnline, toggleOnline, isToggling, error: profileError } = useDriver();
  const [editVisible, setEditVisible] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const user = profile?.user as { name?: string; email?: string } | undefined;
  const driverProfile = profile?.driverProfile as
    | { rating?: number; totalTrips?: number; licenseNumber?: string; licenseExpiry?: string }
    | undefined;
  const vehicles = (profile?.vehicles ?? []) as Vehicle[];
  const rating = Number(driverProfile?.rating ?? 0);

  const isExpiringSoon = useMemo(() => {
    if (!driverProfile?.licenseExpiry) return false;
    const exp = new Date(driverProfile.licenseExpiry);
    if (Number.isNaN(exp.getTime())) return false;
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return diff <= 30 * 24 * 60 * 60 * 1000;
  }, [driverProfile?.licenseExpiry]);

  function openEdit() {
    setLicenseNumber(driverProfile?.licenseNumber ?? "");
    setLicenseExpiry(
      driverProfile?.licenseExpiry ? new Date(driverProfile.licenseExpiry) : new Date(),
    );
    setEditVisible(true);
  }

  async function saveLicense() {
    setSaving(true);
    setScreenError(null);
    try {
      await api.put("/api/taxi/driver/profile", {
        licenseNumber,
        licenseExpiry: licenseExpiry.toISOString().slice(0, 10),
      });
      setEditVisible(false);
      await refetch();
    } catch (e) {
      setScreenError(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    Alert.alert("Chiqish", "Hisobdan chiqishni tasdiqlaysizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha, chiqish",
        style: "destructive",
        onPress: async () => {
          await removeToken();
          await removeUser();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const driverName = user?.name ?? "Haydovchi";
  const driverEmail = user?.email ?? "-";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refetch()} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(driverName) || "H"}</Text>
          </View>
          <Text style={styles.name}>{driverName}</Text>
          <Text style={styles.email}>{driverEmail}</Text>
        </View>

        <View style={styles.ratingCard}>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <MaterialIcons
                key={n}
                name={rating >= n ? "star" : "star-border"}
                size={22}
                color={COLORS.star}
              />
            ))}
          </View>
          <Text style={styles.ratingText}>{rating.toFixed(1)} / 5.0</Text>
          <Text style={styles.tripText}>{driverProfile?.totalTrips ?? 0} ta reys</Text>
        </View>

        <View style={styles.licenseCard}>
          <Text style={styles.sectionTitle}>Haydovchilik guvohnomasi</Text>
          <Text style={styles.fieldText}>Raqam: {driverProfile?.licenseNumber ?? "-"}</Text>
          <Text style={[styles.fieldText, isExpiringSoon && { color: COLORS.danger }]}>
            Amal qilish muddati: {driverProfile?.licenseExpiry?.slice(0, 10) ?? "-"}
          </Text>
          <Pressable
            style={styles.editBtn}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            onPress={openEdit}
          >
            <Text style={styles.editBtnText}>Tahrirlash</Text>
          </Pressable>
        </View>

        <View style={styles.onlineCard}>
          <Text style={styles.sectionTitle}>Onlayn holat</Text>
          <View style={styles.onlineRow}>
            <Text style={styles.onlineText}>{isOnline ? "Onlayn" : "Offlayn"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isToggling ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                trackColor={{ true: COLORS.success, false: COLORS.gray }}
                thumbColor={COLORS.white}
                disabled={isToggling}
              />
            </View>
          </View>
        </View>

        <View style={styles.vehiclesHeader}>
          <Text style={styles.sectionTitle}>Transportlar</Text>
          <Pressable
            onPress={() => router.push("/vehicles/new")}
            android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>Transport qo'shish</Text>
          </Pressable>
        </View>

        <FlatList
          data={vehicles}
          scrollEnabled={false}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={{ gap: 8 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Transportlar mavjud emas</Text>}
          renderItem={({ item }) => (
            <View style={styles.vehicleCard}>
              <Text style={styles.vehicleTitle}>
                {item.make ?? "-"} {item.model ?? ""}
              </Text>
              <Text style={styles.fieldText}>Raqam: {item.plateNumber ?? "-"}</Text>
              <View style={styles.vehicleMeta}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {CATEGORY_LABELS[item.category ?? ""] ?? item.category ?? "-"}
                  </Text>
                </View>
                <View style={styles.activeWrap}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: item.isActive ? COLORS.success : COLORS.gray },
                    ]}
                  />
                  <Text style={styles.activeText}>
                    {item.isActive ? "Faol" : "Faol emas"}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
        {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
        {screenError ? <Text style={styles.errorText}>{screenError}</Text> : null}

        <Pressable
          onPress={logout}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Guvohnomani tahrirlash</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="License number"
            />
            <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.inputText}>
                {licenseExpiry.toISOString().slice(0, 10)}
              </Text>
            </Pressable>
            {showDatePicker ? (
              <DateTimePicker
                value={licenseExpiry}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setLicenseExpiry(date);
                }}
              />
            ) : null}
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setEditVisible(false)}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Bekor qilish</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveLicense()}
                android_ripple={{ color: "rgba(255,255,255,0.2)" }}
                style={styles.saveBtn}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    padding: 14,
    gap: 10,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGray,
  },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "700",
  },
  name: {
    color: COLORS.dark,
    fontSize: 20,
    fontWeight: "700",
  },
  email: {
    color: COLORS.textSecondary,
  },
  ratingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 18,
  },
  tripText: {
    color: COLORS.textSecondary,
  },
  licenseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  fieldText: {
    color: COLORS.text,
  },
  editBtn: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editBtnText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  onlineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  onlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineText: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  vehiclesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  vehicleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  vehicleTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 16,
  },
  vehicleMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    color: COLORS.dark,
    fontSize: 12,
    fontWeight: "600",
  },
  activeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    fontSize: 18,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveText: {
    color: COLORS.white,
    fontWeight: "700",
  },
  inputText: {
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
});
