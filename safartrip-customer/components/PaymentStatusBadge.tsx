import { StyleSheet, Text, View } from "react-native";
import { COLORS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from "@/lib/constants";

type Props = { status: string; size?: "sm" | "md" };

export function PaymentStatusBadge({ status, size = "md" }: Props) {
  const color = PAYMENT_STATUS_COLORS[status] ?? COLORS.gray;
  const label = PAYMENT_STATUS_LABELS[status] ?? status;

  return (
    <View style={[styles.badge, size === "sm" ? styles.badgeSm : styles.badgeMd, { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.text, size === "sm" ? styles.textSm : styles.textMd, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontWeight: "700" },
  textSm: { fontSize: 11 },
  textMd: { fontSize: 12 },
});
