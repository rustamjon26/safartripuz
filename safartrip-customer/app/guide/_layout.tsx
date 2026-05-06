import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function GuideStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ekskursiya" }} />
      <Stack.Screen name="[id]" options={{ title: "Listing" }} />
    </Stack>
  );
}
