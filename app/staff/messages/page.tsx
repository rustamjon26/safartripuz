"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { THREADS } from "../mock-data";

type Tab = "all" | "groups" | "personal" | "unread";

export default function StaffMessagesPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let items = [...THREADS];
    if (tab === "groups") items = items.filter((t) => t.group);
    if (tab === "personal") items = items.filter((t) => !t.group);
    if (tab === "unread") items = items.filter((t) => t.unread > 0);
    const query = q.trim().toLowerCase();
    if (query) {
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.preview.toLowerCase().includes(query),
      );
    }
    return items;
  }, [tab, q]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "Barchasi" },
    { id: "groups", label: "Guruhlar" },
    { id: "personal", label: "Shaxsiy" },
    { id: "unread", label: "O‘qilmagan" },
  ];

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
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "st-chip st-chip-active shrink-0" : "st-chip st-chip-idle shrink-0"}
          >
            {t.label}
          </button>
        ))}
      </div>

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
                <div className="text-[10px] font-bold text-[#94A3B8] shrink-0">{thread.when}</div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-[12px] font-semibold text-[#64748B] truncate">
                  {thread.preview}
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
    </div>
  );
}
