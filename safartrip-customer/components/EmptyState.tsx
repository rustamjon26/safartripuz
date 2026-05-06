import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/lib/constants";

export function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji} accessibilityLabel="empty">
        {icon}
      </Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          onPress={onCta}
        >
          <Text style={styles.ctaTxt}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 64,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 20,
  },
  cta: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  ctaPressed: { opacity: 0.9 },
  ctaTxt: { color: COLORS.white, fontWeight: "900", fontSize: 15 },
});
