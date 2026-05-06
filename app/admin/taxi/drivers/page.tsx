"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  vehicleCount: number;
  totalTrips: number;
  rating: number | null;
  isOnline: boolean;
  isBlocked: boolean;
  isVerified: boolean;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type PendingAction = { id: string; type: "block" | "unblock" | "verify" } | null;

export default function AdminTaxiDriversPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const verifiedFilter = searchParams.get("verified");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Driver[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [pending, setPending] = useState<PendingAction>(null);

  const patchQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      if (!("page" in patch)) p.delete("page");
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("page", String(page));
      if (verifiedFilter === "false" || verifiedFilter === "true") {
        params.set("verified", verifiedFilter);
      }
      const res = await fetch(`/api/admin/taxi/drivers?${params.toString()}`);
      const json = (await res.json()) as { data?: Driver[]; pagination?: Pagination };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, verifiedFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingDriver = useMemo(
    () => (pending ? items.find((d) => d.id === pending.id) : undefined),
    [items, pending],
  );
  const subjectName = pendingDriver
    ? `${pendingDriver.first_name} ${pendingDriver.last_name}`.trim()
    : pending?.id ?? "";

  async function runAction(id: string, type: "block" | "unblock" | "verify") {
    try {
      const res = await fetch(`/api/admin/taxi/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      setPending(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  const confirmTitle =
    pending?.type === "block"
      ? "Haydovchini bloklash"
      : pending?.type === "unblock"
        ? "Blokdan chiqarish"
        : pending?.type === "verify"
          ? "Haydovchini tasdiqlash"
          : "";

  const confirmDescription =
    pending?.type === "block"
      ? "Quyidagi haydovchi bloklanadi va tizimga kira olmaydi."
      : pending?.type === "unblock"
        ? "Haydovchi blokdan chiqariladi va yana tizimga kira oladi."
        : pending?.type === "verify"
          ? "Haydovchi profili tasdiqlangan deb belgilanadi."
          : "";

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Taxi haydovchilari"
        subtitle={
          verifiedFilter === "false"
            ? "Faqat tasdiqlanmagan haydovchilar"
            : "Haydovchi akkauntlari, onlayn holat va bloklash"
        }
        actions={[
          { href: "/admin/taxi", label: "Taxi bosh sahifa" },
          { href: "/admin/taxi/orders", label: "Buyurtmalar", primary: true },
        ]}
      />

      <div className="flex flex-wrap gap-2 px-1">
        <button
          type="button"
          onClick={() => patchQuery({ verified: undefined, page: undefined })}
          className={`adm-btn text-xs ${!verifiedFilter ? "adm-btn-primary" : ""}`}
        >
          Barchasi
        </button>
        <button
          type="button"
          onClick={() => patchQuery({ verified: "true", page: undefined })}
          className={`adm-btn text-xs ${verifiedFilter === "true" ? "adm-btn-primary" : ""}`}
        >
          Tasdiqlangan
        </button>
        <button
          type="button"
          onClick={() => patchQuery({ verified: "false", page: undefined })}
          className={`adm-btn text-xs ${verifiedFilter === "false" ? "adm-btn-primary" : ""}`}
        >
          Tasdiqlanmagan
        </button>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Ism</th>
                <th>Telefon</th>
                <th>Transport soni</th>
                <th>Jami reyslar</th>
                <th>Reyting</th>
                <th>Onlayn</th>
                <th>Akkaunt</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={8} rows={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState variant="embedded" message="Haydovchilar topilmadi" />
                  </td>
                </tr>
              ) : (
                items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/taxi/drivers/${d.id}`} className="hover:underline">
                        {d.first_name} {d.last_name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">{d.phone}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.vehicleCount}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.totalTrips}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.rating?.toFixed(1) ?? "—"}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-2 text-xs font-black text-slate-700">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${d.isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                        {d.isOnline ? "Onlayn" : "Offlayn"}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-black space-y-1">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg border ${
                          d.isBlocked ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {d.isBlocked ? "Bloklangan" : "Faol"}
                      </span>
                      {d.isVerified ? (
                        <span className="inline-flex px-2 py-1 rounded-lg border bg-sky-50 text-sky-800 border-sky-200">
                          Tasdiqlangan
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-lg border bg-amber-50 text-amber-900 border-amber-200">
                          Kutilmoqda
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/admin/taxi/drivers/${d.id}`} className="adm-btn text-xs inline-flex items-center gap-1">
                          <Eye size={14} />
                          {"Ko'rish"}
                        </Link>
                        {d.isBlocked ? (
                          <button type="button" onClick={() => setPending({ id: d.id, type: "unblock" })} className="adm-btn text-xs">
                            Blokdan chiqarish
                          </button>
                        ) : (
                          <button type="button" onClick={() => setPending({ id: d.id, type: "block" })} className="adm-btn text-xs">
                            Bloklash
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPending({ id: d.id, type: "verify" })}
                          className="adm-btn adm-btn-primary text-xs"
                        >
                          Tasdiqlash
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading ? <AdminPagination page={pagination.page} totalPages={pagination.totalPages} /> : null}
      </div>

      <ConfirmModal
        open={!!pending}
        title={confirmTitle}
        description={confirmDescription}
        subjectName={subjectName}
        confirmDanger={pending?.type === "block"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void runAction(pending.id, pending.type);
        }}
      />
    </div>
  );
}
