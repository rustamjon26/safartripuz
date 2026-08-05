"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquarePlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { partyTypeLabel } from "@/src/modules/supportchat/domain/party-type";

type Thread = {
  id: string;
  subject: string;
  partyType: "hotel" | "homestay" | "taxi" | "guide" | "customer";
  status: "OPEN" | "CLOSED";
  preview: string | null;
  lastMessageAt: string | null;
  unread: number;
};

export default function PartySupportChatPage() {
  const router = useRouter();
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support-chat/threads", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.push("/login?next=/support-chat");
        return;
      }
      const data = (await res.json()) as { items?: Thread[]; message?: string };
      if (!res.ok) throw new Error(data.message || "Yuklanmadi");
      setItems(data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/support-chat/threads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = (await res.json()) as {
        thread?: { id: string };
        message?: string;
      };
      if (!res.ok) throw new Error(data.message || "Ochilmadi");
      toast.success("Suhbat ochildi");
      router.push(`/support-chat/${data.thread?.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xato");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-[#d8e3fb] bg-white text-[#64748B]"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0d2137]">
                SafarTrip Support
              </h1>
              <p className="text-[12px] font-semibold text-[#64748B]">
                Mehmonxona · uy · taxi · gid · mijoz
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#006781] text-white text-[12px] font-bold px-3 py-2"
            onClick={() => setOpenForm((v) => !v)}
          >
            <Plus size={14} />
            Yangi
          </button>
        </div>

        {openForm ? (
          <form
            onSubmit={(e) => void createThread(e)}
            className="rounded-2xl bg-white border border-[#d8e3fb] p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-[13px] font-bold text-[#0d2137]">
              <MessageSquarePlus size={16} className="text-[#006781]" />
              Yangi murojaat
            </div>
            <input
              required
              minLength={3}
              className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold"
              placeholder="Mavzu (masalan: Bron bo‘yicha savol)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <textarea
              required
              minLength={1}
              rows={4}
              className="w-full rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] px-3 py-2.5 text-sm font-semibold resize-none"
              placeholder="Muammoni batafsil yozing…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#0d2137] text-white text-sm font-bold py-3 disabled:opacity-50"
            >
              {saving ? "Yuborilmoqda…" : "Yuborish"}
            </button>
          </form>
        ) : null}

        {loading ? (
          <div className="rounded-2xl bg-white border border-[#d8e3fb] p-10 flex justify-center text-[#64748B]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#d8e3fb] p-10 text-center text-sm font-semibold text-[#94A3B8]">
            Hali suhbat yo&apos;q. &quot;Yangi&quot; tugmasi bilan yozing.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <Link
                key={t.id}
                href={`/support-chat/${t.id}`}
                className="block rounded-2xl bg-white border border-[#d8e3fb] p-4 hover:bg-[#f9f9ff]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-bold text-[#0d2137] truncate">
                    {t.subject}
                  </div>
                  {t.unread > 0 ? (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                      {t.unread}
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] font-bold text-[#64748B] mt-0.5">
                  {partyTypeLabel(t.partyType)} · {t.status}
                </div>
                <p className="text-[12px] font-semibold text-[#94A3B8] mt-1 line-clamp-1">
                  {t.preview ?? "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
