import { StyleSheet, Text, View } from "react-native";
import { COLORS, STATUS_COLORS } from "@/lib/constants";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  ACCEPTED: "Qabul qilindi",
  ARRIVED: "Yetib keldim",
  IN_PROGRESS: "Yo'lda",
  COMPLETED: "Tugallandi",
  SETTLED: "To'landi",
  CANCELLED: "Bekor qilindi",
  DISPUTE: "Nizo",
};

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const backgroundColor = STATUS_COLORS[status] ?? COLORS.gray;
  const label = STATUS_LABELS[status] ?? status;

  return (
    <View
      style={[
        styles.badge,
        size === "sm" ? styles.badgeSm : styles.badgeMd,
        { backgroundColor },
      ]}
    >
      <Text style={[styles.text, size === "sm" ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    color: COLORS.white,
    fontWeight: "700",
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
