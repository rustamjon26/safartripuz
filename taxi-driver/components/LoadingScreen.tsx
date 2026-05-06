import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/lib/constants";

export function LoadingScreen({ text = "Loading..." }: { text?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SafarTrip</Text>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.lightGray,
    gap: 10,
  },
  logo: {
    color: COLORS.primary,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  text: {
    color: COLORS.textSecondary,
  },
});
