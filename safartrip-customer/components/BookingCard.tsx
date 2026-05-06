import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBadge } from "./StatusBadge";
import { TaxiOrderStatusBadge } from "./TaxiOrderStatusBadge";
import { COLORS } from "@/lib/constants";

export type BookingCardProps = {
  title: string;
  subtitle?: string;
  date: string;
  price: string;
  status: string;
  /** Taxi buyurtmalari uchun alohida status ranglari */
  statusVariant?: "booking" | "taxi";
  onPress?: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  cancelLabel?: string;
  reviewLabel?: string;
};

export function BookingCard({
  title,
  subtitle,
  date,
  price,
  status,
  statusVariant = "booking",
  onPress,
  onCancel,
  onReview,
  cancelLabel = "Bekor qilish",
  reviewLabel = "Baho berish",
}: BookingCardProps) {
  const hasActions = Boolean(onCancel || onReview);

  const inner = (
    <>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {statusVariant === "taxi" ? (
          <TaxiOrderStatusBadge status={status} />
        ) : (
          <StatusBadge status={status} />
        )}
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.price}>{price}</Text>
      </View>
      {hasActions ? (
        <View style={styles.actions}>
          {onCancel ? (
            <Pressable
              style={styles.btnGhost}
              android_ripple={{ color: "rgba(220,38,38,0.15)" }}
              onPress={onCancel}
            >
              <Text style={styles.btnGhostTxt}>{cancelLabel}</Text>
            </Pressable>
          ) : null}
          {onReview ? (
            <Pressable
              style={styles.btnPrimary}
              android_ripple={{ color: "rgba(0,0,0,0.12)" }}
              onPress={onReview}
            >
              <Text style={styles.btnPrimaryTxt}>{reviewLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        android_ripple={{ color: "rgba(0,0,0,0.06)" }}
        onPress={onPress}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.card}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: {
    opacity: 0.92,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.dark,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  date: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  btnGhostTxt: {
    color: COLORS.danger,
    fontWeight: "800",
    fontSize: 14,
  },
  btnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  btnPrimaryTxt: {
    color: COLORS.dark,
    fontWeight: "900",
    fontSize: 14,
  },
});
