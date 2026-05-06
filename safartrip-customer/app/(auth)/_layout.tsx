import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Kirish" }} />
      <Stack.Screen name="register" options={{ title: "Ro'yxatdan o'tish" }} />
      <Stack.Screen name="dev-settings" options={{ title: "Dev sozlamalari" }} />
    </Stack>
  );
}
