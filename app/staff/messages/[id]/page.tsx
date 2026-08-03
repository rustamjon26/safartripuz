"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mic, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { CHAT_MESSAGES, THREADS } from "../../mock-data";

export default function StaffChatDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const thread = THREADS.find((t) => t.id === id);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(CHAT_MESSAGES);

  const title = useMemo(
    () => thread?.name ?? "Chat",
    [thread],
  );

  function send() {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        from: "Men",
        me: true,
        text: value,
        time: "Hozir",
      },
    ]);
    setText("");
    toast.success("Yuborildi (lokal demo)");
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-center bg-[#f4f6fb] md:bg-transparent">
      <div className="w-full max-w-[430px] h-full flex flex-col bg-[#f4f6fb] md:border md:border-[#d8e3fb] md:rounded-[28px] md:my-6 md:h-[calc(100dvh-48px)] overflow-hidden">
        <header className="shrink-0 px-4 py-3 border-b border-[#d8e3fb] bg-white/90 backdrop-blur flex items-center gap-3">
          <Link
            href="/staff/messages"
            className="p-2 rounded-xl border border-[#d8e3fb] text-[#64748B]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-[#0d2137] truncate">{title}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
              Active Stream
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
          <div className="text-center text-[11px] font-bold text-[#94A3B8]">Bugun</div>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${m.me ? "ml-auto items-end" : "items-start"}`}
            >
              {!m.me ? (
                <div className="text-[10px] font-bold text-[#94A3B8] mb-1 px-1">{m.from}</div>
              ) : null}
              <div className={`px-3.5 py-2.5 text-[13px] font-semibold leading-relaxed ${m.me ? "st-bubble-me" : "st-bubble-them"}`}>
                {m.text}
              </div>
              <div className="text-[10px] font-bold text-[#94A3B8] mt-1 px-1">{m.time}</div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-[#d8e3fb] bg-white p-3 flex items-center gap-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B]"
            onClick={() => toast.message("Fayl — backend keyin")}
          >
            <Paperclip size={18} />
          </button>
          <input
            className="st-input flex-1"
            placeholder="Xabar yozing..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            className="p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B]"
            onClick={() => toast.message("Mikrofon — demo")}
          >
            <Mic size={18} />
          </button>
          <button
            type="button"
            onClick={send}
            className="p-2.5 rounded-xl bg-[#006781] text-white"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
