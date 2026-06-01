"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type SortOption = "last_visit" | "visit_count" | "total_spent" | "name";

type GuestListItem = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  is_vip: boolean;
  is_blacklist: boolean;
  visit_count: number;
  total_spent: number;
  last_visit: string | null;
};

type GuestListResponse = {
  guests: GuestListItem[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

type GuestStats = {
  total: number;
  vip: number;
  returning: number;
};

type CreateGuestForm = {
  fullName: string;
  phone: string;
  email: string;
  passportId: string;
  nationality: string;
  birthDate: string;
  gender: "" | "MALE" | "FEMALE";
  address: string;
  notes: string;
  isVip: boolean;
};

const PER_PAGE = 20;

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "last_visit", label: "So'nggi tashrif" },
  { value: "visit_count", label: "Ko'p tashrif" },
  { value: "total_spent", label: "Ko'p xarajat" },
  { value: "name", label: "Ism" },
];

const NATIONALITY_OPTIONS = [
  { value: "UZ", label: "O'zbekiston" },
  { value: "RU", label: "Rossiya" },
  { value: "KZ", label: "Qozog'iston" },
  { value: "TJ", label: "Tojikiston" },
  { value: "KG", label: "Qirg'iziston" },
  { value: "OTHER", label: "Boshqa" },
] as const;

const EMPTY_FORM: CreateGuestForm = {
  fullName: "",
  phone: "",
  email: "",
  passportId: "",
  nationality: "UZ",
  birthDate: "",
  gender: "",
  address: "",
  notes: "",
  isVip: false,
};

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

function formatShortDate(ymd: string | null) {
  if (!ymd) return "—";
  const [, m, d] = ymd.split("-").map(Number);
  const months = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
  return `${d}-${months[m - 1]}`;
}

function nationalityFlag(code: string | null) {
  switch (code?.toUpperCase()) {
    case "UZ":
      return "🇺🇿";
    case "RU":
      return "🇷🇺";
    case "KZ":
      return "🇰🇿";
    default:
      return "🌍";
  }
}

function guestInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

async function fetchGuests(
  hotelId: string,
  opts: {
    search: string;
    vipOnly: boolean;
    blacklistOnly: boolean;
    sort: SortOption;
    page: number;
  },
): Promise<GuestListResponse> {
  const params = new URLSearchParams({
    page: String(opts.page),
    per_page: String(PER_PAGE),
    sort: opts.sort,
  });
  if (opts.search.trim()) params.set("search", opts.search.trim());
  if (opts.vipOnly) params.set("is_vip", "true");
  if (opts.blacklistOnly) params.set("is_blacklist", "true");

  const res = await fetch(`/api/hotels/${hotelId}/guests?${params.toString()}`);
  const data = (await res.json()) as GuestListResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "Mehmonlar yuklanmadi");
  return data;
}

async function loadGuestStats(hotelId: string): Promise<GuestStats> {
  const base = `/api/hotels/${hotelId}/guests`;

  const [allRes, vipRes] = await Promise.all([
    fetch(`${base}?per_page=1`),
    fetch(`${base}?is_vip=true&per_page=1`),
  ]);

  const all = (await allRes.json()) as GuestListResponse;
  const vip = (await vipRes.json()) as GuestListResponse;

  if (!allRes.ok) throw new Error("Statistika yuklanmadi");

  let returning = 0;
  const totalPages = all.pagination.total_pages;

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(`${base}?per_page=100&page=${page}`);
    const data = (await res.json()) as GuestListResponse;
    if (!res.ok) break;
    returning += data.guests.filter((guest) => guest.visit_count > 1).length;
  }

  return {
    total: all.pagination.total,
    vip: vipRes.ok ? vip.pagination.total : 0,
    returning,
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "green" | "default";
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p
        className={`text-2xl font-black mt-2 ${
          accent === "green" ? "text-green-700" : "text-[var(--primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function GuestTableRow({ guest }: { guest: GuestListItem }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[11px] font-black shrink-0">
            {guestInitials(guest.full_name)}
          </div>
          <span className="text-sm font-black text-slate-800">{guest.full_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-slate-600">{guest.phone}</td>
      <td className="px-4 py-3 text-lg">{nationalityFlag(guest.nationality)}</td>
      <td className="px-4 py-3 text-sm font-bold text-slate-700">{guest.visit_count} marta</td>
      <td className="px-4 py-3 text-sm font-black text-[var(--primary)]">
        {formatMoney(guest.total_spent)}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-slate-600">
        {formatShortDate(guest.last_visit)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {guest.is_vip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase">
              <Star size={10} className="fill-amber-500 text-amber-500" />
              VIP
            </span>
          )}
          {guest.is_blacklist && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 text-[10px] font-black uppercase">
              <Ban size={10} />
              Blacklist
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/hotel/guests/${guest.id}`}
          className="text-[12px] font-black text-[var(--accent)] hover:underline uppercase"
        >
          Ko'rish →
        </Link>
      </td>
    </tr>
  );
}

function GuestCard({ guest }: { guest: GuestListItem }) {
  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[12px] font-black">
            {guestInitials(guest.full_name)}
          </div>
          <div>
            <p className="text-base font-black text-slate-800">{guest.full_name}</p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">{guest.phone}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {guest.is_vip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
              ⭐ VIP
            </span>
          )}
          {guest.is_blacklist && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black">
              🚫
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-600">{guest.visit_count} marta</span>
        <span className="font-black text-[var(--primary)]">{formatMoney(guest.total_spent)}</span>
      </div>
      <Link
        href={`/hotel/guests/${guest.id}`}
        className="block text-center text-[12px] font-black text-[var(--accent)] hover:underline uppercase pt-1 border-t border-slate-100"
      >
        Ko'rish →
      </Link>
    </article>
  );
}

