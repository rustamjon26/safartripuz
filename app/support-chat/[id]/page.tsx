"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Thread = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
};

type Msg = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  me: boolean;
};

export default function PartySupportChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/support-chat/threads/${id}/messages`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push(`/login?next=/support-chat/${id}`);
        return;
      }
      const data = (await res.json()) as {
        thread?: Thread;
        messages?: Msg[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Yuklanmadi");
      setThread(data.thread ?? null);
      setMessages(data.messages ?? []);
    } catch (e) {
      if (!opts?.silent) {
        toast.error(e instanceof Error ? e.message : "Xato");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support-chat/threads/${id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as {
        message?: Msg;
        messageText?: string;
      } & { message?: string | Msg };
      if (!res.ok) {
        const errMsg =
          typeof data.message === "string" ? data.message : "Yuborilmadi";
        throw new Error(errMsg);
      }
      if (data.message && typeof data.message === "object") {
        setMessages((prev) => [...prev, data.message as Msg]);
      } else {
        await load();
      }
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col">
      <header className="shrink-0 border-b border-[#d8e3fb] bg-white px-4 py-3 flex items-center gap-3">
        <Link
          href="/support-chat"
          className="p-2 rounded-xl border border-[#d8e3fb] text-[#64748B]"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-[#0d2137] truncate">
            {thread?.subject ?? "Suhbat"}
          </div>
          <div className="text-[11px] font-bold text-[#10B981]">
            SafarTrip Support · {thread?.status ?? "…"}
            {thread?.status === "CLOSED"
              ? " — yozsangiz qayta ochiladi"
              : ""}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-3 max-w-2xl w-full mx-auto">
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
                  {m.authorName} · Support
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
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-[#d8e3fb] bg-white p-3 max-w-2xl w-full mx-auto flex gap-2">
        <input
          className="flex-1 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold"
          placeholder="Xabar yozing…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
          className="rounded-xl bg-[#006781] text-white px-4 font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Yuborish
        </button>
      </div>
    </div>
  );
}
