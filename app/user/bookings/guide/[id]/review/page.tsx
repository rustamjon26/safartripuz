"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Star } from "lucide-react";

export default function GuideReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/guide/bookings/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Review yuborilmadi");
      toast.success("Review yuborildi");
      router.push("/user/bookings/guide");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Guide Review" subtitle="Guide tajribangizni baholang">
      <div className="max-w-2xl mx-auto bg-slate-800 rounded-3xl border border-slate-700/50 p-6 shadow-sm shadow-slate-900/20">
        <form onSubmit={submitReview} className="space-y-5">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`p-1 rounded-lg transition-all hover:scale-110 ${
                    s <= rating ? "text-amber-400" : "text-slate-700 hover:text-amber-400/50"
                  }`}
                >
                  <Star size={32} fill={s <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[140px] bg-slate-700/40 border border-slate-600/50 rounded-2xl px-4 py-3 text-white placeholder:text-slate-500 resize-none outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/10 text-sm"
              placeholder="Tajriba haqida yozing..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-white font-black px-6 py-3 rounded-xl text-sm disabled:opacity-40 transition-all"
          >
            {saving ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
