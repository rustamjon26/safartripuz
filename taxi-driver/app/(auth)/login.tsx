import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api, getEffectiveApiBaseUrl } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/storage";
import { COLORS } from "@/lib/constants";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (!__DEV__) return;
    let active = true;
    void (async () => {
      const url = await getEffectiveApiBaseUrl();
      if (active) setCurrentUrl(url);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/api/auth/signin", { email, password });
      const token =
        response?.accessToken ??
        response?.data?.accessToken ??
        response?.data?.token ??
        response?.token;
      const user = response?.user ?? response?.data?.user;

      if (!token || !user) {
        throw new Error("Token yoki foydalanuvchi ma'lumotlari topilmadi");
      }

      const role = (user as { role?: string }).role;
      if (role !== "taxi" && role !== "taxi_partner") {
        throw new Error("Bu hisob haydovchi uchun emas");
      }

      await saveToken(token);
      await saveUser(user);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kirishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>SafarTrip</Text>
            <Text style={styles.subtitle}>Haydovchi kabineti</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Parol"
              secureTextEntry
              style={styles.input}
            />
            <Pressable
              onPress={handleLogin}
              android_ripple={{ color: "rgba(255,255,255,0.2)" }}
              style={({ pressed }) => [
                styles.button,
                pressed && !isLoading ? styles.buttonPressed : null,
                isLoading ? styles.buttonDisabled : null,
              ]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Kirish</Text>
              )}
            </Pressable>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {__DEV__ ? (
              <Pressable
                onPress={() => router.push("/(auth)/dev-settings")}
                style={styles.devBtn}
                disabled={isLoading}
              >
                <Text style={styles.devBtnText} numberOfLines={1}>
                  ⚙ Dev Settings (API: {currentUrl || "…"})
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    gap: 6,
  },
  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  devBtn: {
    marginTop: 18,
    alignSelf: "stretch",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  devBtnText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
