import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

const PHONE_DISPLAY = "+998 90 123 45 67";
const PHONE_TEL = "+998901234567";
const EMAIL = "support@safartrip.uz";
const TELEGRAM = "https://t.me/safartrip_support";

function Row({
  emoji,
  label,
  value,
  onPress,
}: {
  emoji: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowLbl}>{label}</Text>
        <Text style={styles.rowVal}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
    </Pressable>
  );
}

export default function ProfileContactScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Row
          emoji="📞"
          label="Telefon"
          value={PHONE_DISPLAY}
          onPress={() => void Linking.openURL(`tel:${PHONE_TEL}`)}
        />
        <Row
          emoji="📧"
          label="Email"
          value={EMAIL}
          onPress={() => void Linking.openURL(`mailto:${EMAIL}`)}
        />
        <Row
          emoji="💬"
          label="Telegram"
          value="@safartrip_support"
          onPress={() => void Linking.openURL(TELEGRAM)}
        />
      </View>

      <View style={styles.hours}>
        <Text style={styles.hoursTitle}>Ish vaqti</Text>
        <Text style={styles.hoursTxt}>Dushanba — Juma: 09:00 – 18:00</Text>
        <Text style={styles.hoursTxt}>Shanba: 10:00 – 14:00</Text>
        <Text style={styles.hoursTxt}>Yakshanba: dam olish kuni</Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: 12,
  },
  rowPressed: { backgroundColor: COLORS.background },
  emoji: { fontSize: 22, width: 32, textAlign: "center" },
  rowBody: { flex: 1 },
  rowLbl: { fontSize: 12, fontWeight: "800", color: COLORS.textSecondary },
  rowVal: { marginTop: 4, fontSize: 16, fontWeight: "800", color: COLORS.primary },
  hours: {
    marginTop: 20,
    padding: 18,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  hoursTitle: { fontSize: 16, fontWeight: "900", color: COLORS.dark, marginBottom: 10 },
  hoursTxt: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, fontWeight: "600" },
});
