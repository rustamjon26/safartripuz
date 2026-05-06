import { StyleSheet, Text, View } from "react-native";
import { COLORS, TAXI_ORDER_STATUS_COLORS, TAXI_ORDER_STATUS_LABELS } from "@/lib/constants";

type Props = { status: string; size?: "sm" | "md" };

export function TaxiOrderStatusBadge({ status, size = "md" }: Props) {
  const backgroundColor = TAXI_ORDER_STATUS_COLORS[status] ?? COLORS.gray;
  const label = TAXI_ORDER_STATUS_LABELS[status] ?? status;

  return (
    <View
      style={[
        styles.badge,
        size === "sm" ? styles.badgeSm : styles.badgeMd,
        { backgroundColor },
      ]}
    >
      <Text style={[styles.text, size === "sm" ? styles.textSm : styles.textMd]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 12, alignSelf: "flex-start" },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 4 },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 6 },
  text: { color: COLORS.white, fontWeight: "700" },
  textSm: { fontSize: 11 },
  textMd: { fontSize: 12 },
});
