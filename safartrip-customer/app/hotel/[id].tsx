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
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { formatPrice } from "@/lib/formatDate";

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  pricePerNight: number;
  capacity: number;
};

type HotelDetail = {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  stars: number;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  images: string[];
  roomTypes: RoomType[];
};

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=70&auto=format&fit=crop";

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

function nightsBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(() => startOfDay(new Date()));
  const [checkOut, setCheckOut] = useState(() => addDays(new Date(), 1));
  const [guests, setGuests] = useState("2");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [picker, setPicker] = useState<"in" | "out" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = (await api.get(`/api/hotels/${id}`)) as { data: HotelDetail };
      setHotel(res.data);
      if (res.data.roomTypes[0]) setSelectedRoomId(res.data.roomTypes[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Xato");
      setHotel(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRoom = useMemo(
    () => hotel?.roomTypes.find((r) => r.id === selectedRoomId) ?? null,
    [hotel, selectedRoomId],
  );

  const total = useMemo(() => {
    if (!selectedRoom) return 0;
    const n = nightsBetween(checkIn, checkOut);
    return selectedRoom.pricePerNight * n;
  }, [selectedRoom, checkIn, checkOut]);

  async function book() {
    if (!hotel || !selectedRoom) return;
    const g = Math.max(1, Number(guests) || 1);
    if (g > selectedRoom.capacity) {
      Alert.alert("Xato", "Mehmonlar soni xona sig'imidan oshmasligi kerak");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/hotels/bookings", {
        hotelId: hotel.id,
        roomTypeId: selectedRoom.id,
        checkIn: toIso(checkIn),
        checkOut: toIso(checkOut),
        guests: g,
        roomCount: 1,
      });
      Alert.alert("OK", "Bron so'rovi yuborildi", [{ text: "Yaxshi" }]);
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Bron qilishda xato");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen text="Yuklanmoqda..." />;
  if (err || !hotel) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom", "left", "right"]}>
        <EmptyState icon="⚠️" title="Xatolik" subtitle={err ?? "Mehmonxona topilmadi"} />
      </SafeAreaView>
    );
  }

  const gallery = hotel.images.length ? hotel.images : [PLACEHOLDER];

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 140 + insets.bottom }]}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {gallery.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.galImg} />
          ))}
        </ScrollView>

        <View style={styles.pad}>
          <Text style={styles.title}>{hotel.name}</Text>
          <Text style={styles.stars}>{hotel.stars}★ mehmonxona</Text>
          {hotel.rating != null ? (
            <Text style={styles.rate}>
              <Ionicons name="star" size={14} color={COLORS.secondary} /> {hotel.rating.toFixed(1)} (
              {hotel.reviewCount} sharh)
            </Text>
          ) : null}
          <Text style={styles.addr}>{hotel.address || hotel.city}</Text>

          {hotel.amenities.length ? (
            <>
              <Text style={styles.sec}>Qulayliklar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amRow}>
                {hotel.amenities.map((a) => (
                  <View key={a} style={styles.amChip}>
                    <Text style={styles.amTxt}>{a}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          {hotel.description ? (
            <>
              <Text style={styles.sec}>Tavsif</Text>
              <Text style={styles.desc}>{hotel.description}</Text>
            </>
          ) : null}

          <Text style={styles.sec}>Xona turlari</Text>
          {hotel.roomTypes.map((rt) => (
            <View key={rt.id} style={[styles.rtCard, selectedRoomId === rt.id && styles.rtCardOn]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rtName}>{rt.name}</Text>
                {rt.description ? <Text style={styles.rtDesc}>{rt.description}</Text> : null}
                <Text style={styles.rtCap}>Sig'im: {rt.capacity} kishi</Text>
                <Text style={styles.rtPrice}>{formatPrice(rt.pricePerNight)} / tun</Text>
              </View>
              <Pressable style={styles.pickBtn} onPress={() => setSelectedRoomId(rt.id)}>
                <Text style={styles.pickBtnTxt}>Tanlash</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.sticky, { paddingBottom: 12 + insets.bottom }]}>
        <Text style={styles.stickyLbl}>Kirish — chiqish</Text>
        <View style={styles.stickyDates}>
          <Pressable style={styles.miniDate} onPress={() => setPicker("in")}>
            <Text style={styles.miniDateV}>{toIso(checkIn)}</Text>
          </Pressable>
          <Pressable style={styles.miniDate} onPress={() => setPicker("out")}>
            <Text style={styles.miniDateV}>{toIso(checkOut)}</Text>
          </Pressable>
        </View>
        {picker ? (
          <>
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
                } else setCheckOut(startOfDay(date));
              }}
            />
            {Platform.OS === "ios" ? (
              <Pressable onPress={() => setPicker(null)} style={styles.iosClose}>
                <Text style={styles.iosCloseTxt}>Tayyor</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        <Text style={styles.stickyLbl}>Mehmonlar</Text>
        <TextInput
          style={styles.stickyInput}
          keyboardType="number-pad"
          value={guests}
          onChangeText={setGuests}
        />
        <Text style={styles.stickyLbl}>Tanlangan xona</Text>
        <Text style={styles.stickyRoom}>{selectedRoom?.name ?? "—"}</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLbl}>Jami</Text>
          <Text style={styles.totalVal}>{formatPrice(total)}</Text>
        </View>
        <Pressable
          style={[styles.bookBtn, submitting && { opacity: 0.7 }]}
          disabled={submitting || !selectedRoom}
          onPress={() => void book()}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.bookBtnTxt}>Bron qilish</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", backgroundColor: COLORS.background },
  scroll: { paddingBottom: 24 },
  gallery: { maxHeight: 220 },
  galImg: { width: 360, height: 220, resizeMode: "cover", backgroundColor: COLORS.lightGray },
  pad: { padding: 16 },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.primary },
  stars: { marginTop: 4, fontWeight: "700", color: COLORS.textSecondary },
  rate: { marginTop: 6, fontSize: 14, color: COLORS.dark, fontWeight: "600" },
  addr: { marginTop: 8, fontSize: 15, color: COLORS.text },
  sec: { marginTop: 20, fontSize: 14, fontWeight: "900", color: COLORS.dark },
  amRow: { marginTop: 10, flexDirection: "row" },
  amChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  amTxt: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  desc: { marginTop: 8, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  rtCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    gap: 12,
  },
  rtCardOn: { borderColor: COLORS.primary },
  rtName: { fontSize: 16, fontWeight: "900", color: COLORS.dark },
  rtDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  rtCap: { fontSize: 13, fontWeight: "600", marginTop: 6, color: COLORS.text },
  rtPrice: { fontSize: 15, fontWeight: "800", color: COLORS.primary, marginTop: 6 },
  pickBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickBtnTxt: { fontWeight: "900", color: COLORS.dark, fontSize: 13 },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stickyLbl: { fontSize: 11, fontWeight: "800", color: COLORS.gray },
  stickyDates: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 8 },
  miniDate: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  miniDateV: { fontWeight: "800", color: COLORS.primary, textAlign: "center" },
  stickyInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  stickyRoom: { fontSize: 15, fontWeight: "800", color: COLORS.dark, marginBottom: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  totalLbl: { fontSize: 16, fontWeight: "800", color: COLORS.textSecondary },
  totalVal: { fontSize: 18, fontWeight: "900", color: COLORS.primary },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  bookBtnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
  iosClose: { alignSelf: "flex-end", paddingVertical: 6 },
  iosCloseTxt: { color: COLORS.primaryLight, fontWeight: "800" },
});