export default function HotelGuestsPage() {
  const { t } = useLanguage();
  const [hotelId, setHotelId] = useState("");
  const [guests, setGuests] = useState<GuestListItem[]>([]);
  const [pagination, setPagination] = useState<GuestListResponse["pagination"]>({
    total: 0,
    page: 1,
    per_page: PER_PAGE,
    total_pages: 0,
  });
  const [stats, setStats] = useState<GuestStats>({ total: 0, vip: 0, returning: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [blacklistOnly, setBlacklistOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("last_visit");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateGuestForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGuests(hotelId, {
        search,
        vipOnly,
        blacklistOnly,
        sort,
        page,
      });
      setGuests(result.guests);
      setPagination(result.pagination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mehmonlar yuklanmadi");
      setGuests([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, search, vipOnly, blacklistOnly, sort, page]);

  const loadStats = useCallback(async () => {
    if (!hotelId) return;
    setStatsLoading(true);
    try {
      const data = await loadGuestStats(hotelId);
      setStats(data);
    } catch {
      /* stats optional */
    } finally {
      setStatsLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await fetch("/api/hotel/me");
        const data = (await res.json()) as { hotel?: { id: string } };
        if (!res.ok || !data.hotel?.id) throw new Error("Mehmonxona topilmadi");
        if (!cancelled) setHotelId(data.hotel.id);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mehmonxona topilmadi");
          setLoading(false);
          setStatsLoading(false);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hotelId) void loadList();
  }, [hotelId, loadList]);

  useEffect(() => {
    if (hotelId) void loadStats();
  }, [hotelId, loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleCreateGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!hotelId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        isVip: form.isVip,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.passportId.trim()) body.passportId = form.passportId.trim();
      if (form.nationality) body.nationality = form.nationality;
      if (form.birthDate) body.birthDate = form.birthDate;
      if (form.gender) body.gender = form.gender;
      if (form.address.trim()) body.address = form.address.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch(`/api/hotels/${hotelId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Saqlab bo'lmadi");

      toast.success("Mehmon qo'shildi");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      void loadList();
      void loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] flex items-center gap-2">
            <Users size={24} className="text-[var(--accent)]" />
            Mehmonlar
          </h1>
          <p className="text-sm font-bold text-slate-400 mt-1">{t("nav.guests")}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[12px] font-black uppercase tracking-wide hover:opacity-90"
        >
          <Plus size={16} />
          Yangi mehmon
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Jami mehmonlar"
          value={statsLoading ? "…" : stats.total}
        />
        <StatCard
          label="VIP mehmonlar"
          value={statsLoading ? "…" : stats.vip}
          accent="green"
        />
        <StatCard
          label="Qaytib kelgan"
          value={statsLoading ? "…" : stats.returning}
        />
      </div>

      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1 min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ism yoki telefon..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vipOnly}
                onChange={(e) => {
                  setVipOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 accent-[var(--accent)]"
              />
              <span className="text-[12px] font-black text-slate-600 uppercase">VIP</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={blacklistOnly}
                onChange={(e) => {
                  setBlacklistOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 accent-red-500"
              />
              <span className="text-[12px] font-black text-slate-600 uppercase">Qora ro'yxat</span>
            </label>
          </div>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOption);
              setPage(1);
            }}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] font-black text-slate-700 bg-white outline-none focus:border-[var(--accent)]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* List */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : error ? (
          <div className="p-10 text-center text-sm font-bold text-red-600">{error}</div>
        ) : guests.length === 0 ? (
          <div className="p-10 text-center text-sm font-bold text-slate-400">Mehmonlar topilmadi</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {[
                      "Mehmon",
                      "Telefon",
                      "Millat",
                      "Tashriflar",
                      "Jami xarajat",
                      "So'nggi tashrif",
                      "Belgilar",
                      "Amallar",
                    ].map((col) => (
                      <th
                        key={col}
                        className={`px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest ${
                          col === "Amallar" ? "text-right" : ""
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <GuestTableRow key={guest.id} guest={guest} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden p-4 space-y-3">
              {guests.map((guest) => (
                <GuestCard key={guest.id} guest={guest} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Pagination */}
      {!loading && !error && pagination.total_pages > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[12px] font-bold text-slate-400">
            Jami {pagination.total} ta · {pagination.page}/{pagination.total_pages} sahifa
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-black text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Oldingi
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-black text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Keyingi
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-[var(--primary)]">Yangi mehmon</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGuest} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Ism *
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Telefon *
                </label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Pasport
                  </label>
                  <input
                    value={form.passportId}
                    onChange={(e) => setForm({ ...form, passportId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Millat
                  </label>
                  <select
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] bg-white"
                  >
                    {NATIONALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Tug&apos;ilgan sana
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Jinsi
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as CreateGuestForm["gender"] })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] bg-white"
                  >
                    <option value="">Tanlanmagan</option>
                    <option value="MALE">Erkak</option>
                    <option value="FEMALE">Ayol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                    Manzil
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">
                  Izoh
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVip}
                  onChange={(e) => setForm({ ...form, isVip: e.target.checked })}
                  className="rounded border-slate-300 accent-amber-500"
                />
                <span className="text-sm font-black text-slate-700">VIP mehmon</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-600"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
