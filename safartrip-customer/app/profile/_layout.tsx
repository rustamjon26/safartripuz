import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="edit" options={{ title: "Profilni tahrirlash" }} />
      <Stack.Screen name="payments" options={{ title: "To'lovlar tarixi" }} />
      <Stack.Screen name="help" options={{ title: "Yordam" }} />
      <Stack.Screen name="contact" options={{ title: "Aloqa" }} />
    </Stack>
  );
}
