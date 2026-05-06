import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

type ServiceKind = "hotel" | "homestay" | "taxi" | "guide";

const ICONS: Record<ServiceKind, keyof typeof Ionicons.glyphMap> = {
  hotel: "bed-outline",
  homestay: "home-outline",
  taxi: "car-outline",
  guide: "map-outline",
};

const LABELS: Record<ServiceKind, string> = {
  hotel: "Mehmonxonalar",
  homestay: "Uy mehmonxonasi",
  taxi: "Taxi",
  guide: "Ekskursiya / Guide",
};

export function ServiceCard({
  kind,
  subtitle,
  onPress,
}: {
  kind: ServiceKind;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      onPress={onPress}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={ICONS[kind]} size={28} color={COLORS.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{LABELS[kind]}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    gap: 14,
  },
  pressed: {
    opacity: 0.92,
    backgroundColor: COLORS.background,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
