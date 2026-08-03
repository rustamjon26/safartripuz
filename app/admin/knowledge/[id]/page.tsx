"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  SITE_CATEGORY_VALUES,
  SITE_PROMINENCE_VALUES,
} from "@/src/modules/knowledge/domain/adminSite";

type Eligibility = { ok: boolean; reasons: string[] };

type SiteDetail = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  nameRu: string | null;
  regionCode: string;
  category: string;
  status: string;
  prominence: string | null;
  lat: number | null;
  lng: number | null;
  sourceUrl: string | null;
  openingHours: { raw?: string; weekly?: unknown } | null;
  dining: {
    cuisine?: string[];
    priceBand?: string | null;
    mealTypes?: string[];
    mustTry?: string[];
    note?: string;
  } | null;
};

const DINING = new Set(["RESTORAN", "CHAYXONA", "KAFE"]);

export default function AdminKnowledgeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [category, setCategory] = useState("OBIDA");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [prominence, setProminence] = useState("");
  const [priceBand, setPriceBand] = useState("");
  const [mealTypes, setMealTypes] = useState("");
  const [cuisine, setCuisine] = useState("");

  const hydrate = useCallback((item: SiteDetail) => {
    setSite(item);
    setName(item.name);
    setNameEn(item.nameEn ?? "");
    setRegionCode(item.regionCode);
    setCategory(item.category);
    setLat(item.lat != null ? String(item.lat) : "");
    setLng(item.lng != null ? String(item.lng) : "");
    setOpenHours(item.openingHours?.raw ?? "");
    setSourceUrl(item.sourceUrl ?? "");
    setProminence(item.prominence ?? "");
    setPriceBand(item.dining?.priceBand ?? "");
    setMealTypes((item.dining?.mealTypes ?? []).join(", "));
    setCuisine((item.dining?.cuisine ?? []).join(", "));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/knowledge/sites/${id}`);
      const data = (await res.json()) as {
        item?: SiteDetail;
        eligibility?: Eligibility;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Yuklash xatosi");
      if (!data.item) throw new Error("Topilmadi");
      hydrate(data.item);
      setEligibility(data.eligibility ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklash xatosi");
    } finally {
      setLoading(false);
    }
  }, [id, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isDining = DINING.has(category);
      const body: Record<string, unknown> = {
        name: name.trim(),
        nameEn: nameEn.trim() || null,
        regionCode: regionCode.trim().toLowerCase(),
        category,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        open_hours: openHours.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        prominence: prominence || null,
      };
      if (isDining) {
        const mt = mealTypes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        body.dining = {
          cuisine: cuisine
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          priceBand: priceBand || null,
          mealTypes: mt.length ? mt : null,
          mustTry: site?.dining?.mustTry ?? [],
        };
      } else {
        body.clearDining = true;
      }
      const res = await fetch(`/api/admin/knowledge/sites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: SiteDetail;
        eligibility?: Eligibility;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Saqlash xatosi");
      if (data.item) hydrate(data.item);
      setEligibility(data.eligibility ?? null);
      toast.success("Saqlandi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Saqlash xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/knowledge/sites/${id}/publish`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        item?: SiteDetail;
        eligibility?: Eligibility;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Publish xatosi");
      if (data.item) hydrate(data.item);
      setEligibility(data.eligibility ?? null);
      toast.success("PUBLISHED — Trip AI endi ko‘radi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish xatosi");
      void load();
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="space-y-3">
        <Link href="/admin/knowledge" className="text-sm text-slate-500">
          ← Orqaga
        </Link>
        <p>Topilmadi</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/knowledge"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Knowledge
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            {site.name}
          </h1>
          <p className="text-xs text-slate-400">
            {site.slug} · {site.status}
          </p>
        </div>
        <button
          type="button"
          disabled={
            publishing ||
            site.status === "PUBLISHED" ||
            eligibility?.ok === false
          }
          onClick={() => void handlePublish()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          title={
            eligibility && !eligibility.ok
              ? eligibility.reasons.join(", ")
              : "Publish"
          }
        >
          {publishing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CheckCircle size={14} />
          )}
          {site.status === "PUBLISHED" ? "Published" : "Publish"}
        </button>
      </div>

      {eligibility ? (
        <div
          className={`rounded-xl border p-3 text-sm ${
            eligibility.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {eligibility.ok ? (
            <p className="flex items-center gap-2">
              <CheckCircle size={16} /> Publish uchun tayyor
            </p>
          ) : (
            <div>
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle size={16} /> Publish bloklangan
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {eligibility.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void handleSave(e)}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="block text-xs text-slate-500">
          Nom *
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-slate-500">
          Name (EN)
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-500">
            regionCode *
            <input
              required
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Kategoriya
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Lng
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs text-slate-500">
          Ochilish soatlari
          <input
            value={openHours}
            onChange={(e) => setOpenHours(e.target.value)}
            placeholder="09:00 - 18:00"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-slate-500">
          sourceUrl
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-slate-500">
          Prominence
          <select
            value={prominence}
            onChange={(e) => setProminence(e.target.value)}
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

        {DINING.has(category) ? (
          <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
            <p className="text-xs font-medium text-amber-900">Dining</p>
            <label className="block text-xs text-slate-500">
              priceBand
              <select
                value={priceBand}
                onChange={(e) => setPriceBand(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="arzon">arzon</option>
                <option value="orta">orta</option>
                <option value="qimmat">qimmat</option>
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              mealTypes (vergul)
              <input
                value={mealTypes}
                onChange={(e) => setMealTypes(e.target.value)}
                placeholder="tushlik, kechki"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-slate-500">
              cuisine (vergul)
              <input
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Saqlash
          </button>
        </div>
      </form>
    </div>
  );
}
