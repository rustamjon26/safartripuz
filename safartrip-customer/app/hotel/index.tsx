import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { formatPrice } from "@/lib/formatDate";

type HotelRow = {
  id: string;
  name: string;
  city: string;
  stars: number;
  nightlyPrice: number;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
};

type Pag = { page: number; limit: number; total: number; totalPages: number };

type ListResponse = { success?: boolean; data: { data: HotelRow[]; pagination: Pag } };

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70&auto=format&fit=crop";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

type PriceChip = { label: string; min: number; max: number };
const PRICE_CHIPS: PriceChip[] = [
  { label: "Barchasi", min: 0, max: 0 },
  { label: "< 300k", min: 0, max: 300_000 },
  { label: "300–600k", min: 300_000, max: 600_000 },
  { label: "> 600k", min: 600_000, max: 0 },
];

const STAR_CHIPS: { label: string; min: number }[] = [
  { label: "Barchasi", min: 0 },
  { label: "3+", min: 3 },
  { label: "4+", min: 4 },
  { label: "5", min: 5 },
];

export default function HotelSearchScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialCity = typeof q === "string" ? q : Array.isArray(q) ? (q[0] ?? "") : "";

  const [city, setCity] = useState(initialCity);
  const [checkIn, setCheckIn] = useState(() => startOfDay(new Date()));
  const [checkOut, setCheckOut] = useState(() => addDays(new Date(), 1));
  const [guests, setGuests] = useState("2");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minStars, setMinStars] = useState(0);
  const [items, setItems] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    if (initialCity) setCity(initialCity);
  }, [initialCity]);

  const queryString = useMemo(() => {
    const g = Math.max(1, Number(guests) || 1);
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    params.set("checkIn", toIso(checkIn));
    params.set("checkOut", toIso(checkOut));
    params.set("guests", String(g));
    params.set("limit", "30");
    if (minPrice > 0) params.set("minPrice", String(minPrice));
    if (maxPrice > 0) params.set("maxPrice", String(maxPrice));
    if (minStars > 0) params.set("minStars", String(minStars));
    return params.toString();
  }, [city, checkIn, checkOut, guests, minPrice, maxPrice, minStars]);

  const search = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = (await api.get(`/api/hotels?${queryString}`)) as ListResponse;
      setItems(res.data?.data ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Xato");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

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

  function renderItem({ item }: { item: HotelRow }) {
    const uri = item.imageUrl || PLACEHOLDER;
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/hotel/${item.id}`)}>
        <Image source={{ uri }} style={styles.cardImg} />
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.city || "—"} · {item.stars}★
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.price}>{formatPrice(item.nightlyPrice)} / tun</Text>
            {item.rating != null ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={14} color={COLORS.secondary} />
                <Text style={styles.ratingTxt}>{item.rating.toFixed(1)}</Text>
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
        <Text style={styles.label}>Shahar</Text>
        <TextInput
          style={styles.input}
          placeholder="Masalan: Samarqand"
          placeholderTextColor={COLORS.gray}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>Kirish / Chiqish</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateBtn} onPress={() => setPicker("in")}>
            <Text style={styles.dateLbl}>Kirish</Text>
            <Text style={styles.dateVal}>{toIso(checkIn)}</Text>
          </Pressable>
          <Pressable style={styles.dateBtn} onPress={() => setPicker("out")}>
            <Text style={styles.dateLbl}>Chiqish</Text>
            <Text style={styles.dateVal}>{toIso(checkOut)}</Text>
          </Pressable>
        </View>
        {picker ? (
          <DateTimePicker
            value={picker === "in" ? checkIn : checkOut}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(_, date) => {
              if (Platform.OS === "android") setPicker(null);
              if (!date) return;
              if (picker === "in") {
                setCheckIn(startOfDay(date));
                setCheckOut((co) => (co <= date ? addDays(date, 1) : co));
              } else {
                setCheckOut(startOfDay(date));
              }
            }}
          />
        ) : null}
        {Platform.OS === "ios" && picker ? (
          <Pressable style={styles.pickerClose} onPress={() => setPicker(null)}>
            <Text style={styles.pickerCloseTxt}>Tayyor</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Mehmonlar</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={guests}
          onChangeText={setGuests}
        />

        <Text style={styles.label}>Narx (so'm)</Text>
        <View style={styles.chips}>
          {PRICE_CHIPS.map((c) => (
            <Pressable
              key={c.label}
              style={[styles.chip, minPrice === c.min && maxPrice === c.max && styles.chipOn]}
              onPress={() => {
                setMinPrice(c.min);
                setMaxPrice(c.max);
              }}
            >
              <Text style={[styles.chipTxt, minPrice === c.min && maxPrice === c.max && styles.chipTxtOn]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Yulduzlar</Text>
        <View style={styles.chips}>
          {STAR_CHIPS.map((c) => (
            <Pressable
              key={c.label}
              style={[styles.chip, minStars === c.min && styles.chipOn]}
              onPress={() => setMinStars(c.min)}
            >
              <Text style={[styles.chipTxt, minStars === c.min && styles.chipTxtOn]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.searchBtn} onPress={() => void search()}>
          <Text style={styles.searchBtnTxt}>Qidirish</Text>
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <ListSkeleton rows={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={
            loading ? null : (
              <EmptyState
                icon="🏨"
                title="Mehmonxonalar topilmadi"
                subtitle="Filtrlarni o'zgartirib qayta qidiring"
              />
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
  form: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  label: { fontSize: 12, fontWeight: "800", color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  dateBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
  },
  dateLbl: { fontSize: 11, fontWeight: "700", color: COLORS.gray },
  dateVal: { fontSize: 15, fontWeight: "800", color: COLORS.primary, marginTop: 4 },
  pickerClose: { alignSelf: "flex-end", marginBottom: 8 },
  pickerCloseTxt: { color: COLORS.primaryLight, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.chipSelected },
  chipTxt: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },
  chipTxtOn: { color: COLORS.primary },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  searchBtnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cardImg: { width: 112, height: 112, backgroundColor: COLORS.lightGray },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900", color: COLORS.dark },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingTxt: { fontSize: 13, fontWeight: "800", color: COLORS.dark },
});
