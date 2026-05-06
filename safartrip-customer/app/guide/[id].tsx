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
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { formatDate, formatPrice } from "@/lib/formatDate";

const DOW = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sha"];

type Avail = { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean };
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  guest?: { first_name: string; last_name: string };
};
type Blocked = { date: string };

type ListingDetail = {
  id: string;
  title: string;
  description: string;
  category: string;
  meetingPoint: string | null;
  region: string | null;
  images: string[];
  languages: string[];
  rating: number;
  totalBookings: number;
  pricePerHour: unknown;
  minHours: number;
  maxHours: number;
  maxGroupSize: number;
  availabilities: Avail[];
  reviews: Review[];
  blockedSlots?: Blocked[];
  guide: { name: string; languages: string[]; rating: number; totalBookings: number };
};

type CheckData = { available: boolean; totalPrice: number; hours: number; conflicts?: { message?: string }[] };

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=70&auto=format&fit=crop";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [bookDate, setBookDate] = useState(() => startOfDay(new Date()));
  const [showBookDate, setShowBookDate] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [groupSize, setGroupSize] = useState("2");
  const [check, setCheck] = useState<CheckData | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = (await api.get(`/api/guide/${id}`)) as { data: ListingDetail };
      setListing(res.data);
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

  const openDays = useMemo(() => {
    const s = new Set<number>();
    for (const a of listing?.availabilities ?? []) {
      if (a.isAvailable) s.add(a.dayOfWeek);
    }
    return s;
  }, [listing]);

  const blockedDays = useMemo(() => {
    const s = new Set<string>();
    for (const b of listing?.blockedSlots ?? []) {
      const d = typeof b.date === "string" ? b.date.slice(0, 10) : new Date(b.date as string).toISOString().slice(0, 10);
      s.add(d);
    }
    return s;
  }, [listing]);

  const runCheck = useCallback(async () => {
    if (!id) return;
    const gs = Math.max(1, Number(groupSize) || 1);
    setChecking(true);
    setCheckErr(null);
    try {
      const res = (await api.post(`/api/guide/${id}/check-availability`, {
        date: bookDate.toISOString(),
        startTime,
        endTime,
        groupSize: gs,
      })) as { data: CheckData };
      setCheck(res.data);
      if (!res.data.available) {
        const msg = res.data.conflicts?.[0]?.message ?? "Bu vaqt band";
        setCheckErr(msg);
      }
    } catch (e) {
      setCheck(null);
      setCheckErr(e instanceof Error ? e.message : "Xato");
    } finally {
      setChecking(false);
    }
  }, [id, bookDate, startTime, endTime, groupSize]);

  useEffect(() => {
    if (!listing) return;
    const t = setTimeout(() => void runCheck(), 450);
    return () => clearTimeout(t);
  }, [listing, runCheck]);

  async function book() {
    if (!listing || !check?.available) return;
    const gs = Math.max(1, Math.min(listing.maxGroupSize, Number(groupSize) || 1));
    setSubmitting(true);
    try {
      await api.post("/api/guide/bookings", {
        listingId: listing.id,
        date: bookDate.toISOString(),
        startTime,
        endTime,
        groupSize: gs,
      });
      router.replace("/(tabs)/bookings");
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
        <EmptyState icon="⚠️" title="Xatolik" subtitle={err ?? "Qo'llanma topilmadi"} />
      </SafeAreaView>
    );
  }

  const imgs = listing.images?.length ? listing.images : [PLACEHOLDER];
  const langs = listing.guide?.languages?.length ? listing.guide.languages : listing.languages;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gal}>
          {imgs.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.galImg} />
          ))}
        </ScrollView>

        <View style={styles.pad}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.langRow}>
            {langs.map((l) => (
              <View key={l} style={styles.langChip}>
                <Text style={styles.langTxt}>{l}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.meta}>
            {listing.guide.name} · {listing.rating.toFixed(1)}★ · {listing.totalBookings} bron
          </Text>
          <Text style={styles.cat}>{listing.category}</Text>
          {listing.meetingPoint ? <Text style={styles.mp}>Uchrashuv: {listing.meetingPoint}</Text> : null}
          <Text style={styles.desc}>{listing.description}</Text>

          <Text style={styles.sec}>Haftalik mavjudlik</Text>
          <View style={styles.week}>
            {DOW.map((label, dow) => {
              const okd = openDays.has(dow);
              return (
                <View key={label} style={[styles.dayChip, okd ? styles.dayOk : styles.dayNo]}>
                  <Text style={[styles.dayTxt, okd && styles.dayTxtOk]}>{label}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.sec}>Sharhlar</Text>
          {(listing.reviews ?? []).length === 0 ? (
            <Text style={styles.muted}>Hozircha sharh yo'q</Text>
          ) : (
            (listing.reviews ?? []).map((r) => (
              <View key={r.id} style={styles.rev}>
                <Text style={styles.revH}>
                  {(r.guest?.first_name ?? "M") + " · " + r.rating}★
                </Text>
                {r.comment ? <Text style={styles.revC}>{r.comment}</Text> : null}
                <Text style={styles.revD}>{formatDate(r.createdAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <Text style={styles.lbl}>Sana</Text>
        <Pressable style={styles.inp} onPress={() => setShowBookDate(true)}>
          <Text style={styles.inpTxt}>
            {isoDay(bookDate)} ({DOW[bookDate.getDay()]})
            {blockedDays.has(isoDay(bookDate)) ? " · band" : ""}
          </Text>
        </Pressable>
        {showBookDate ? (
          <DateTimePicker
            value={bookDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(_, d) => {
              if (Platform.OS === "android") setShowBookDate(false);
              if (d) setBookDate(startOfDay(d));
            }}
          />
        ) : null}

        <Text style={styles.lbl}>Boshlash / tugash (HH:MM)</Text>
        <View style={styles.row2}>
          <TextInput style={styles.ti} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          <TextInput style={styles.ti} value={endTime} onChangeText={setEndTime} placeholder="13:00" />
        </View>

        <Text style={styles.lbl}>Guruh (max {listing.maxGroupSize})</Text>
        <TextInput
          style={styles.inp}
          keyboardType="number-pad"
          value={groupSize}
          onChangeText={setGroupSize}
        />

        <Pressable style={styles.calc} onPress={() => void runCheck()}>
          <Text style={styles.calcTxt}>Narx hisoblash</Text>
        </Pressable>
        {checking ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 6 }} /> : null}
        {check && check.available ? (
          <Text style={styles.sum}>
            {check.hours} soat · {formatPrice(check.totalPrice)}
          </Text>
        ) : null}
        {checkErr ? <Text style={styles.err}>{checkErr}</Text> : null}

        <Pressable
          style={[styles.book, (!check?.available || submitting) && { opacity: 0.5 }]}
          disabled={!check?.available || submitting}
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
  langRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.chipSelected,
  },
  langTxt: { fontWeight: "800", color: COLORS.primary, fontSize: 12 },
  meta: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  cat: { marginTop: 6, fontWeight: "900", color: COLORS.secondary, fontSize: 13 },
  mp: { marginTop: 8, fontSize: 14, color: COLORS.text },
  desc: { marginTop: 12, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  sec: { marginTop: 20, fontSize: 14, fontWeight: "900", color: COLORS.dark },
  week: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  dayOk: { borderColor: COLORS.success, backgroundColor: COLORS.surfaceSuccess },
  dayNo: { borderColor: COLORS.lightGray, backgroundColor: COLORS.white },
  dayTxt: { fontWeight: "800", color: COLORS.gray, fontSize: 12 },
  dayTxtOk: { color: COLORS.success },
  muted: { color: COLORS.gray, marginTop: 6 },
  rev: {
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  revH: { fontWeight: "900", color: COLORS.dark },
  revC: { marginTop: 6, color: COLORS.text },
  revD: { marginTop: 4, fontSize: 12, color: COLORS.gray },
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
  inp: {
    marginTop: 6,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
    marginBottom: 8,
  },
  inpTxt: { fontWeight: "800", color: COLORS.primary },
  row2: { flexDirection: "row", gap: 8, marginBottom: 8 },
  ti: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  calc: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  calcTxt: { fontWeight: "900", color: COLORS.dark },
  sum: { fontSize: 16, fontWeight: "900", color: COLORS.primary },
  err: { color: COLORS.danger, fontWeight: "700", marginTop: 4 },
  book: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
