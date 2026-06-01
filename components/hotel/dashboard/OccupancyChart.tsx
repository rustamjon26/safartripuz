"use client";

import { Cell, Pie, PieChart } from "recharts";
import type { HotelDashboardStats } from "@/lib/hotel/getHotelDashboardStats";

type RoomStats = HotelDashboardStats["rooms"];

type OccupancyChartProps = {
  rooms?: RoomStats | null;
  occupancyRate?: number;
  loading?: boolean;
  labels: {
    available: string;
    occupied: string;
    cleaning: string;
    maintenance: string;
    blocked: string;
    centerLabel: string;
  };
};

const SEGMENTS = [
  { key: "available", color: "#22c55e" },
  { key: "occupied", color: "#3b82f6" },
  { key: "cleaning", color: "#f59e0b" },
  { key: "maintenance", color: "#f97316" },
  { key: "blocked", color: "#9ca3af" },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]["key"];

function buildChartData(rooms: RoomStats, labels: OccupancyChartProps["labels"]) {
  const labelMap: Record<SegmentKey, string> = {
    available: labels.available,
    occupied: labels.occupied,
    cleaning: labels.cleaning,
    maintenance: labels.maintenance,
    blocked: labels.blocked,
  };

  return SEGMENTS.map(({ key, color }) => ({
    key,
    name: labelMap[key],
    value: rooms[key],
    color,
  }));
}

function ChartSkeleton() {
  return (
    <div className="w-[280px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse">
      <div className="w-[280px] h-[280px] rounded-full bg-gray-100 mx-auto" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded w-full" />
        ))}
      </div>
    </div>
  );
}

export default function OccupancyChart({
  rooms,
  occupancyRate = 0,
  loading,
  labels,
}: OccupancyChartProps) {
  if (loading) return <ChartSkeleton />;

  const safeRooms: RoomStats = rooms ?? {
    total: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
    blocked: 0,
  };

  const chartData = buildChartData(safeRooms, labels);
  const pieData = chartData.filter((item) => item.value > 0);
  const displayData =
    pieData.length > 0
      ? pieData
      : [{ key: "empty", name: labels.available, value: 1, color: "#e5e7eb" }];

  return (
    <div className="w-[280px] shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-sm self-center lg:self-start">
      <div className="relative w-[280px] h-[280px]">
        <PieChart width={280} height={280}>
          <Pie
            data={displayData}
            dataKey="value"
            cx={140}
            cy={140}
            innerRadius={78}
            outerRadius={110}
            paddingAngle={pieData.length > 1 ? 2 : 0}
            stroke="none"
          >
            {displayData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-[var(--primary)] tabular-nums leading-none">
            {occupancyRate}%
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
            {labels.centerLabel}
          </span>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5">
        {chartData.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold text-slate-600 truncate">{item.name}</span>
            </span>
            <span className="font-black text-slate-800 tabular-nums shrink-0">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
