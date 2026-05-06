import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function PaymentStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="[planId]" options={{ title: "To'lov" }} />
      <Stack.Screen name="result" options={{ title: "To'lov natijasi" }} />
    </Stack>
  );
}
