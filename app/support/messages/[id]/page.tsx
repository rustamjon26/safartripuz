"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { partyTypeLabel } from "@/src/modules/supportchat";

type Thread = {
  id: string;
  subject: string;
  partyType: "hotel" | "homestay" | "taxi" | "guide" | "customer";
  partyName: string;
  status: "OPEN" | "CLOSED";
};

type Msg = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  me: boolean;
  role: "AGENT" | "PARTY" | null;
};

export default function SupportMessageDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/chat/threads/${id}/messages`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        thread?: Thread;
        messages?: Msg[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Yuklanmadi");
      setThread(data.thread ?? null);
      setMessages(data.messages ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || !id) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/chat/threads/${id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { message?: Msg; messageText?: string };
      if (!res.ok) {
        throw new Error(
          (data as { message?: string }).message || "Yuborilmadi",
        );
      }
      if (data.message) setMessages((prev) => [...prev, data.message as Msg]);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!thread) return;
    const next = thread.status === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const res = await fetch(`/api/support/chat/threads/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Yangilanmadi");
      setThread({ ...thread, status: next });
      toast.success(next === "CLOSED" ? "Suhbat yopildi" : "Suhbat ochildi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    }
  }

  return (
    <div className="sp-card overflow-hidden flex flex-col min-h-[70vh]">
      <header className="px-4 py-3 border-b border-[#d8e3fb] flex items-center gap-3 bg-white">
        <Link
          href="/support/messages"
          className="p-2 rounded-xl border border-[#d8e3fb] text-[#64748B]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[#0d2137] truncate">
            {thread?.subject ?? "Suhbat"}
          </div>
          <div className="text-[11px] font-bold text-[#64748B]">
            {thread
              ? `${partyTypeLabel(thread.partyType)} · ${thread.partyName}`
              : "…"}
          </div>
        </div>
        {thread ? (
          <button
            type="button"
            className="sp-btn sp-btn-ghost text-[11px]"
            onClick={() => void toggleStatus()}
          >
            {thread.status === "OPEN" ? "Yopish" : "Qayta ochish"}
          </button>
        ) : null}
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3 bg-[#f4f6fb]">
        {loading ? (
          <div className="flex justify-center py-10 text-[#64748B]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${m.me ? "ml-auto items-end" : "items-start"}`}
            >
              {!m.me ? (
                <div className="text-[10px] font-bold text-[#94A3B8] mb-1 px-1">
                  {m.authorName}
                  {m.role === "PARTY" ? " · tomon" : ""}
                </div>
              ) : null}
              <div
                className={`px-3.5 py-2.5 text-[13px] font-semibold leading-relaxed rounded-2xl ${
                  m.me
                    ? "bg-[#006781] text-white rounded-br-md"
                    : "bg-white border border-[#d8e3fb] text-[#0d2137] rounded-bl-md"
                }`}
              >
                {m.body}
              </div>
              <div className="text-[10px] font-bold text-[#94A3B8] mt-1 px-1">
                {new Date(m.createdAt).toLocaleString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#d8e3fb] bg-white p-3 flex items-center gap-2">
        <input
          className="sp-input flex-1"
          placeholder={
            thread?.status === "CLOSED"
              ? "Yopiq — yozsangiz qayta ochiladi"
              : "Javob yozing…"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          className="sp-btn sp-btn-primary"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Yuborish
        </button>
      </div>
    </div>
  );
}
