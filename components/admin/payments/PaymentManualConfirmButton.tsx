"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

export function PaymentManualConfirmButton({ paymentId, hidden }: { paymentId: string; hidden: boolean }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { message?: string }).message || "Xatolik");
      toast.success("To'lov tasdiqlandi");
      setOpen(false);
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <>
      <button type="button" disabled={loading} onClick={() => setOpen(true)} className="adm-btn adm-btn-primary disabled:opacity-50">
        Tasdiqlash
      </button>
      <ConfirmModal
        open={open}
        title="MANUAL to'lovni tasdiqlash"
        description="To'lov muvaffaqiyatli (SUCCESS) deb belgilanadi va mijozga hisoblanadi."
        subjectName={paymentId}
        confirmLoading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={() => void onConfirm()}
      />
    </>
  );
}
