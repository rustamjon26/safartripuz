"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { toast } from "sonner";

type Thread = {
  id: string;
  name: string;
  kind: string;
  preview: string | null;
  lastMessageAt: string | null;
  unread: number;
};

export default function StaffMessagesPage() {
  const [tab, setTab] = useState<"all" | "groups" | "unread">("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/staff/chat/threads", { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setItems(json.items ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Xato");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const list = useMemo(() => {
    let rows = [...items];
    if (tab === "groups") rows = rows.filter((t) => t.kind === "DEPARTMENT");
    if (tab === "unread") rows = rows.filter((t) => t.unread > 0);
    const query = q.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.preview ?? "").toLowerCase().includes(query),
      );
    }
    return rows;
  }, [items, tab, q]);

  return (
    <div className="space-y-4 st-animate">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-bold text-[#0d2137]">Xabarlar</h1>
        <button
          type="button"
          className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B]"
        >
          <Bell size={18} />
        </button>
      </header>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          className="st-input pl-10"
          placeholder="Qidirish..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "Barchasi"],
            ["groups", "Guruhlar"],
            ["unread", "O‘qilmagan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? "st-chip st-chip-active shrink-0" : "st-chip st-chip-idle shrink-0"}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="st-card p-8 text-center text-[#64748B] font-semibold">Yuklanmoqda…</div>
      ) : (
        <div className="space-y-2">
          {list.map((thread) => (
            <Link
              key={thread.id}
              href={`/staff/messages/${thread.id}`}
              className="st-card p-4 flex items-center gap-3 no-underline"
            >
              <div className="w-11 h-11 rounded-full bg-[#0d2137] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                {thread.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[13px] font-bold text-[#0d2137] truncate">{thread.name}</div>
                  <div className="text-[10px] font-bold text-[#94A3B8] shrink-0">
                    {thread.lastMessageAt
                      ? new Date(thread.lastMessageAt).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[12px] font-semibold text-[#64748B] truncate">
                    {thread.preview ?? "Hali xabar yo‘q"}
                  </p>
                  {thread.unread > 0 ? (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
