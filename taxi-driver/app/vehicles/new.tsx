import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";

const CATEGORIES = [
  { value: "STANDARD", label: "Standart", icon: "directions-car" as const },
  { value: "COMFORT", label: "Komfort", icon: "airline-seat-recline-normal" as const },
  { value: "MINIVAN", label: "Miniven", icon: "airport-shuttle" as const },
  { value: "PREMIUM", label: "Premium", icon: "star" as const },
];

export default function NewVehicleScreen() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState<string>("STANDARD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!make || !model || !color || !plateNumber || !year || !category) {
      return "Barcha maydonlar to'ldirilishi shart";
    }
    const y = Number(year);
    if (Number.isNaN(y) || y < 2000 || y > 2030) {
      return "Yil 2000-2030 oralig'ida bo'lishi kerak";
    }
    if (plateNumber.trim().length < 6) {
      return "Davlat raqami kamida 6 belgidan iborat bo'lishi kerak";
    }
    return null;
  }

  async function saveVehicle() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/api/taxi/driver/vehicles", {
        make,
        model,
        color,
        plateNumber: plateNumber.trim().toUpperCase(),
        year: Number(year),
        category,
      });
      if (Platform.OS === "android") {
        ToastAndroid.show("Transport muvaffaqiyatli qo'shildi", ToastAndroid.SHORT);
      } else {
        Alert.alert("Muvaffaqiyat", "Transport muvaffaqiyatli qo'shildi");
      }
      router.replace("/(tabs)/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Transport qo'shish</Text>

      <TextInput
        style={styles.input}
        value={make}
        onChangeText={setMake}
        placeholder="Marka (Toyota, Chevrolet...)"
      />
      <TextInput
        style={styles.input}
        value={model}
        onChangeText={setModel}
        placeholder="Model (Cobalt, Nexia...)"
      />
      <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="Rang" />
      <TextInput
        style={styles.input}
        value={plateNumber}
        onChangeText={(text) => setPlateNumber(text.toUpperCase())}
        autoCapitalize="characters"
        placeholder="Davlat raqami"
      />
      <TextInput
        style={styles.input}
        value={year}
        onChangeText={setYear}
        keyboardType="numeric"
        placeholder="Yil"
      />

      <Text style={styles.categoryTitle}>Kategoriya</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setCategory(item.value)}
            style={[
              styles.categoryCard,
              category === item.value && styles.categoryCardActive,
            ]}
          >
            <MaterialIcons
              name={item.icon}
              size={22}
              color={category === item.value ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.categoryText,
                category === item.value && { color: COLORS.primary, fontWeight: "700" },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={() => void saveVehicle()}
        android_ripple={{ color: "rgba(255,255,255,0.2)" }}
        style={[styles.saveBtn, isSubmitting && styles.disabled]}
        disabled={isSubmitting}
      >
        <Text style={styles.saveText}>{isSubmitting ? "Saqlanmoqda..." : "Saqlash"}</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  content: {
    padding: 14,
    gap: 10,
  },
  title: {
    color: COLORS.dark,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
  },
  categoryTitle: {
    color: COLORS.dark,
    fontWeight: "700",
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  categoryCard: {
    width: "50%",
    padding: 4,
    borderRadius: 12,
  },
  categoryCardActive: {
    backgroundColor: COLORS.primarySoft,
  },
  categoryText: {
    color: COLORS.textSecondary,
    marginTop: 6,
    fontSize: 13,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.7,
  },
});
