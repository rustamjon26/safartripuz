import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBadge } from "./StatusBadge";
import { COLORS } from "@/lib/constants";

export type DriverOrder = {
  id: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  status: string;
  estimatedPrice?: number;
};

type OrderCardProps = {
  order: DriverOrder;
  onPress: () => void;
  onAction: (order: DriverOrder) => void;
};

const ACTION_CONFIG: Record<
  string,
  { label: string; backgroundColor: string }
> = {
  PENDING: { label: "Qabul qilish", backgroundColor: COLORS.success },
  ACCEPTED: { label: "Yetib keldim", backgroundColor: COLORS.primaryLight },
  ARRIVED: { label: "Yo'lga chiqdik", backgroundColor: COLORS.primaryLight },
  IN_PROGRESS: { label: "Yakunlash", backgroundColor: COLORS.primary },
};

export function OrderCard({ order, onPress, onAction }: OrderCardProps) {
  const action = ACTION_CONFIG[order.status];

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <Text style={styles.orderId}>#{order.id.slice(-6)}</Text>
        <StatusBadge status={order.status} size="sm" />
      </View>

      <View style={styles.routeRow}>
        <Text style={styles.routeText} numberOfLines={1}>
          {order.pickupAddress ?? "-"}
        </Text>
        <MaterialIcons name="arrow-forward" size={16} color={COLORS.textSecondary} />
        <Text style={styles.routeText} numberOfLines={1}>
          {order.dropoffAddress ?? "-"}
        </Text>
      </View>

      <Text style={styles.price}>
        {Number(order.estimatedPrice ?? 0).toLocaleString()} so'm
      </Text>

      {action ? (
        <Pressable
          onPress={() => onAction(order)}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: action.backgroundColor },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontWeight: "700",
    color: COLORS.dark,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  price: {
    fontWeight: "700",
    color: COLORS.dark,
    fontSize: 16,
  },
  actionButton: {
    marginTop: 2,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },
});
