import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

const FAQ = [
  {
    id: "book",
    q: "Qanday bron qilaman?",
    a: "Asosiy ekrandan xizmatni tanlang (mehmonxona, uy mehmonxonasi, taxi yoki ekskursiya), sanalarni kiriting va bron qilish tugmasini bosing. Bronlar «Bronlar» bo'limida ko'rinadi.",
  },
  {
    id: "cancel",
    q: "Bekor qilish shartlari nima?",
    a: "Har bir xizmatning bekor qilish qoidalari holatiga bog'liq. Ko'pincha PENDING yoki CONFIRMED bosqichida mijoz bekor qilishi mumkin; batafsil ma'lumot bron kartasidagi tugmalar orqali ko'rinadi.",
  },
  {
    id: "pay",
    q: "To'lov xavfsizmi?",
    a: "To'lovlar tanlangan provayder (Click, Payme, Uzum) orqali amalga oshiriladi. Qo'lda o'tkazma uchun faqat tasdiqlangan rekvizitlardan foydalaning.",
  },
  {
    id: "taxi",
    q: "Taxi haydovchisi kelmasa nima qilaman?",
    a: "Buyurtma sahifasidan statusni kuzating. Agar uzoq kutishdan keyin haydovchi tayinlanmasa, buyurtmani bekor qilish va qo'llab-quvvatlash bilan bog'lanish mumkin.",
  },
  {
    id: "dispute",
    q: "Nizo qanday hal qilinadi?",
    a: "Muammo yuzaga kelsa, aloqa bo'limi orqali biz bilan bog'laning. Mijozlar uchun nizo hal qilish jarayoni qo'llanma asosida ko'rib chiqiladi.",
  },
];

export default function ProfileHelpScreen() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {FAQ.map((item) => {
        const expanded = open === item.id;
        return (
          <View key={item.id} style={styles.acc}>
            <Pressable
              style={styles.accHead}
              onPress={() => setOpen(expanded ? null : item.id)}
            >
              <Text style={styles.accQ}>{item.q}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color={COLORS.primary} />
            </Pressable>
            {expanded ? <Text style={styles.accA}>{item.a}</Text> : null}
          </View>
        );
      })}

      <Pressable
        style={styles.supportBtn}
        onPress={() => void Linking.openURL("mailto:support@safartrip.uz")}
      >
        <Text style={styles.supportTxt}>Qo'llab-quvvatlash</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  acc: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: "hidden",
  },
  accHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  accQ: { flex: 1, fontSize: 16, fontWeight: "800", color: COLORS.dark },
  accA: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  supportBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  supportTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
