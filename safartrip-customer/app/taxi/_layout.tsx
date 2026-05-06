import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function TaxiStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Taxi" }} />
      <Stack.Screen name="[id]" options={{ title: "Buyurtma" }} />
    </Stack>
  );
}
