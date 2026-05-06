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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/ListSkeleton";
import { formatPrice } from "@/lib/formatDate";

type Listing = {
  id: string;
  title: string;
  city: string;
  images: string[];
  pricePerNight: unknown;
  maxGuests: number;
  avgRating: number | null;
  reviewCount?: number;
};

type ListPayload = { data: Listing[]; pagination: { page: number; limit: number; total: number } };

type ApiList = { success?: boolean; data: ListPayload };

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=70&auto=format&fit=crop";

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

export default function HomestaySearchScreen() {
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState(() => startOfDay(new Date()));
  const [checkOut, setCheckOut] = useState(() => addDays(new Date(), 1));
  const [guests, setGuests] = useState("2");
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"in" | "out" | null>(null);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    params.set("checkIn", checkIn.toISOString());
    params.set("checkOut", checkOut.toISOString());
    params.set("guests", String(Math.max(1, Number(guests) || 1)));
    params.set("limit", "30");
    return params.toString();
  }, [city, checkIn, checkOut, guests]);

  const search = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = (await api.get(`/api/homestay?${qs}`)) as ApiList;
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

  function renderItem({ item }: { item: Listing }) {
    const uri = item.images?.[0] || PLACEHOLDER;
    const price = Number(item.pricePerNight);
    return (
      <Pressable style={styles.card} onPress={() => router.push(`/homestay/${item.id}`)}>
        <Image source={{ uri }} style={styles.img} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>{item.city} · {item.maxGuests} gacha mehmon</Text>
          <View style={styles.row}>
            <Text style={styles.price}>{formatPrice(price)} / tun</Text>
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
        <Text style={styles.label}>Shahar</Text>
        <TextInput
          style={styles.input}
          placeholder="Shahar"
          placeholderTextColor={COLORS.gray}
          value={city}
          onChangeText={setCity}
        />
        <View style={styles.dateRow}>
          <Pressable style={styles.dateBtn} onPress={() => setPicker("in")}>
            <Text style={styles.dl}>Kirish</Text>
            <Text style={styles.dv}>{toIso(checkIn)}</Text>
          </Pressable>
          <Pressable style={styles.dateBtn} onPress={() => setPicker("out")}>
            <Text style={styles.dl}>Chiqish</Text>
            <Text style={styles.dv}>{toIso(checkOut)}</Text>
          </Pressable>
        </View>
        {picker ? (
          <DateTimePicker
            value={picker === "in" ? checkIn : checkOut}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(_, d) => {
              if (Platform.OS === "android") setPicker(null);
              if (!d) return;
              if (picker === "in") {
                setCheckIn(startOfDay(d));
                setCheckOut((co) => (co <= d ? addDays(d, 1) : co));
              } else setCheckOut(startOfDay(d));
            }}
          />
        ) : null}
        <Text style={styles.label}>Mehmonlar</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={guests} onChangeText={setGuests} />
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
              <EmptyState icon="🏠" title="Uy mehmonxonalar topilmadi" subtitle="Shahar yoki sanalarni o'zgartirib ko'ring" />
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
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.text,
  },
  dateRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dateBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 10,
  },
  dl: { fontSize: 11, color: COLORS.gray, fontWeight: "700" },
  dv: { fontSize: 15, fontWeight: "800", color: COLORS.primary, marginTop: 4 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
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
  img: { width: 112, height: 112, backgroundColor: COLORS.lightGray },
  body: { flex: 1, padding: 12, justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "900", color: COLORS.dark },
  meta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, alignItems: "center" },
  price: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  pill: { flexDirection: "row", alignItems: "center", gap: 4 },
  pillTxt: { fontWeight: "800", color: COLORS.dark },
});
