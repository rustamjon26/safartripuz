import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { formatDate, formatPrice } from "@/lib/formatDate";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  guest?: { first_name: string; last_name: string };
};

type Listing = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  images: string[];
  amenities: string[];
  rooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: unknown;
  host: { name: string };
  reviews: Review[];
  avgRating: number | null;
  reviewCount: number;
};

type CheckRes = {
  available: boolean;
  totalPrice: number;
  nights: number;
};

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=70&auto=format&fit=crop";

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

export default function HomestayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(() => startOfDay(new Date()));
  const [checkOut, setCheckOut] = useState(() => addDays(new Date(), 1));
  const [guests, setGuests] = useState("2");
  const [picker, setPicker] = useState<"in" | "out" | null>(null);
  const [checkRes, setCheckRes] = useState<CheckRes | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = (await api.get(`/api/homestay/${id}`)) as { data: Listing };
      setListing(res.data);
      setGuests(String(Math.min(Number(res.data.maxGuests), 2)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xato");
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runCheck = useCallback(async () => {
    if (!id) return;
    const gc = Math.max(1, Number(guests) || 1);
    setChecking(true);
    setCheckErr(null);
    try {
      const res = (await api.post(`/api/homestay/${id}/check-availability`, {
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guestCount: gc,
      })) as { data: CheckRes };
      setCheckRes(res.data);
      if (!res.data.available) setCheckErr("Bu sanalar band");
    } catch (e) {
      setCheckRes(null);
      setCheckErr(e instanceof Error ? e.message : "Tekshirishda xato");
    } finally {
      setChecking(false);
    }
  }, [id, checkIn, checkOut, guests]);

  useEffect(() => {
    if (!listing) return;
    const t = setTimeout(() => void runCheck(), 400);
    return () => clearTimeout(t);
  }, [listing, runCheck]);

  const maxG = listing?.maxGuests ?? 20;
  const reviews3 = useMemo(() => (listing?.reviews ?? []).slice(0, 3), [listing]);

  async function book() {
    if (!listing || !checkRes?.available) return;
    const gc = Math.max(1, Math.min(maxG, Number(guests) || 1));
    setSubmitting(true);
    try {
      await api.post("/api/homestay/bookings", {
        listingId: listing.id,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guestCount: gc,
        totalPrice: checkRes.totalPrice,
      });
      Alert.alert("OK", "Bron yaratildi", [{ text: "Yaxshi", onPress: () => router.push("/(tabs)/bookings") }]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Bron qilishda xato");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen text="Yuklanmoqda..." />;
  if (err || !listing) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom", "left", "right"]}>
        <EmptyState icon="⚠️" title="Xatolik" subtitle={err ?? "Listing topilmadi"} />
      </SafeAreaView>
    );
  }

  const imgs = listing.images?.length ? listing.images : [PLACEHOLDER];

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gal}>
          {imgs.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.galImg} />
          ))}
        </ScrollView>
        <View style={styles.pad}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.host}>Mezbon: {listing.host.name}</Text>
          <View style={styles.rowStat}>
            <Text style={styles.stat}>{listing.rooms} xona</Text>
            <Text style={styles.stat}>{listing.beds} karavot</Text>
            <Text style={styles.stat}>{listing.bathrooms} vanna</Text>
          </View>

          {listing.amenities?.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {listing.amenities.map((a) => (
                <View key={a} style={styles.chip}>
                  <Text style={styles.chipTxt}>{a}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <Text style={styles.sec}>Tavsif</Text>
          <Text style={styles.desc}>{listing.description}</Text>

          <Text style={styles.sec}>Sharhlar</Text>
          {reviews3.length === 0 ? (
            <Text style={styles.muted}>Hozircha sharh yo'q</Text>
          ) : (
            reviews3.map((r) => (
              <View key={r.id} style={styles.rev}>
                <Text style={styles.revName}>
                  {(r.guest?.first_name ?? "M") + " " + (r.guest?.last_name ?? "")} · {r.rating}★
                </Text>
                {r.comment ? <Text style={styles.revCom}>{r.comment}</Text> : null}
                <Text style={styles.revDate}>{formatDate(r.createdAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <Text style={styles.lbl}>Sanalar</Text>
        <View style={styles.dates}>
          <Pressable style={styles.dcell} onPress={() => setPicker("in")}>
            <Text style={styles.dv}>{checkIn.toISOString().slice(0, 10)}</Text>
          </Pressable>
          <Pressable style={styles.dcell} onPress={() => setPicker("out")}>
            <Text style={styles.dv}>{checkOut.toISOString().slice(0, 10)}</Text>
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
        {checking ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 6 }} /> : null}
        {checkRes && checkRes.available ? (
          <Text style={styles.sum}>
            {checkRes.nights} tun · {formatPrice(checkRes.totalPrice)}
          </Text>
        ) : null}
        {checkErr ? <Text style={styles.err}>{checkErr}</Text> : null}

        <Text style={styles.lbl}>Mehmonlar (max {maxG})</Text>
        <TextInput
          style={styles.inp}
          keyboardType="number-pad"
          value={guests}
          onChangeText={(t) => setGuests(t.replace(/[^\d]/g, ""))}
        />

        <Pressable
          style={[styles.book, (!checkRes?.available || submitting) && { opacity: 0.5 }]}
          disabled={!checkRes?.available || submitting}
          onPress={() => void book()}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.bookTxt}>Bron qilish</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", backgroundColor: COLORS.background },
  gal: { maxHeight: 220 },
  galImg: { width: 360, height: 220, resizeMode: "cover", backgroundColor: COLORS.lightGray },
  pad: { padding: 16 },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.primary },
  host: { marginTop: 6, fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },
  rowStat: { flexDirection: "row", gap: 12, marginTop: 10 },
  stat: { fontSize: 14, fontWeight: "700", color: COLORS.dark },
  chips: { marginTop: 14, flexDirection: "row" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  chipTxt: { fontSize: 13, fontWeight: "600" },
  sec: { marginTop: 18, fontSize: 14, fontWeight: "900", color: COLORS.dark },
  desc: { marginTop: 8, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  muted: { color: COLORS.gray, marginTop: 6 },
  rev: {
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  revName: { fontWeight: "800", color: COLORS.dark },
  revCom: { marginTop: 6, color: COLORS.text },
  revDate: { marginTop: 4, fontSize: 12, color: COLORS.gray },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  lbl: { fontSize: 11, fontWeight: "800", color: COLORS.gray },
  dates: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 6 },
  dcell: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  dv: { fontWeight: "800", color: COLORS.primary, textAlign: "center" },
  sum: { fontSize: 16, fontWeight: "900", color: COLORS.primary, marginBottom: 4 },
  err: { color: COLORS.danger, fontWeight: "700", marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  book: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
