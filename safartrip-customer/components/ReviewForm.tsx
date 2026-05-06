import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

type Props = {
  onSubmit: (rating: number, comment: string) => void;
  isLoading: boolean;
  submitLabel?: string;
  /** Modal ichida ikki marta oq fon bo'lmasin */
  plain?: boolean;
};

export function ReviewForm({ onSubmit, isLoading, submitLabel = "Yuborish", plain }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const inner = (
    <>
      <Text style={styles.title}>Baho qoldiring</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Pressable key={s} onPress={() => setRating(s)} hitSlop={6}>
            <Ionicons name={s <= rating ? "star" : "star-outline"} size={36} color={COLORS.star} />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.ta}
        placeholder="Izoh (ixtiyoriy)"
        placeholderTextColor={COLORS.gray}
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <Pressable
        style={styles.btn}
        disabled={isLoading}
        onPress={() => onSubmit(rating, comment.trim())}
      >
        {isLoading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnTxt}>{submitLabel}</Text>}
      </Pressable>
    </>
  );

  if (plain) {
    return <View>{inner}</View>;
  }

  return <View style={styles.card}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  title: { fontSize: 16, fontWeight: "900", color: COLORS.primary, marginBottom: 10 },
  stars: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  ta: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    textAlignVertical: "top",
    fontSize: 15,
    color: COLORS.text,
  },
  btn: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnTxt: { color: COLORS.white, fontWeight: "900", fontSize: 16 },
});
