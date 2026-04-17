"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Star } from "lucide-react";

export default function HomeStayReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/homestay/bookings/${params.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Review yuborilmadi");
      toast.success("Review yuborildi");
      router.push("/user/bookings/homestay");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Leave Review" subtitle="HomeStay tajribangizni baholang">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={submitReview} className="space-y-5">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`p-1.5 rounded ${s <= rating ? "text-amber-500" : "text-slate-300"}`}
                >
                  <Star size={24} fill="currentColor" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
              Comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-input min-h-[140px]"
              placeholder="Tajriba haqida yozing..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
