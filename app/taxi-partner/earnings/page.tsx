"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Earning = {
  id: string;
  createdAt: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: "PENDING" | "SETTLED";
  order: {
    pickupAddress: string;
    dropoffAddress: string;
  };
};

export default function TaxiEarningsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  });
  const [items, setItems] = useState<Earning[]>([]);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
  }, [searchParams]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/taxi/driver/earnings?month=${month}`);
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [month]);

  const summary = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc.gross += Number(item.grossAmount);
          acc.fee += Number(item.platformFee);
          acc.net += Number(item.netAmount);
          return acc;
        },
        { gross: 0, fee: 0, net: 0 },
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((e) =>
      `${e.order?.pickupAddress ?? ""} ${e.order?.dropoffAddress ?? ""} ${e.id}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Moliya va To&apos;lovlar
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Daromad, komissiya va to&apos;lovlar tarixi
          </p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-xl px-3 py-2">
          <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
            Oy
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="tp-input !py-1.5 !bg-transparent !border-0 !px-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-4">
        <div className="rounded-2xl bg-[#0d2137] text-white p-5 sm:p-6 relative overflow-hidden">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-white/45">
            Umumiy balans (net)
          </p>
          <p className="text-[28px] sm:text-[32px] font-display font-bold mt-2 leading-none">
            {summary.net.toLocaleString("uz-UZ")} UZS
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <p className="text-white/45 font-semibold">Gross</p>
              <p className="font-bold mt-0.5">{summary.gross.toLocaleString("uz-UZ")}</p>
            </div>
            <div>
              <p className="text-white/45 font-semibold">Komissiya</p>
              <p className="font-bold mt-0.5 text-[#f5d1b0]">{summary.fee.toLocaleString("uz-UZ")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Jami tranzaksiyalar
          </p>
          <p className="text-[28px] font-display font-bold text-[#0d2137] mt-2">{items.length}</p>
          <p className="text-[12px] text-[#64748B] mt-2 font-medium">Tanlangan oy bo&apos;yicha</p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
            To&apos;lov turlari
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-[12px] font-semibold mb-1">
                <span className="text-[#64748B]">Net</span>
                <span>
                  {summary.gross > 0
                    ? Math.round((summary.net / summary.gross) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f3ff] overflow-hidden">
                <div
                  className="h-full bg-[#0d2137] rounded-full"
                  style={{
                    width: `${summary.gross > 0 ? (summary.net / summary.gross) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] font-semibold mb-1">
                <span className="text-[#64748B]">Komissiya</span>
                <span>
                  {summary.gross > 0
                    ? Math.round((summary.fee / summary.gross) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f3ff] overflow-hidden">
                <div
                  className="h-full bg-[#006781] rounded-full"
                  style={{
                    width: `${summary.gross > 0 ? (summary.fee / summary.gross) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#d8e3fb]">
          <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">
            Oxirgi to&apos;lovlar tarixi
          </h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Sana</th>
                  <th className="py-3 px-5">Yo&apos;nalish</th>
                  <th className="py-3 px-5">Gross</th>
                  <th className="py-3 px-5">Fee</th>
                  <th className="py-3 px-5">Net</th>
                  <th className="py-3 px-5">Holat</th>
                </tr>
              </thead>
              <tbody className="text-[13px] divide-y divide-[#d8e3fb]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 px-5">
                      <EmptyState
                        title="Daromadlar yo'q"
                        message="Hali yakunlangan safarlar bo'lmagan."
                        ctaHref="/taxi-partner/orders"
                        ctaLabel="Buyurtmalarni ko'rish"
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-[#f9f9ff]">
                      <td className="py-3 px-5 font-[family-name:var(--font-sora)] font-semibold text-[#0d2137]">
                        #{e.id.slice(-6)}
                      </td>
                      <td className="py-3 px-5 text-[#64748B]">
                        {new Date(e.createdAt).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5 text-[#64748B] max-w-[240px] truncate">
                        {e.order?.pickupAddress} → {e.order?.dropoffAddress}
                      </td>
                      <td className="py-3 px-5 font-bold tabular-nums">
                        {Number(e.grossAmount).toLocaleString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5 tabular-nums">
                        {Number(e.platformFee).toLocaleString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5 font-bold tabular-nums">
                        {Number(e.netAmount).toLocaleString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5">
                        <span
                          className={
                            e.status === "PENDING"
                              ? "tp-badge tp-badge-wait"
                              : "tp-badge tp-badge-ok"
                          }
                        >
                          {e.status === "PENDING" ? "Kutilmoqda" : "Bajarildi"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
