"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { QUICK_REPLIES } from "../mock-data";

/** Wait for a typing pause before searching. */
const SEARCH_DEBOUNCE_MS = 300;

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[13px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

type RatingFilter = "all" | "5" | "4" | "low";
type StatusFilter = "all" | "unanswered" | "answered";
type ChannelFilter = "all" | "guide" | "hotel" | "taxi" | "homestay";

type ApiReply = {
  id: string;
  body: string;
  authorUserId: string;
  createdAt: string;
};

type ApiTicket = {
  id: string;
  channel: string;
  authorName: string;
  rating: number;
  body: string;
  serviceLabel: string | null;
  status: "OPEN" | "ANSWERED" | "ESCALATED" | "CLOSED";
  createdAt: string;
  replies: ApiReply[];
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function channelLabel(channel: string): string {
  switch (channel) {
    case "guide":
      return "Ekskursiya";
    case "hotel":
      return "Mehmonxona";
    case "homestay":
      return "Homestay";
    case "taxi":
      return "Transport";
    default:
      return channel;
  }
}

function toApiStatus(status: StatusFilter): string {
  if (status === "unanswered") return "OPEN";
  if (status === "answered") return "ANSWERED";
  return "all";
}

export default function SupportFeedPage() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() ?? "";

  const [items, setItems] = useState<ApiTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rating, setRating] = useState<RatingFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [query, setQuery] = useState(qFromUrl);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("status", toApiStatus(status));
        params.set("channel", channel);
        params.set("rating", rating);
        const q = (query || qFromUrl).trim();
        if (q) params.set("q", q);
        params.set("pageSize", "50");

        const res = await fetch(`/api/support/feedback?${params.toString()}`, {
          credentials: "include",
          signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Yuklash xatosi");
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        // An aborted request is a superseded keystroke, not a failure.
        if (e instanceof DOMException && e.name === "AbortError") return;
        toast.error(e instanceof Error ? e.message : "Yuklash xatosi");
        setItems([]);
        setTotal(0);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [status, channel, rating, query, qFromUrl],
  );

  /**
   * The search box fired a request per character. Wait for a pause, and abort
   * the in-flight request when a new one starts so results cannot arrive out of
   * order and overwrite the newer query.
   */
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  function clearFilters() {
    setRating("all");
    setStatus("all");
    setChannel("all");
    setQuery("");
  }

  async function syncSources() {
    setSyncing(true);
    try {
      const res = await fetch("/api/support/feedback/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitPerSource: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sync xatosi");
      toast.success(`Sync: ${data.created} yangi / ${data.scanned} skan`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync xatosi");
    } finally {
      setSyncing(false);
    }
  }

  async function sendReply(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) {
      toast.error("Javob matnini yozing");
      return;
    }
    setSendingId(id);
    try {
      const res = await fetch(`/api/support/feedback/${id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Javob yuborilmadi");
      setItems((prev) => prev.map((t) => (t.id === id ? data.ticket : t)));
      setDrafts((d) => ({ ...d, [id]: "" }));
      toast.success("Javob saqlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Javob yuborilmadi");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Mijozlar fikr-mulohazalari
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold">
            Yagona support inbox — {total} ta ticket.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="sp-btn sp-btn-ghost"
            disabled={syncing}
            onClick={() => void syncSources()}
          >
            {syncing ? "Sync…" : "Manbalardan sync"}
          </button>
          <button type="button" className="sp-btn sp-btn-navy" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
      </div>

      <div className="sp-card p-4 sm:p-5 sp-animate">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Reyting
            </span>
            <select
              className="sp-select"
              value={rating}
              onChange={(e) => setRating(e.target.value as RatingFilter)}
            >
              <option value="all">Barcha reytinglar</option>
              <option value="5">5 yulduz</option>
              <option value="4">4 yulduz</option>
              <option value="low">3 yulduz va past</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Holati
            </span>
            <select
              className="sp-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="all">Barchasi</option>
              <option value="unanswered">Javob berilmagan</option>
              <option value="answered">Javob berilgan</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Kanal
            </span>
            <select
              className="sp-select"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelFilter)}
            >
              <option value="all">Barcha xizmatlar</option>
              <option value="guide">Ekskursiya</option>
              <option value="hotel">Mehmonxona</option>
              <option value="homestay">Homestay</option>
              <option value="taxi">Transport</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Qidiruv
            </span>
            <input
              className="sp-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism yoki matn..."
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className="sp-btn sp-btn-ghost" onClick={clearFilters}>
            Filtrlarni tozalash
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="sp-card p-10 text-center text-[#64748B] font-semibold">
            Yuklanmoqda…
          </div>
        ) : items.length === 0 ? (
          <div className="sp-card p-10 text-center text-[#64748B] font-semibold space-y-3">
            <p>Mos keladigan sharh topilmadi.</p>
            <p className="text-[12px]">
              Birinchi marta bo‘lsa — “Manbalardan sync” bilan mavjud reviewlarni torting.
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const lastReply = item.replies[item.replies.length - 1];
            const unanswered = item.status === "OPEN" || item.status === "ESCALATED";
            return (
              <article
                key={item.id}
                className={`sp-card p-5 sm:p-6 sp-animate ${idx < 4 ? `sp-animate-delay-${Math.min(idx + 1, 4) as 1 | 2 | 3 | 4}` : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#0d2137] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                    {initials(item.authorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-[16px] font-bold text-[#111c2d]">{item.authorName}</h2>
                      <Stars n={item.rating} />
                      <span className="text-[13px] font-bold text-[#0d2137]">
                        {item.rating.toFixed(1)}
                      </span>
                      <span
                        className={
                          unanswered ? "sp-badge sp-badge-wait" : "sp-badge sp-badge-ok"
                        }
                      >
                        {unanswered ? "Kutilmoqda" : "Javob berilgan"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-[#94A3B8]">
                      <span>{formatDate(item.createdAt)}</span>
                      <span>·</span>
                      <span className="text-[#006781]">
                        {item.serviceLabel || channelLabel(item.channel)}
                      </span>
                      <span>·</span>
                      <span>{channelLabel(item.channel)}</span>
                    </div>
                    <p className="mt-3 text-[14px] text-[#475569] font-semibold leading-relaxed">
                      “{item.body}”
                    </p>

                    {lastReply ? (
                      <div className="mt-4 rounded-2xl border border-[#d8e3fb] bg-[#f0f3ff] p-4">
                        <div className="text-[11px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                          Sizning javobingiz · {formatDate(lastReply.createdAt)}
                        </div>
                        <p className="mt-2 text-[13px] text-[#111c2d] font-semibold leading-relaxed">
                          {lastReply.body}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                            Tezkor javob:
                          </span>
                          {QUICK_REPLIES.map((qr) => (
                            <button
                              key={qr}
                              type="button"
                              className="sp-chip sp-chip-neutral"
                              onClick={() =>
                                setDrafts((d) => ({
                                  ...d,
                                  [item.id]: `${d[item.id] ? `${d[item.id]} ` : ""}${qr}`,
                                }))
                              }
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="sp-textarea"
                          placeholder="Javobingizni yozing..."
                          value={drafts[item.id] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                          }
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="sp-btn sp-btn-primary"
                            disabled={sendingId === item.id}
                            onClick={() => void sendReply(item.id)}
                          >
                            {sendingId === item.id ? "Yuborilmoqda…" : "Javob yuborish"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
