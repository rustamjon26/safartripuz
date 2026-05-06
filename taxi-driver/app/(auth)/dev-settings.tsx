import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { LoadingScreen } from "@/components/LoadingScreen";
import { API_BASE_URL, COLORS } from "@/lib/constants";
import { clearApiUrl, getApiUrl, saveApiUrl } from "@/lib/storage";

/**
 * Dev-only screen to override the API base URL at runtime. Use when
 * testing on a physical device where `localhost` / `10.0.2.2` won't
 * reach the host machine — enter `http://<LAN-IP>:3000` instead.
 */
export default function DevSettingsScreen() {
  const [currentOverride, setCurrentOverride] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!__DEV__) {
      router.replace("/(auth)/login");
    }
  }, [router]);

  useEffect(() => {
    if (!__DEV__) return;
    let mounted = true;
    (async () => {
      const saved = await getApiUrl();
      if (!mounted) return;
      setCurrentOverride(saved);
      setInput(saved ?? API_BASE_URL);
      setLoading(false);
    })();
    return () => {
      mounted = false;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  function showFlash(msg: string) {
    setFlash(msg);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlash(null), 2500);
  }

  async function onSave() {
    const trimmed = input.trim();
    if (!trimmed) {
      Alert.alert("Xatolik", "URL bo'sh bo'lishi mumkin emas");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      Alert.alert("Xatolik", "URL http:// yoki https:// bilan boshlanishi kerak");
      return;
    }
    setBusy(true);
    try {
      const normalized = trimmed.replace(/\/+$/, "");
      await saveApiUrl(normalized);
      setCurrentOverride(normalized);
      setInput(normalized);
      showFlash("Saqlandi: " + normalized);
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      await clearApiUrl();
      setCurrentOverride(null);
      setInput(API_BASE_URL);
      showFlash("Standart URL tiklandi");
    } finally {
      setBusy(false);
    }
  }

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/login");
    }
  }

  const effective = currentOverride ?? API_BASE_URL;

  if (!__DEV__) {
    return <LoadingScreen text="Kirishga yo'naltilmoqda..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Dev sozlamalari</Text>
          <Text style={styles.subtitle}>
            API manzili. Faqat dasturlash rejimida ko&apos;rinadi.
          </Text>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Hozirgi API URL</Text>
                <Text style={styles.cardValue}>{effective}</Text>
                <Text style={styles.cardSource}>
                  {currentOverride ? "Manba: SecureStore (override)" : "Manba: .env"}
                </Text>
              </View>

              <Text style={styles.label}>Yangi API URL</Text>
              <TextInput
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.1.23:3000"
                placeholderTextColor={COLORS.gray}
                style={styles.input}
                editable={!busy}
              />

              <Text style={styles.hint}>
                Telefon hotspot ishlatayotgan bo&apos;lsang, kompyuter IP sini kiriting.
                Masalan: http://192.168.43.105:3000
              </Text>
              <Text style={styles.hint}>
                IP topish: Windows CMD da &quot;ipconfig&quot; → Wi-Fi → IPv4
              </Text>

              <Pressable
                onPress={() => void onSave()}
                disabled={busy}
                style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.btnText}>Saqlash</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => void onReset()}
                disabled={busy}
                style={[styles.btn, styles.btnGhost, busy && styles.btnDisabled]}
              >
                <Text style={styles.btnGhostText}>Standart</Text>
              </Pressable>

              <Pressable onPress={onBack} style={styles.back}>
                <Text style={styles.backText}>← Orqaga</Text>
              </Pressable>

              {flash ? (
                <View style={styles.flash}>
                  <Text style={styles.flashText}>{flash}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.lightGray },
  flex: { flex: 1 },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
    fontWeight: "600",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 6,
  },
  cardSource: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  hint: {
    marginTop: 10,
    marginBottom: 16,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  btnGhost: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  btnGhostText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  back: {
    marginTop: 18,
    alignItems: "center",
  },
  backText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: "700",
  },
  flash: {
    marginTop: 18,
    backgroundColor: "#E8F8EE",
    padding: 12,
    borderRadius: 10,
  },
  flashText: {
    color: COLORS.success,
    fontWeight: "700",
    textAlign: "center",
  },
});
