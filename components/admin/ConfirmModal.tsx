"use client";

import type { ReactNode } from "react";
import { AdminModal } from "@/components/admin/taxi/AdminModal";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  subjectName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmLoading?: boolean;
  confirmDanger?: boolean;
  children?: ReactNode;
};

export function ConfirmModal({
  open,
  title,
  description,
  subjectName,
  onConfirm,
  onCancel,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  confirmLoading = false,
  confirmDanger = false,
  children,
}: ConfirmModalProps) {
  return (
    <AdminModal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="adm-btn" onClick={onCancel} disabled={confirmLoading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`adm-btn ${confirmDanger ? "bg-rose-600 text-white border-rose-600 hover:opacity-95" : "adm-btn-primary"}`}
            disabled={confirmLoading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{description}</p>
      <p className="text-sm font-black text-slate-900 mt-2 break-words">{subjectName}</p>
      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
    </AdminModal>
  );
}
