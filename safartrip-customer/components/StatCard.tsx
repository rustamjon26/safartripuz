import { StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { COLORS } from "@/lib/constants";

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    gap: 6,
  },
  iconWrap: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },
});
