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
import { Link, router } from "expo-router";
import { api, getEffectiveApiBaseUrl } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/storage";
import { COLORS } from "@/lib/constants";

type SignInResponse = {
  accessToken?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: string;
  };
};

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email va parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      const data = (await api.post("/api/auth/signin", {
        email: email.trim().toLowerCase(),
        password,
      })) as SignInResponse;

      if (!data.accessToken) {
        throw new Error("Token qaytmadi");
      }
      await saveToken(data.accessToken);
      if (data.user) await saveUser(data.user);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kirish muvaffaqiyatsiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.inner}>
        <Text style={styles.logo}>SafarTrip</Text>
        <Text style={styles.tagline}>O'zbekistonni kashf eting</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@example.com"
          placeholderTextColor={COLORS.gray}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Parol</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={COLORS.gray}
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          onPress={() => void onSubmit()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>Kirish</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.linkWrap} disabled={loading}>
            <Text style={styles.link}>Ro'yxatdan o'tish</Text>
          </Pressable>
        </Link>

        {__DEV__ ? (
          <Link href="/(auth)/dev-settings" asChild>
            <Pressable style={styles.devBtn} disabled={loading}>
              <Text style={styles.devBtnText} numberOfLines={1}>
                ⚙ Dev Settings (API: {currentUrl || "…"})
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.primary,
    textAlign: "center",
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: COLORS.surfaceDanger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
  },
  btnDisabled: {
    opacity: 0.75,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  linkWrap: {
    marginTop: 22,
    alignItems: "center",
  },
  link: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: "700",
  },
  devBtn: {
    marginTop: 18,
    alignSelf: "stretch",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  devBtnText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
