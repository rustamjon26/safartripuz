import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { COLORS } from "@/lib/constants";
import { api } from "@/lib/api";

type EarningsItem = {
  id: string;
  date?: string;
  pickupCity?: string;
  dropoffCity?: string;
  grossAmount?: number;
  status?: "PENDING" | "SETTLED" | string;
};

type EarningsResponse = {
  grossAmount?: number;
  platformFee?: number;
  netAmount?: number;
  earnings?: EarningsItem[];
};

function monthParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("uz-UZ", {
    month: "long",
    year: "numeric",
  });
}

export default function EarningsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsResponse>({
    grossAmount: 0,
    platformFee: 0,
    netAmount: 0,
    earnings: [],
  });
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(
        `/api/taxi/driver/earnings?month=${monthParam(selectedMonth)}`,
      );
      const payload = (response?.data ?? response) as EarningsResponse;
      setSummary({
        grossAmount: payload?.grossAmount ?? 0,
        platformFee: payload?.platformFee ?? 0,
        netAmount: payload?.netAmount ?? 0,
        earnings: payload?.earnings ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Daromadlar yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const title = useMemo(() => {
    const text = monthLabel(selectedMonth);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }, [selectedMonth]);

  function prevMonth() {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function nextMonth() {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  const data = summary.earnings ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <View style={styles.screen}>
      <View style={styles.monthSelector}>
        <Pressable onPress={prevMonth} style={styles.monthButton}>
          <MaterialIcons name="chevron-left" size={24} color={COLORS.dark} />
        </Pressable>
        <Text style={styles.monthText}>{title}</Text>
        <Pressable onPress={nextMonth} style={styles.monthButton}>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.dark} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <StatCard
          label="Jami daromad"
          value={`${Number(summary.grossAmount ?? 0).toLocaleString()} so'm`}
          icon="payments"
        />
        <StatCard
          label="Platforma ulushi (15%)"
          value={`${Number(summary.platformFee ?? 0).toLocaleString()} so'm`}
          color={COLORS.gray}
          icon="account-balance"
        />
        <StatCard
          label="Sof daromad"
          value={`${Number(summary.netAmount ?? 0).toLocaleString()} so'm`}
          color={COLORS.success}
          icon="trending-up"
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={data}
        keyExtractor={(item, index) => item.id ?? String(index)}
        refreshControl={
          <RefreshControl refreshing={isLoading && data.length > 0} onRefresh={() => void fetchData()} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemTop}>
              <Text style={styles.itemDate}>{item.date ?? "-"}</Text>
              <StatusBadge status={item.status ?? "PENDING"} size="sm" />
            </View>
            <Text style={styles.routeText}>
              {item.pickupCity ?? "-"} {"->"} {item.dropoffCity ?? "-"}
            </Text>
            <Text style={styles.priceText}>
              {Number(item.grossAmount ?? 0).toLocaleString()} so'm
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="account-balance-wallet" size={38} color={COLORS.gray} />
              <Text style={styles.emptyText}>Bu oyda daromad yo'q</Text>
            </View>
          ) : null
        }
      />
    </View>
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
    padding: 12,
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 10,
  },
  monthButton: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  summaryRow: {
    gap: 8,
    marginBottom: 10,
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
    flexGrow: 1,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemDate: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  routeText: {
    color: COLORS.text,
    fontSize: 14,
  },
  priceText: {
    color: COLORS.dark,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
});
