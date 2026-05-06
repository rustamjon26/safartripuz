import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getEffectiveApiBaseUrl } from "@/lib/api";
import { getToken, removeToken, removeUser } from "@/lib/storage";
import { COLORS } from "@/lib/constants";
import { LoadingScreen } from "@/components/LoadingScreen";

type AuthState =
  | { phase: "checking"; apiUrl: string }
  | { phase: "ok" }
  | { phase: "error"; apiUrl: string; message: string };

const AUTH_TIMEOUT_MS = 8000;

// Keep the native splash visible while we perform the initial auth check.
// This avoids a white flash on Android between the splash image and the
// first JS-rendered screen.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* no-op — preventAutoHideAsync rejects if the splash is already gone. */
});

export default function RootLayout() {
  const [state, setState] = useState<AuthState>({
    phase: "checking",
    apiUrl: "",
  });

  const runAuthCheck = useCallback(async () => {
    const apiUrl = await getEffectiveApiBaseUrl();
    setState({ phase: "checking", apiUrl });

    const token = await getToken();
    if (!token) {
      router.replace("/(auth)/login");
      setState({ phase: "ok" });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

    try {
      const response = await fetch(`${apiUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 401) {
        // Stale token — wipe and send to login.
        await removeToken();
        await removeUser();
        router.replace("/(auth)/login");
        setState({ phase: "ok" });
        return;
      }

      if (!response.ok) {
        // Server reachable but returned a non-2xx we don't understand.
        // Still treat as "go to login" so user can retry manually.
        router.replace("/(auth)/login");
        setState({ phase: "ok" });
        return;
      }

      router.replace("/(tabs)");
      setState({ phase: "ok" });
    } catch (err) {
      clearTimeout(timeout);
      const isAbort =
        err instanceof Error &&
        (err.name === "AbortError" || err.message.toLowerCase().includes("abort"));
      const message = isAbort
        ? "Server bilan aloqa yo'q. Internet va API URL ni tekshiring."
        : err instanceof Error && err.message
          ? err.message
          : "Noma'lum tarmoq xatoligi";
      setState({ phase: "error", apiUrl, message });
    }
  }, []);

  useEffect(() => {
    void runAuthCheck();
  }, [runAuthCheck]);

  useEffect(() => {
    if (state.phase !== "checking") {
      SplashScreen.hideAsync().catch(() => {
        /* no-op */
      });
    }
  }, [state.phase]);

  if (state.phase === "checking") {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <LoadingScreen text="Sessiya tekshirilmoqda..." />
      </SafeAreaProvider>
    );
  }

  if (state.phase === "error") {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={COLORS.primary} />
        <SafeAreaView style={styles.errorSafe} edges={["top", "bottom", "left", "right"]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Server bilan aloqa yo&apos;q</Text>
            <Text style={styles.errorSub}>{state.message}</Text>
            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>API URL</Text>
              <Text style={styles.urlValue}>{state.apiUrl}</Text>
            </View>

            {__DEV__ ? (
              <Pressable
                style={styles.errorBtn}
                android_ripple={{ color: "rgba(255,255,255,0.2)" }}
                onPress={() => router.replace("/(auth)/dev-settings")}
              >
                <Text style={styles.errorBtnText}>URL ni o&apos;zgartirish</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.retryBtn}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
              onPress={() => void runAuthCheck()}
            >
              <Text style={styles.retryBtnText}>Qayta urinish</Text>
            </Pressable>

            <Pressable
              style={styles.skipBtn}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
              onPress={() => {
                router.replace("/(auth)/login");
                setState({ phase: "ok" });
              }}
            >
              <Text style={styles.skipBtnText}>Kirish sahifasiga o&apos;tish</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorSafe: { flex: 1, backgroundColor: COLORS.background },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorIcon: { fontSize: 56 },
  errorTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  errorSub: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  urlBox: {
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignSelf: "stretch",
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  urlValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  errorBtn: {
    marginTop: 20,
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  errorBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: "stretch",
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  retryBtnText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  skipBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  skipBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
});
