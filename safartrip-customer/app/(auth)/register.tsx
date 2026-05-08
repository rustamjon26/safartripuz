import { useState } from "react";
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
import { api } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/storage";
import { COLORS } from "@/lib/constants";

type SignupResponse = {
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

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    setLoading(true);
    try {
      const data = (await api.post("/api/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      })) as SignupResponse;

      if (!data.accessToken) {
        throw new Error("Token qaytmadi");
      }
      await saveToken(data.accessToken);
      if (data.user) await saveUser(data.user);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ro'yxatdan o'tish muvaffaqiyatsiz");
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ro'yxatdan o'tish</Text>
        <Text style={styles.hint}>Telefon: +998901234567</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Ism</Text>
        <TextInput
          style={styles.input}
          placeholder="Masalan: Ali Valiyev"
          placeholderTextColor={COLORS.gray}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@example.com"
          placeholderTextColor={COLORS.gray}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="+998901234567"
          placeholderTextColor={COLORS.gray}
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Text style={styles.label}>Parol (min 8, harf + raqam)</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          editable={!loading}
        />

        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          android_ripple={{ color: "rgba(0,0,0,0.1)" }}
          onPress={() => void onSubmit()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>Ro'yxatdan o'tish</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.back} disabled={loading}>
            <Text style={styles.backText}>Kirish</Text>
          </Pressable>
        </Link>
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
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
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
    marginBottom: 14,
  },
  btn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
  },
  btnDisabled: { opacity: 0.75 },
  btnText: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: "800",
  },
  back: { marginTop: 22, alignItems: "center" },
  backText: { color: COLORS.primaryLight, fontWeight: "800", fontSize: 15 },
});
