"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FEEDBACK_ITEMS,
  QUICK_REPLIES,
  type FeedbackItem,
  type FeedbackService,
  type FeedbackStatus,
} from "../mock-data";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#F59E0B] text-[13px] tracking-tight" aria-label={`${n} yulduz`}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(n))))}
      <span className="text-[#CBD5E1]">{"★".repeat(Math.max(0, 5 - Math.round(n)))}</span>
    </span>
  );
}

type RatingFilter = "all" | "5" | "4" | "low";
type DateFilter = "newest" | "week" | "month";

export default function SupportFeedPage() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q")?.trim() ?? "";

  const [items, setItems] = useState<FeedbackItem[]>(FEEDBACK_ITEMS);
  const [rating, setRating] = useState<RatingFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("newest");
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [service, setService] = useState<FeedbackService>("all");
  const [query, setQuery] = useState(qFromUrl);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = [...items];
    if (rating === "5") list = list.filter((i) => i.rating === 5);
    if (rating === "4") list = list.filter((i) => i.rating === 4);
    if (rating === "low") list = list.filter((i) => i.rating <= 3);
    if (status !== "all") list = list.filter((i) => i.status === status);
    if (service !== "all") list = list.filter((i) => i.service === service);
    const q = (query || qFromUrl).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.author.toLowerCase().includes(q) ||
          i.quote.toLowerCase().includes(q) ||
          i.serviceLabel.toLowerCase().includes(q),
      );
    }
    if (dateFilter === "newest") {
      // mock order already newest-first; keep stable
    }
    return list;
  }, [items, rating, status, service, query, qFromUrl, dateFilter]);

  function clearFilters() {
    setRating("all");
    setDateFilter("newest");
    setStatus("all");
    setService("all");
    setQuery("");
  }

  function sendReply(id: string) {
    const text = (drafts[id] ?? "").trim();
    if (!text) {
      toast.error("Javob matnini yozing");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "answered" as const,
              reply: {
                text,
                dateLabel: "Bugun (demo)",
              },
            }
          : item,
      ),
    );
    setDrafts((d) => ({ ...d, [id]: "" }));
    toast.success("Javob saqlandi (faqat frontend)");
  }

  return (
    <div className="space-y-6">
      <div className="sp-animate flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] sm:text-[32px] font-bold text-[#0d2137] leading-tight">
            Mijozlar fikr-mulohazalari
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B] font-semibold">
            Sharhlarga javob bering — hozircha lokal (mock) holatda.
          </p>
        </div>
        <span className="sp-badge sp-badge-info">Frontend demo</span>
      </div>

      <div className="sp-card p-4 sm:p-5 sp-animate">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
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
              Sana
            </span>
            <select
              className="sp-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            >
              <option value="newest">Eng yangi</option>
              <option value="week">O‘tgan hafta</option>
              <option value="month">O‘tgan oy</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Holati
            </span>
            <select
              className="sp-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | FeedbackStatus)}
            >
              <option value="all">Barchasi</option>
              <option value="unanswered">Javob berilmagan</option>
              <option value="answered">Javob berilgan</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mb-1.5">
              Xizmat turi
            </span>
            <select
              className="sp-select"
              value={service}
              onChange={(e) => setService(e.target.value as FeedbackService)}
            >
              <option value="all">Barcha xizmatlar</option>
              <option value="tour">Ekskursiya</option>
              <option value="hotel">Mehmonxona</option>
              <option value="transport">Transport</option>
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
        {filtered.length === 0 ? (
          <div className="sp-card p-10 text-center text-[#64748B] font-semibold">
            Mos keladigan sharh topilmadi.
          </div>
        ) : null}

        {filtered.map((item, idx) => (
          <article
            key={item.id}
            className={`sp-card p-5 sm:p-6 sp-animate ${idx < 4 ? `sp-animate-delay-${Math.min(idx + 1, 4) as 1 | 2 | 3 | 4}` : ""}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#0d2137] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                {item.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-[16px] font-bold text-[#111c2d]">{item.author}</h2>
                  <Stars n={item.rating} />
                  <span className="text-[13px] font-bold text-[#0d2137]">{item.rating.toFixed(1)}</span>
                  <span
                    className={
                      item.status === "answered"
                        ? "sp-badge sp-badge-ok"
                        : "sp-badge sp-badge-wait"
                    }
                  >
                    {item.status === "answered" ? "Javob berilgan" : "Kutilmoqda"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-[#94A3B8]">
                  <span>{item.dateLabel}</span>
                  <span>·</span>
                  <span className="text-[#006781]">{item.serviceLabel}</span>
                </div>
                <p className="mt-3 text-[14px] text-[#475569] font-semibold leading-relaxed">
                  “{item.quote}”
                </p>

                {item.reply ? (
                  <div className="mt-4 rounded-2xl border border-[#d8e3fb] bg-[#f0f3ff] p-4">
                    <div className="text-[11px] font-[family-name:var(--font-sora)] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                      Sizning javobingiz · {item.reply.dateLabel}
                    </div>
                    <p className="mt-2 text-[13px] text-[#111c2d] font-semibold leading-relaxed">
                      {item.reply.text}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="sp-btn sp-btn-ghost py-2 px-3 text-[12px]"
                        onClick={() => {
                          setDrafts((d) => ({ ...d, [item.id]: item.reply?.text ?? "" }));
                          toast.message("Tahrirlash — lokal draft");
                        }}
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        className="sp-btn sp-btn-ghost py-2 px-3 text-[12px]"
                        onClick={() => {
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? { ...x, status: "unanswered", reply: undefined }
                                : x,
                            ),
                          );
                          toast.success("Javob o‘chirildi (demo)");
                        }}
                      >
                        O‘chirish
                      </button>
                    </div>
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
                        onClick={() => sendReply(item.id)}
                      >
                        Javob yuborish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
