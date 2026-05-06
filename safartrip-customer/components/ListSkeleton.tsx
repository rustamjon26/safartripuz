import { StyleSheet, View } from "react-native";
import { COLORS } from "@/lib/constants";

function Bar({ style }: { style?: object }) {
  return <View style={[styles.bar, style]} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Bar style={styles.img} />
          <View style={styles.body}>
            <Bar style={styles.lineLg} />
            <Bar style={styles.lineSm} />
            <Bar style={styles.lineMd} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  bar: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  img: { width: 108, height: 108 },
  body: { flex: 1, padding: 12, gap: 10, justifyContent: "center" },
  lineLg: { height: 14, width: "88%" },
  lineSm: { height: 12, width: "55%" },
  lineMd: { height: 12, width: "70%" },
});
