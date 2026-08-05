"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { partyTypeLabel } from "@/src/modules/supportchat";

type Thread = {
  id: string;
  subject: string;
  partyType: "hotel" | "homestay" | "taxi" | "guide" | "customer";
  partyName: string;
  partyEmail: string | null;
  status: "OPEN" | "CLOSED";
  preview: string | null;
  lastMessageAt: string | null;
  unread: number;
};

const PARTY_FILTERS = [
  { id: "all", label: "Barchasi" },
  { id: "hotel", label: "Mehmonxona" },
  { id: "homestay", label: "Uy" },
  { id: "taxi", label: "Taxi" },
  { id: "guide", label: "Gid" },
  { id: "customer", label: "Mijoz" },
] as const;

export default function SupportMessagesPage() {
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [partyType, setPartyType] =
    useState<(typeof PARTY_FILTERS)[number]["id"]>("all");
  const [status, setStatus] = useState<"all" | "OPEN" | "CLOSED">("OPEN");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        partyType,
        ...(q.trim() ? { q: q.trim() } : {}),
      });
      const res = await fetch(`/api/support/chat/threads?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as { items?: Thread[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Yuklanmadi");
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, partyType, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const unreadTotal = useMemo(
    () => items.reduce((s, t) => s + t.unread, 0),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Support chat
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold max-w-2xl">
            Mehmonxona, uy mehmonxona, taxi, gid va mijozlar bilan jonli suhbat.
          </p>
        </div>
        <span className="sp-badge sp-badge-muted">
          {unreadTotal > 0 ? `${unreadTotal} o‘qilmagan` : "Inbox"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            className="sp-input pl-10"
            placeholder="Ism, email yoki mavzu…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="sp-input sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="OPEN">Ochiq</option>
          <option value="CLOSED">Yopiq</option>
          <option value="all">Barchasi</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PARTY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setPartyType(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border ${
              partyType === f.id
                ? "bg-[#0d2137] text-white border-[#0d2137]"
                : "bg-white text-[#64748B] border-[#d8e3fb]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sp-card p-10 flex items-center justify-center gap-2 text-sm font-semibold text-[#64748B]">
          <Loader2 size={16} className="animate-spin" />
          Yuklanmoqda…
        </div>
      ) : items.length === 0 ? (
        <div className="sp-card p-10 text-center text-sm font-semibold text-[#94A3B8]">
          Hali suhbat yo&apos;q. Hamkorlar /support-chat orqali yozishadi.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <Link
              key={t.id}
              href={`/support/messages/${t.id}`}
              className="sp-card p-4 flex items-start gap-3 hover:bg-[#f9f9ff] transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-[#0d2137] text-white flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-bold text-[#0d2137] truncate">
                    {t.subject}
                  </div>
                  {t.unread > 0 ? (
                    <span className="sp-badge sp-badge-info shrink-0">
                      {t.unread}
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] font-bold text-[#64748B] mt-0.5">
                  {partyTypeLabel(t.partyType)} · {t.partyName}
                  {t.partyEmail ? ` · ${t.partyEmail}` : ""}
                </div>
                <p className="text-[12px] font-semibold text-[#94A3B8] mt-1 line-clamp-1">
                  {t.preview ?? "—"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
