import { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { saveUser } from "@/lib/storage";
import { useUser } from "@/hooks/useUser";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/lib/constants";

export default function ProfileEditScreen() {
  const { user, isLoading, refetch } = useUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(`${user.first_name} ${user.last_name}`.trim());
      setPhone(user.phone ?? "");
    }
  }, [user]);

  async function save() {
    if (!name.trim()) {
      Alert.alert("Xato", "Ismni kiriting");
      return;
    }
    setSaving(true);
    try {
      const res = (await api.put("/api/user/profile", {
        name: name.trim(),
        phone: phone.trim(),
      })) as { user: typeof user };
      if (res.user) await saveUser(res.user);
      await refetch();
      Alert.alert("Saqlandi", "Profil muvaffaqiyatli yangilandi.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading && !user?.id) {
    return <LoadingScreen text="Yuklanmoqda..." />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.pad}>
        <Text style={styles.label}>Ism familiya</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Masalan: Ali Valiyev"
          placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput style={[styles.input, styles.readonly]} value={user?.email ?? ""} editable={false} />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998901234567"
          placeholderTextColor={COLORS.gray}
        />

        <Pressable
          style={[styles.btn, saving && { opacity: 0.7 }]}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          disabled={saving}
          onPress={() => void save()}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.btnTxt}>Saqlash</Text>
          )}
        </Pressable>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  pad: { padding: 20 },
  label: { fontSize: 13, fontWeight: "800", color: COLORS.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 18,
  },
  readonly: { color: COLORS.gray, backgroundColor: COLORS.lightGray },
  btn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
