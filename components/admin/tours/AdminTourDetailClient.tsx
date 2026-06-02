"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  ExternalLink,
  Loader2,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import type { AdminTourDetail } from "@/lib/admin/getAdminTourDetail";
import { formatDate, formatDateTime } from "@/lib/formatDate";

type Props = {
  data: AdminTourDetail;
};

const STATUS_OPTIONS = [
  { value: "active", label: "ACTIVE" },
  { value: "draft", label: "DRAFT" },
  { value: "inactive", label: "SUSPENDED" },
] as const;

const PLAN_STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 ring-amber-100",
  CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-100",
};

const PAYMENT_STATUS_CLS: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
  INITIATED: "bg-blue-50 text-blue-700 ring-blue-100",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-100",
  CANCELLED: "bg-slate-100 text-slate-700 ring-slate-200",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800";

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

export function AdminTourDetailClient({ data: initial }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(
    initial.tour.images[0] ?? initial.tour.imageUrl ?? DEFAULT_IMAGE,
  );

  const [form, setForm] = useState({
    title: data.tour.title,
    description: data.tour.description,
    destination: data.tour.destination,
    days: String(data.tour.days),
    nights: String(data.tour.nights),
    price: String(data.tour.price),
    category: data.tour.category,
    imageUrl: data.tour.imageUrl ?? "",
    highlights: data.tour.highlights.join(", "),
  });

  const shortDescription =
    data.tour.description.length > 280 && !descExpanded
      ? `${data.tour.description.slice(0, 280)}...`
      : data.tour.description;

  async function refreshPage() {
    router.refresh();
  }

  async function saveTour() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tours/${data.tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          destination: form.destination,
          days: Number(form.days),
          nights: Number(form.nights),
          price: Number(form.price),
          category: form.category,
          imageUrl: form.imageUrl || null,
          highlights: form.highlights,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Saqlab bo'lmadi");
      toast.success("Tur paketi yangilandi");
      setEditing(false);
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTour() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tours/${data.tour.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "O'chirib bo'lmadi");
      }
      toast.success("Tur paketi o'chirildi");
      router.push("/admin/tours");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  }

  async function applyStatus(status: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tours/${data.tour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Status yangilanmadi");
      setData((prev) => ({ ...prev, tour: { ...prev.tour, status } }));
      toast.success("Status yangilandi");
      setStatusOpen(false);
      setPendingStatus(null);
      setStatusReason("");
      await refreshPage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  function requestStatusChange(status: string) {
    if (status === data.tour.status) return;
    if (status === "inactive") {
      setPendingStatus(status);
      setStatusOpen(true);
      return;
    }
    void applyStatus(status);
  }

  const galleryImages =
    data.tour.images.length > 0
      ? data.tour.images
      : [data.tour.imageUrl ?? DEFAULT_IMAGE];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`https://safartrip.uz/tours`}
          target="_blank"
          rel="noreferrer"
          className="adm-btn inline-flex items-center gap-2"
        >
          Saytda ko&apos;rish
          <ExternalLink size={14} />
        </a>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => setEditing((v) => !v)}>
          <Pencil size={14} />
          Tahrirlash
        </button>
        <button
          type="button"
          className="adm-btn bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} />
          O&apos;chirish
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-black text-slate-900">Asosiy ma&apos;lumotlar</h2>
              {editing && (
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={saving}
                  onClick={() => void saveTour()}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Saqlash
                </button>
              )}
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Nomi", "title"],
                  ["Yo'nalish", "destination"],
                  ["Kunlar", "days"],
                  ["Tunlar", "nights"],
                  ["Narx", "price"],
                  ["Kategoriya", "category"],
                  ["Rasm URL", "imageUrl"],
                ].map(([label, key]) => (
                  <div key={key} className={key === "title" ? "md:col-span-2" : ""}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                      {label}
                    </label>
                    <input
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Tavsif
                  </label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold min-h-[120px]"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Diqqatga sazovor (vergul bilan)
                  </label>
                  <input
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                    value={form.highlights}
                    onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Info label="Narx" value={formatMoney(data.tour.price)} />
                  <Info label="Davomiyligi" value={`${data.tour.days} kun / ${data.tour.nights} tun`} />
                  <Info label="Yo'nalish" value={data.tour.destination} />
                  <Info label="Kategoriya" value={data.tour.category} />
                  <Info label="Maksimal guruh" value="—" />
                  <Info label="Til" value="—" />
                  <Info label="Yaratilgan" value={formatDateTime(data.tour.createdAt)} />
                  <Info label="Yangilangan" value={formatDateTime(data.tour.updatedAt)} />
                </dl>
                <div className="mt-5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Tavsif
                  </p>
                  <p className="text-sm font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {shortDescription}
                  </p>
                  {data.tour.description.length > 280 && (
                    <button
                      type="button"
                      className="text-xs font-black text-slate-500 hover:text-slate-900 mt-2 uppercase tracking-wide"
                      onClick={() => setDescExpanded((v) => !v)}
                    >
                      {descExpanded ? "Kamroq" : "Ko'proq"}
                    </button>
                  )}
                </div>
                {data.tour.highlights.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Dastur / Diqqatga sazovor
                    </p>
                    <ul className="space-y-2">
                      {data.tour.highlights.map((item) => (
                        <li key={item} className="text-sm font-bold text-slate-700 flex items-start gap-2">
                          <span className="text-slate-300 mt-1">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
              <h2 className="text-lg font-black text-slate-900 mb-4">Rasmlar</h2>
              <div className="rounded-2xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt={data.tour.title}
                  className="w-full h-64 object-cover"
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-3 gap-3">
                  {galleryImages.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedImage(url)}
                      className={`rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImage === url ? "border-slate-900" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking stats */}
          <div className="adm-kpi-grid">
            <MiniKpi icon={Compass} label="Jami bronlar" value={String(data.stats.totalBookings)} color="blue" />
            <MiniKpi icon={CalendarDays} label="Tasdiqlangan" value={String(data.stats.confirmed)} color="teal" />
            <MiniKpi icon={Tag} label="Bekor qilingan" value={String(data.stats.cancelled)} color="orange" />
            <MiniKpi
              icon={ArrowRight}
              label="Jami daromad"
              value={formatMoney(data.stats.totalRevenue)}
              color="blue"
              compact
            />
          </div>

          {/* Recent bookings */}
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">So&apos;nggi bronlar</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th className="pl-4">Mehmon</th>
                    <th>Sana</th>
                    <th>Kishilar</th>
                    <th>Summa</th>
                    <th>Status</th>
                    <th className="pr-4">To&apos;lov</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        Bronlar yo&apos;q
                      </td>
                    </tr>
                  ) : (
                    data.recentBookings.map((row) => (
                      <tr key={row.id}>
                        <td className="pl-4 py-3 font-bold text-slate-800">{row.guestName}</td>
                        <td className="py-3 text-sm font-semibold text-slate-600">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3 font-bold text-slate-600">{row.pax}</td>
                        <td className="py-3 font-black text-slate-800">{formatMoney(row.totalAmount)}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${PLAN_STATUS_CLS[row.status] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="pr-4 py-3">
                          {row.paymentStatus ? (
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ring-1 ${PAYMENT_STATUS_CLS[row.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {row.paymentStatus}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Yaratuvchi</h2>
            {data.creator ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="adm-user-avatar w-14 h-14 text-lg shadow-lg shadow-slate-900/10">
                    {`${data.creator.first_name?.[0] ?? ""}${data.creator.last_name?.[0] ?? ""}`.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {data.creator.first_name} {data.creator.last_name}
                    </p>
                    <p className="text-xs font-bold text-slate-500">{data.creator.email}</p>
                  </div>
                </div>
                <Link
                  href={`/admin/users/${data.creator.id}`}
                  className="text-xs font-black text-slate-500 hover:text-slate-900 uppercase tracking-wide inline-flex items-center gap-1"
                >
                  Foydalanuvchini ko&apos;rish →
                </Link>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-400">Yaratuvchi ma&apos;lumoti topilmadi</p>
            )}
          </div>

          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Holat boshqaruvi</h2>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => requestStatusChange(opt.value)}
                  className={`px-4 py-3 rounded-xl text-left text-sm font-black border transition-all ${
                    data.tour.status === opt.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">SEO / Meta</h2>
            <dl className="space-y-3 text-sm">
              <Info label="Slug" value="—" />
              <Info label="Meta title" value={data.tour.title} />
              <Info label="Meta description" value={data.tour.description.slice(0, 160)} />
            </dl>
          </div>

          <div className="adm-card p-6 bg-white border-none shadow-xl shadow-slate-200/50">
            <h2 className="text-lg font-black text-slate-900 mb-4">Tezkor havolalar</h2>
            <div className="space-y-2">
              <QuickLink
                href={`/admin/payments?tourId=${data.tour.id}`}
                label="Barcha bronlar"
              />
              <QuickLink
                href={`/admin/audit?entity=TourPackage&entityId=${data.tour.id}`}
                label="Audit log"
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Tur paketini o'chirish"
        description="Bu amalni qaytarib bo'lmaydi."
        subjectName={data.tour.title}
        confirmLabel="O'chirish"
        confirmDanger
        confirmLoading={saving}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteTour()}
      />

      <ConfirmModal
        open={statusOpen}
        title="Tur paketini to'xtatish"
        description="Tur SUSPENDED holatiga o'tkaziladi va saytda ko'rinmasligi mumkin."
        subjectName={data.tour.title}
        confirmLabel="To'xtatish"
        confirmDanger
        confirmLoading={saving}
        onCancel={() => {
          setStatusOpen(false);
          setPendingStatus(null);
          setStatusReason("");
        }}
        onConfirm={() => pendingStatus && void applyStatus(pendingStatus)}
      >
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
          Sabab (ixtiyoriy)
        </label>
        <textarea
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold min-h-[80px]"
          value={statusReason}
          onChange={(e) => setStatusReason(e.target.value)}
          placeholder="Nima uchun to'xtatilmoqda..."
        />
      </ConfirmModal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</dt>
      <dd className="font-bold text-slate-800 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-black text-slate-700 hover:bg-slate-100 transition-all"
    >
      {label}
      <ArrowRight size={14} className="text-slate-400" />
    </Link>
  );
}

function MiniKpi({
  icon: Icon,
  label,
  value,
  color,
  compact,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
  color: "blue" | "teal" | "orange";
  compact?: boolean;
}) {
  return (
    <div className="adm-kpi-card">
      <div className={`adm-kpi-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div className="adm-kpi-content">
        <div className="adm-kpi-label">{label}</div>
        <div className={`adm-kpi-value ${compact ? "text-xl" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
