"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  SITE_CATEGORY_VALUES,
  SITE_PROMINENCE_VALUES,
  SITE_STATUS_VALUES,
} from "@/src/modules/knowledge/domain/adminSite";

type SiteRow = {
  id: string;
  slug: string;
  name: string;
  regionCode: string;
  category: string;
  status: string;
  prominence: string | null;
  lat: number | null;
  lng: number | null;
  sourceUrl: string | null;
  updatedAt: string;
};

type FormState = {
  name: string;
  nameEn: string;
  regionCode: string;
  category: string;
  lat: string;
  lng: string;
  open_hours: string;
  sourceUrl: string;
  prominence: string;
  priceBand: string;
  mealTypes: string;
  cuisine: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  nameEn: "",
  regionCode: "samarqand",
  category: "OBIDA",
  lat: "",
  lng: "",
  open_hours: "",
  sourceUrl: "",
  prominence: "",
  priceBand: "",
  mealTypes: "",
  cuisine: "",
};

const DINING = new Set(["RESTORAN", "CHAYXONA", "KAFE"]);

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-100",
  REVIEW: "bg-sky-50 text-sky-700 ring-sky-100",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminKnowledgePage() {
  const [items, setItems] = useState<SiteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (regionFilter.trim()) params.set("regionCode", regionFilter.trim());
      const res = await fetch(`/api/admin/knowledge/sites?${params}`);
      const data = (await res.json()) as {
        items?: SiteRow[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Yuklash xatosi");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setLoading(false);
    }
  }, [page, q, statusFilter, regionFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isDining = DINING.has(form.category);
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || null,
        regionCode: form.regionCode.trim().toLowerCase(),
        category: form.category,
        lat: form.lat.trim() ? Number(form.lat) : null,
        lng: form.lng.trim() ? Number(form.lng) : null,
        open_hours: form.open_hours.trim() || null,
        sourceUrl: form.sourceUrl.trim() || null,
        prominence: form.prominence || null,
      };
      if (isDining) {
        const mealTypes = form.mealTypes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        body.dining = {
          cuisine: form.cuisine
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          priceBand: form.priceBand || null,
          mealTypes: mealTypes.length ? mealTypes : null,
          mustTry: [],
        };
      }
      const res = await fetch("/api/admin/knowledge/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { item?: SiteRow; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Saqlash xatosi");
      toast.success("DRAFT yaratildi");
      setShowModal(false);
      setForm(EMPTY_FORM);
      if (data.item?.id) {
        window.location.href = `/admin/knowledge/${data.item.id}`;
        return;
      }
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlash xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: SiteRow) {
    const ok = window.confirm(
      `"${row.name}" ni o'chirib tashlamoqchimisiz?\nBu amalni qaytarib bo'lmaydi.`,
    );
    if (!ok) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/admin/knowledge/sites/${row.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "O'chirib bo'lmadi");
      toast.success("O'chirildi");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O'chirib bo'lmadi");
    } finally {
      setDeletingId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <BookOpen size={22} className="text-slate-700" />
            Knowledge (Trip AI)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Joylar katalogi — faqat PUBLISHED qatorlar Trip AI rejasiga tushadi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus size={16} /> Joy qo&apos;shish
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Nom / slug qidiruv…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Barcha status</option>
          {SITE_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={regionFilter}
          onChange={(e) => {
            setPage(1);
            setRegionFilter(e.target.value);
          }}
          placeholder="regionCode"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-40"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Joy</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Tur</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prominence</th>
              <th className="px-4 py-3 font-medium text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="inline animate-spin" size={18} />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Hech narsa topilmadi
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/knowledge/${row.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <div className="text-xs text-slate-400">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.regionCode}</td>
                  <td className="px-4 py-3 text-slate-600">{row.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[row.status] ?? "bg-slate-50 text-slate-600"}`}
                    >
                      {row.status === "PUBLISHED" ? (
                        <CheckCircle size={12} />
                      ) : null}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.prominence ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/knowledge/${row.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 size={14} />
                        Tahrir
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors disabled:opacity-50"
                        title="O'chirish"
                      >
                        {deletingId === row.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        O&apos;chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} ta · sahifa {page}/{pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Yangi joy (DRAFT)</h2>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 p-4">
              <label className="block text-xs text-slate-500">
                Nom *
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Name (EN)
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-500">
                  regionCode *
                  <input
                    required
                    value={form.regionCode}
                    onChange={(e) =>
                      setForm({ ...form, regionCode: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Kategoriya *
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {SITE_CATEGORY_VALUES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-slate-500">
                  Lat
                  <input
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Lng
                  <input
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs text-slate-500">
                Ochilish soatlari (matn)
                <input
                  value={form.open_hours}
                  onChange={(e) =>
                    setForm({ ...form, open_hours: e.target.value })
                  }
                  placeholder="09:00 - 18:00 yoki Du-Ju 09:00 - 19:00"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-500">
                sourceUrl
                <input
                  value={form.sourceUrl}
                  onChange={(e) =>
                    setForm({ ...form, sourceUrl: e.target.value })
                  }
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Prominence
                <select
                  value={form.prominence}
                  onChange={(e) =>
                    setForm({ ...form, prominence: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {SITE_PROMINENCE_VALUES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              {DINING.has(form.category) ? (
                <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-xs font-medium text-amber-800">
                    Dining (publish uchun priceBand + mealTypes kerak)
                  </p>
                  <label className="block text-xs text-slate-500">
                    priceBand
                    <select
                      value={form.priceBand}
                      onChange={(e) =>
                        setForm({ ...form, priceBand: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">—</option>
                      <option value="arzon">arzon</option>
                      <option value="orta">orta</option>
                      <option value="qimmat">qimmat</option>
                    </select>
                  </label>
                  <label className="block text-xs text-slate-500">
                    mealTypes (vergul bilan)
                    <input
                      value={form.mealTypes}
                      onChange={(e) =>
                        setForm({ ...form, mealTypes: e.target.value })
                      }
                      placeholder="tushlik, kechki"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    />
                  </label>
                  <label className="block text-xs text-slate-500">
                    cuisine (vergul bilan)
                    <input
                      value={form.cuisine}
                      onChange={(e) =>
                        setForm({ ...form, cuisine: e.target.value })
                      }
                      placeholder="uzbek"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    />
                  </label>
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Bekor
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
