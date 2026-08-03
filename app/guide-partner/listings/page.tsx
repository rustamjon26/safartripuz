"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Edit3, Plus, ShoppingBag, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Listing = {
  id: string;
  title: string;
  category: string;
  pricePerHour: number;
  languages: string[];
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "BLOCKED";
  bookingCount?: number;
  totalBookings?: number;
  images?: string[];
  description?: string | null;
};

function statusBadge(status: string): string {
  if (status === "ACTIVE") return "gp-badge gp-badge-ok";
  if (status === "PENDING") return "gp-badge gp-badge-wait";
  if (status === "REJECTED" || status === "BLOCKED") return "gp-badge gp-badge-cancel";
  return "gp-badge gp-badge-muted";
}

function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Faol";
    case "PENDING":
      return "Kutilmoqda";
    case "INACTIVE":
      return "Nofaol";
    case "REJECTED":
      return "Rad etilgan";
    case "BLOCKED":
      return "Bloklangan";
    default:
      return status;
  }
}

export default function GuidePartnerListingsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/guide/partner/listings");
        const data = await res.json();
        if (res.ok && data.success) setItems((data.data?.data || []) as Listing[]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      `${item.title} ${item.category} ${item.languages?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, q]);

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === "ACTIVE").length;
    const sold = items.reduce((s, i) => s + Number(i.bookingCount ?? i.totalBookings ?? 0), 0);
    return { total: items.length, active, sold };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Mening tajribalarim
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Turlar katalogi va holat monitoringi
          </p>
        </div>
        <Link href="/guide-partner/listings/new" className="gp-btn gp-btn-navy">
          <Plus size={14} />
          Yangi tajriba yaratish
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Jami turlar
          </p>
          <p className="text-[26px] font-display font-bold text-[#0d2137] mt-2">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Faol
          </p>
          <p className="text-[26px] font-display font-bold text-emerald-600 mt-2">{stats.active}</p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Sotilgan
            </p>
            <p className="text-[26px] font-display font-bold text-[#0d2137] mt-2">{stats.sold}</p>
          </div>
          <ShoppingBag size={18} className="text-[#006781] mt-1" />
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Narx / soat
            </p>
            <p className="text-[18px] font-display font-bold text-[#006781] mt-2">
              {items[0] ? `${Number(items[0].pricePerHour).toLocaleString("uz-UZ")}` : "—"}
            </p>
          </div>
          <Wallet size={18} className="text-[#006781] mt-1" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-6">
          <EmptyState
            title="Listing yo'q"
            message="Yangi listing yarating."
            ctaHref="/guide-partner/listings/new"
            ctaLabel="Yangi listing"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cover = item.images?.[0];
            return (
              <div
                key={item.id}
                className="bg-white border border-[#d8e3fb] rounded-2xl overflow-hidden shadow-sm flex flex-col"
              >
                <div
                  className="h-40 bg-[#f0f3ff] relative bg-cover bg-center"
                  style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                >
                  <span className="absolute top-3 left-3 gp-badge gp-badge-info bg-black/50 text-white">
                    {item.category}
                  </span>
                  <span className={`absolute top-3 right-3 ${statusBadge(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-[#0d2137] text-[17px] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[15px] font-bold text-[#006781] shrink-0 tabular-nums">
                      {Number(item.pricePerHour).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-2 line-clamp-2">
                    {item.languages?.join(", ") || "Tillar ko‘rsatilmagan"} ·{" "}
                    {item.bookingCount ?? item.totalBookings ?? 0} bandlov
                  </p>
                  <div className="mt-auto pt-4 flex items-center gap-2">
                    <Link
                      href={`/guide-partner/listings/${item.id}/edit`}
                      className="gp-btn gp-btn-soft flex-1 !py-2"
                    >
                      <Edit3 size={14} />
                      Tahrirlash
                    </Link>
                    <Link
                      href={`/guide-partner/listings/${item.id}/calendar`}
                      className="gp-btn gp-btn-ghost !py-2 !px-3"
                      title="Kalendar"
                    >
                      <CalendarDays size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            href="/guide-partner/listings/new"
            className="min-h-[280px] rounded-2xl border-2 border-dashed border-[#d8e3fb] bg-white/60 flex flex-col items-center justify-center p-6 text-center hover:bg-[#f9f9ff] no-underline"
          >
            <span className="w-12 h-12 rounded-full bg-[#f0f3ff] text-[#006781] flex items-center justify-center mb-3">
              <Plus size={22} />
            </span>
            <p className="font-display font-semibold text-[#0d2137]">Yangi katalog qo&apos;shish</p>
            <p className="text-[12px] text-[#64748B] mt-1 max-w-[220px]">
              Yangi tajriba yaratib, mehmonlarga taklif eting
            </p>
          </Link>
        </div>
      )}
    </div>
  );
}
