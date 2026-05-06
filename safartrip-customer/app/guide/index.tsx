import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { formatPrice } from "@/lib/formatDate";

type GuideRow = {
  id: string;
  title: string;
  category: string;
  region: string | null;
  languages: string[];
  images: string[];
  pricePerHour: unknown;
  avgRating: number | null;
};

type ApiList = { data: { data: GuideRow[]; pagination: { total: number } } };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "Barcha" },
  { value: "CITY_TOUR", label: "Shahar turi" },
  { value: "NATURE", label: "Tabiat" },
  { value: "HISTORY", label: "Tarix" },
  { value: "ADVENTURE", label: "Sarguzasht" },
  { value: "FOOD", label: "Taom" },
  { value: "CUSTOM", label: "Maxsus" },
];

const DAY_NAMES = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sha"];

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=70&auto=format&fit=crop";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

export default function GuideSearchScreen() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [showDate, setShowDate] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [items, setItems] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (city.trim()) p.set("city", city.trim());
    if (category) p.set("category", category);
    if (language.trim()) p.set("language", language.trim().toLowerCase());
    p.set("date", date.toISOString());
    p.set("limit", "30");
    return p.toString();
  }, [city, category, language, date]);

  const search = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = (await api.get(`/api/guide?${qs}`)) as ApiList;
      setItems(res.data?.data ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void search();
  }, [search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await search();
    } finally {
      setRefreshing(false);
    }
  }, [search]);

  const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? "Kategoriya";

  function renderItem({ item }: { item: GuideRow }) {
    const uri = item.images?.[0] || PLACEHOLDER;
    const pph = Number(item.pricePerHour);
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/guide/${item.id}`)}>
        <Image source={{ uri }} style={styles.img} />
        <View style={styles.body}>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{item.category}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.langs} numberOfLines={1}>
            {(item.languages ?? []).join(", ")}
          </Text>
          <View style={styles.row}>
            <Text style={styles.price}>{formatPrice(pph)} / soat</Text>
            {item.avgRating != null ? (
              <View style={styles.pill}>
                <Ionicons name="star" size={14} color={COLORS.secondary} />
                <Text style={styles.pillTxt}>{item.avgRating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      {listError ? <Text style={styles.inlineErr}>{listError}</Text> : null}
      <View style={styles.form}>
        <Text style={styles.label}>Shahar / viloyat</Text>
        <TextInput
          style={styles.input}
          placeholder="Masalan: Samarqand"
          placeholderTextColor={COLORS.gray}
          value={city}
          onChangeText={setCity}
        />
        <Text style={styles.label}>Kategoriya</Text>
        <Pressable style={styles.input} onPress={() => setCatOpen(true)}>
          <Text style={styles.inputTxt}>{catLabel}</Text>
        </Pressable>
        <Modal visible={catOpen} transparent animationType="fade">
          <View style={styles.modalWrap}>
            <Pressable style={styles.modalBackdrop} onPress={() => setCatOpen(false)} />
            <View style={styles.modalBox}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value || "all"}
                  style={styles.modalRow}
                  onPress={() => {
                    setCategory(c.value);
                    setCatOpen(false);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Til (masalan: uz)</Text>
        <TextInput
          style={styles.input}
          placeholder="uz"
          placeholderTextColor={COLORS.gray}
          value={language}
          onChangeText={setLanguage}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Sana ({DAY_NAMES[date.getDay()]})</Text>
        <Pressable style={styles.input} onPress={() => setShowDate(true)}>
          <Text style={styles.inputTxt}>{date.toISOString().slice(0, 10)}</Text>
        </Pressable>
        {showDate ? (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(_, d) => {
              if (Platform.OS === "android") setShowDate(false);
              if (d) setDate(startOfDay(d));
            }}
          />
        ) : null}

        <Pressable style={styles.btn} onPress={() => void search()}>
          <Text style={styles.btnTxt}>Qidirish</Text>
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState icon="🧭" title="Qo'llanmalar topilmadi" subtitle="Filtrlarni o'zgartirib qayta qidiring" />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  inlineErr: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceDanger,
    color: COLORS.danger,
    fontWeight: "700",
  },
  form: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  label: { fontSize: 12, fontWeight: "800", color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
    marginBottom: 10,
    justifyContent: "center",
  },
  inputTxt: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  img: { width: 108, height: 120, backgroundColor: COLORS.lightGray },
  body: { flex: 1, padding: 10, justifyContent: "center" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.chipSelected,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  badgeTxt: { fontSize: 10, fontWeight: "900", color: COLORS.primary },
  title: { fontSize: 15, fontWeight: "900", color: COLORS.dark },
  langs: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  price: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  pill: { flexDirection: "row", alignItems: "center", gap: 4 },
  pillTxt: { fontWeight: "800" },
  modalWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: "hidden",
    zIndex: 1,
  },
  modalRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  modalRowTxt: { fontSize: 16, fontWeight: "700", color: COLORS.dark },
});
