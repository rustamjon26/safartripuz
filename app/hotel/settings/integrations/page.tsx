"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Cable, Info, RefreshCw } from "lucide-react";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";

type IntegrationStatus =
  | "DISCONNECTED"
  | "PENDING"
  | "CONNECTED"
  | "LICENSE_REQUIRED"
  | "ERROR";

type IntegrationItem = {
  providerKey: string;
  name: string;
  category: "OTA" | "PAYMENT" | "LOCAL";
  desc: string;
  badges: string[];
  status: IntegrationStatus;
  meta: string;
  externalHotelId: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

type IntegrationGroup = {
  id: string;
  title: string;
  items: IntegrationItem[];
};

type SyncJob = {
  id: string;
  providerKey: string;
  kind: string;
  status: string;
  errorMessage: string | null;
  finishedAt: string | null;
};

function statusBadge(status: IntegrationStatus): { cls: string; label: string } {
  switch (status) {
    case "CONNECTED":
      return { cls: "h-badge h-badge-ok", label: "Ulangan" };
    case "PENDING":
      return { cls: "h-badge h-badge-wait", label: "Kutilmoqda" };
    case "LICENSE_REQUIRED":
      return { cls: "h-badge h-badge-info", label: "Litsenziya" };
    case "ERROR":
      return { cls: "h-badge h-badge-cancel", label: "Xato" };
    default:
      return { cls: "h-badge h-badge-cancel", label: "Ulanmagan" };
  }
}

export default function HotelIntegrationsPage() {
  const [groups, setGroups] = useState<IntegrationGroup[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, syncRes] = await Promise.all([
        hotelFetch("/api/hotel/integrations"),
        hotelFetch("/api/hotel/channel/sync"),
      ]);
      const intData = (await intRes.json()) as {
        groups?: IntegrationGroup[];
        message?: string;
      };
      const syncData = (await syncRes.json()) as {
        items?: SyncJob[];
      };
      if (!intRes.ok) {
        throw new Error(intData.message || "Yuklashda xato");
      }
      setGroups(intData.groups ?? []);
      if (syncRes.ok) setJobs(syncData.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect(item: IntegrationItem) {
    setBusyKey(item.providerKey);
    try {
      let externalHotelId: string | undefined;
      if (item.category === "OTA") {
        const code = window.prompt(
          `${item.name} HotelCode / property id (masalan BKG-12345):`,
          item.externalHotelId ?? "",
        );
        if (code === null) return;
        externalHotelId = code.trim() || undefined;
        if (!externalHotelId) {
          toast.error("OTA uchun HotelCode majburiy");
          return;
        }
      }
      const res = await hotelFetch("/api/hotel/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          providerKey: item.providerKey,
          externalHotelId,
          credentials:
            item.category === "OTA"
              ? { hotelCode: externalHotelId }
              : undefined,
        }),
      });
      const data = (await res.json()) as {
        item?: IntegrationItem;
        syncJob?: SyncJob | null;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Ulanmadi");
      toast.success(
        data.syncJob
          ? `${item.name} ulandi · sync ${data.syncJob.status}`
          : `${item.name} ulandi`,
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusyKey(null);
    }
  }

  async function disconnect(item: IntegrationItem) {
    setBusyKey(item.providerKey);
    try {
      const res = await hotelFetch("/api/hotel/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          providerKey: item.providerKey,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Uzilmadi");
      toast.success(`${item.name} uzildi`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusyKey(null);
    }
  }

  async function syncNow(providerKey: string) {
    setBusyKey(`sync-${providerKey}`);
    try {
      const res = await hotelFetch("/api/hotel/channel/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerKey,
          kind: "FULL_REFRESH",
          runNow: true,
        }),
      });
      const data = (await res.json()) as {
        job?: SyncJob;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Sync xato");
      toast.success(`Sync: ${data.job?.status ?? "ok"}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/hotel/settings"
            className="p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B] hover:bg-[#f0f3ff] shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
              Sozlamalar · Integratsiyalar
            </div>
            <h1 className="font-display text-[28px] font-bold text-[#0d2137] mt-1 flex items-center gap-2">
              <Cable size={24} className="text-[#006781]" />
              Tashqi tizimlar bilan ulanish
            </h1>
            <p className="text-[13px] font-semibold text-[#64748B] mt-1 max-w-2xl">
              SiteMinder/Cloudbeds usuli: ulash → xona mapping → ARI sync job →
              reservation inbox. OTA adapterlar hozir stub (dry-run).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] text-[13px] font-bold text-[#0d2137]"
        >
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 flex gap-3 text-[12px] font-semibold text-sky-900">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          API kalitlari serverda saqlanadi va hech qachon UI ga qaytarilmaydi.
          Haqiqiy OpenTravel XML adapterlar keyingi bosqichda shu pipeline ga
          ulanadi.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] font-semibold text-[#64748B]">Yuklanmoqda…</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-[11px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            {group.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map((item) => {
              const badge = statusBadge(item.status);
              const connected = item.status === "CONNECTED";
              const busy = busyKey === item.providerKey;
              return (
                <article
                  key={item.providerKey}
                  className="bg-white border border-[#d8e3fb] rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-bold text-[#0d2137]">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-[12px] font-semibold text-[#64748B] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <span className={badge.cls}>{badge.label}</span>
                  </div>
                  {item.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.badges.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded-md bg-[#f0f3ff] text-[10px] font-bold text-[#64748B] uppercase"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.externalHotelId ? (
                    <p className="mt-2 text-[11px] font-bold text-[#64748B]">
                      HotelCode: {item.externalHotelId}
                    </p>
                  ) : null}
                  {item.lastError ? (
                    <p className="mt-2 text-[11px] font-semibold text-rose-600">
                      {item.lastError}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[12px] font-bold text-[#006781]">
                      {item.meta}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {connected && item.category === "OTA" ? (
                        <button
                          type="button"
                          disabled={busyKey === `sync-${item.providerKey}`}
                          onClick={() => void syncNow(item.providerKey)}
                          className="px-3.5 py-2 rounded-xl border border-[#d8e3fb] text-[12px] font-bold text-[#0d2137] hover:bg-[#f9f9ff] disabled:opacity-50"
                        >
                          Sync
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void (connected ? disconnect(item) : connect(item))
                        }
                        className={`px-3.5 py-2 rounded-xl text-[12px] font-bold disabled:opacity-50 ${
                          connected
                            ? "border border-[#d8e3fb] text-[#0d2137] hover:bg-[#f9f9ff]"
                            : "bg-[#006781] text-white hover:bg-[#005a71]"
                        }`}
                      >
                        {busy
                          ? "…"
                          : connected
                            ? "Uzish"
                            : "Ulash"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="bg-white border border-[#d8e3fb] rounded-2xl p-5 sm:p-6 space-y-3">
        <h2 className="font-display text-[20px] font-bold text-[#0d2137]">
          So‘nggi channel sync joblar
        </h2>
        {jobs.length === 0 ? (
          <p className="text-[13px] font-semibold text-[#64748B]">
            Hali sync ishga tushmagan. OTA ulangandan keyin FULL_REFRESH
            avtomatik navbatga tushadi.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.slice(0, 8).map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d8e3fb] px-3 py-2 text-[12px] font-semibold"
              >
                <span className="font-bold text-[#0d2137]">
                  {j.providerKey} · {j.kind}
                </span>
                <span className="text-[#006781]">{j.status}</span>
                {j.errorMessage ? (
                  <span className="basis-full text-rose-600">{j.errorMessage}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
