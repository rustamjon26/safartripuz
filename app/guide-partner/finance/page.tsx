"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Percent, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type EarningRow = {
  id: string;
  bookingId: string;
  grossAmount: number | string;
  commissionFee: number | string;
  netAmount: number | string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

type Summary = {
  totalNet: number;
  pendingNet: number;
  totalCommission: number;
  pendingCount: number;
};

function money(v: number | string): number {
  return Number(v ?? 0);
}

function statusBadge(status: string): string {
  if (status === "SETTLED" || status === "PAID" || status === "COMPLETED") {
    return "gp-badge gp-badge-ok";
  }
  if (status === "PENDING") return "gp-badge gp-badge-wait";
  if (status === "CANCELLED" || status === "FAILED") return "gp-badge gp-badge-cancel";
  return "gp-badge gp-badge-muted";
}

function statusLabel(status: string): string {
  switch (status) {
    case "SETTLED":
    case "PAID":
    case "COMPLETED":
      return "Bajarildi";
    case "PENDING":
      return "Kutilmoqda";
    case "CANCELLED":
      return "Bekor";
    default:
      return status;
  }
}

export default function GuidePartnerFinancePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<EarningRow[]>([]);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/guide/earnings");
        const data = await res.json();
        if (data?.onboarding) {
          setOnboarding(true);
          return;
        }
        if (res.ok) {
          setSummary({
            totalNet: Number(data.summary?.totalNet ?? 0),
            pendingNet: Number(data.summary?.pendingNet ?? 0),
            totalCommission: Number(data.summary?.totalCommission ?? 0),
            pendingCount: Number(data.summary?.pendingCount ?? 0),
          });
          setItems((data.earnings || []) as EarningRow[]);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((e) =>
      `${e.id} ${e.bookingId} ${e.status}`.toLowerCase().includes(query),
    );
  }, [items, q]);

  const lastPayment = useMemo(() => {
    const settled = items.find((e) => ["SETTLED", "PAID", "COMPLETED"].includes(e.status));
    return settled ?? items[0] ?? null;
  }, [items]);

  if (onboarding) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Moliyaviy boshqaruv
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Avval faol listing yarating — keyin daromadlar shu yerda chiqadi.
          </p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-6">
          <EmptyState
            title="Onboarding tugallanmagan"
            message="Faol tajriba (listing) bo‘lishi kerak."
            ctaHref="/guide-partner/listings/new"
            ctaLabel="Listing yaratish"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Moliyaviy boshqaruv
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Daromadlaringiz va to&apos;lovlar tarixingizni kuzatib boring.
          </p>
        </div>
        <Link href="/guide-partner/listings/new" className="gp-btn gp-btn-primary">
          Yangi tur
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Joriy balans
            </p>
            <span className="w-9 h-9 rounded-xl bg-[#f0f3ff] text-[#006781] flex items-center justify-center">
              <Wallet size={16} />
            </span>
          </div>
          <p className="text-[28px] font-display font-bold text-[#0d2137] mt-3 leading-none tabular-nums">
            {loading ? "—" : `${(summary?.totalNet ?? 0).toLocaleString("uz-UZ")} UZS`}
          </p>
          <p className="text-[12px] text-[#64748B] mt-2 font-medium">
            Kutilayotgan: {(summary?.pendingNet ?? 0).toLocaleString("uz-UZ")} UZS
          </p>
        </div>

        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Oxirgi to&apos;lov
          </p>
          <p className="text-[28px] font-display font-bold text-[#0d2137] mt-3 leading-none tabular-nums">
            {loading || !lastPayment
              ? "—"
              : `${money(lastPayment.netAmount).toLocaleString("uz-UZ")} UZS`}
          </p>
          <p className="text-[12px] text-[#64748B] mt-2 font-medium">
            {lastPayment
              ? `Sana: ${new Date(lastPayment.paidAt || lastPayment.createdAt).toLocaleDateString("uz-UZ")}`
              : "Hali to‘lov yo‘q"}
          </p>
        </div>

        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Komissiya
            </p>
            <span className="w-9 h-9 rounded-xl bg-[#f0f3ff] text-[#006781] flex items-center justify-center">
              <Percent size={16} />
            </span>
          </div>
          <p className="text-[28px] font-display font-bold text-[#006781] mt-3 leading-none tabular-nums">
            {loading ? "—" : `${(summary?.totalCommission ?? 0).toLocaleString("uz-UZ")} UZS`}
          </p>
          <p className="text-[12px] text-[#64748B] mt-2 font-medium">
            {summary?.pendingCount ?? 0} ta PENDING yozuv
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5">
          <h3 className="font-display font-semibold text-[#0d2137] text-[16px] mb-2">
            Daromad xulosasi
          </h3>
          <p className="text-[12px] text-[#64748B] mb-4">
            Ledger asosidagi payable balans va PartnerEarning yozuvlari.
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[12px] font-semibold mb-1">
                <span className="text-[#64748B]">Net (payable)</span>
                <span>{(summary?.totalNet ?? 0).toLocaleString("uz-UZ")}</span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f3ff] overflow-hidden">
                <div className="h-full w-[85%] bg-[#0d2137] rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] font-semibold mb-1">
                <span className="text-[#64748B]">Komissiya</span>
                <span>{(summary?.totalCommission ?? 0).toLocaleString("uz-UZ")}</span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f3ff] overflow-hidden">
                <div className="h-full w-[45%] bg-[#006781] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0d2137] text-white p-5 relative overflow-hidden">
          <span className="inline-flex px-2 py-1 rounded-full bg-[#b9eaff] text-[#001f29] text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase">
            Premium hamkor
          </span>
          <p className="font-display font-semibold text-[18px] mt-3 leading-snug">
            Ko&apos;proq turlar — barqaror daromad
          </p>
          <p className="text-[12px] text-white/60 mt-2 leading-relaxed">
            Yangi tajribalar qo&apos;shib, bandlovlar oqimini oshiring.
          </p>
          <Link
            href="/guide-partner/listings/new"
            className="inline-flex mt-4 px-4 py-2 rounded-xl bg-white text-[#0d2137] text-[12px] font-[family-name:var(--font-sora)] font-semibold"
          >
            Tafsilotlarni ko&apos;rish
          </Link>
        </div>
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#d8e3fb]">
          <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">
            To&apos;lovlar tarixi
          </h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="To'lovlar yo'q"
              message="Yakunlangan bandlovlar shu yerda ko'rinadi."
              ctaHref="/guide-partner/bookings"
              ctaLabel="Bandlovlar"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">Tranzaksiya</th>
                  <th className="py-3 px-5">Booking</th>
                  <th className="py-3 px-5">Sana</th>
                  <th className="py-3 px-5">Gross</th>
                  <th className="py-3 px-5">Fee</th>
                  <th className="py-3 px-5">Net</th>
                  <th className="py-3 px-5">Holat</th>
                </tr>
              </thead>
              <tbody className="text-[13px] divide-y divide-[#d8e3fb]">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-[#f9f9ff]">
                    <td className="py-3 px-5 font-[family-name:var(--font-sora)] font-semibold text-[#0d2137]">
                      #{e.id.slice(-6)}
                    </td>
                    <td className="py-3 px-5 text-[#64748B]">#{e.bookingId.slice(-6)}</td>
                    <td className="py-3 px-5 text-[#64748B]">
                      {new Date(e.createdAt).toLocaleDateString("uz-UZ")}
                    </td>
                    <td className="py-3 px-5 font-bold tabular-nums">
                      {money(e.grossAmount).toLocaleString("uz-UZ")}
                    </td>
                    <td className="py-3 px-5 tabular-nums">
                      {money(e.commissionFee).toLocaleString("uz-UZ")}
                    </td>
                    <td className="py-3 px-5 font-bold tabular-nums text-[#006781]">
                      {money(e.netAmount).toLocaleString("uz-UZ")}
                    </td>
                    <td className="py-3 px-5">
                      <span className={statusBadge(e.status)}>{statusLabel(e.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
