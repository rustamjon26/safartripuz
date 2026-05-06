import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/lib/constants";

export function LoadingScreen({ text }: { text?: string }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.inner}>
        <Text style={styles.logo}>SafarTrip</Text>
        <Text style={styles.tagline}>O'zbekistonni kashf eting</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
        {text ? <Text style={styles.hint}>{text}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  spinner: { marginTop: 8 },
  hint: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
