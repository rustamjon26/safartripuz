"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  /** Render in compact mode (smaller drop zone, smaller thumbs). */
  compact?: boolean;
  /** Optional placeholder text for the drop zone. */
  placeholder?: string;
};

const DEFAULT_MAX = 20;

/**
 * Drag-and-drop / click image uploader.
 *
 * - Accepts JPEG / PNG / WEBP / AVIF / GIF, max 10 MB per file (enforced
 *   server-side too).
 * - Uploads to `POST /api/upload/images` and stores the returned URLs.
 * - Renders existing URLs as thumbnails — works for both newly-uploaded
 *   files and legacy external URLs already stored in the database.
 */
export default function ImageUploader({
  value,
  onChange,
  maxImages = DEFAULT_MAX,
  compact = false,
  placeholder = "Rasm yuklash uchun bosing yoki shu yerga tashlang",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const remaining = Math.max(0, maxImages - value.length);

  const handleFiles = useCallback(
    async (filesList: FileList | File[]) => {
      const files = Array.from(filesList);
      if (files.length === 0) return;
      if (remaining === 0) {
        toast.error(`Eng ko'pi bilan ${maxImages} ta rasm yuklash mumkin`);
        return;
      }
      const toSend = files.slice(0, remaining);
      if (files.length > toSend.length) {
        toast.info(`Faqat birinchi ${toSend.length} ta rasm yuklanadi`);
      }

      setUploading(true);
      try {
        const fd = new FormData();
        for (const f of toSend) fd.append("files", f);

        const res = await fetch("/api/upload/images", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Yuklashda xatolik");
        }
        const urls = Array.isArray(data?.urls) ? (data.urls as string[]) : [];
        if (urls.length === 0) {
          throw new Error("Yuklangan rasmlar qaytarilmadi");
        }
        onChange([...value, ...urls]);
        toast.success(
          urls.length === 1 ? "Rasm yuklandi" : `${urls.length} ta rasm yuklandi`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Yuklashda xatolik");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [maxImages, onChange, remaining, value],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  function removeAt(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
  }

  const thumbSize = compact ? "w-[72px] h-[72px]" : "w-[110px] h-[110px]";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={`relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 ${thumbSize}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`image-${i + 1}`}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.currentTarget.style.opacity = "0.4";
              }}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="O'chirish"
            >
              <X size={12} />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                Asosiy
              </span>
            )}
          </div>
        ))}

        {remaining > 0 && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer rounded-lg border-2 border-dashed transition-colors shrink-0 ${thumbSize} ${
              dragOver
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-300 bg-slate-50 text-slate-500 hover:border-emerald-500 hover:text-emerald-600"
            }`}
          >
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            <span className="text-[10px] font-bold leading-none text-center px-1">
              {uploading ? "Yuklanmoqda..." : compact ? "Yuklash" : "Yuklash"}
            </span>
          </label>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            void handleFiles(e.target.files);
          }
        }}
      />

      {!compact && (
        <p className="text-[11px] text-slate-400 font-semibold">
          {value.length === 0
            ? placeholder
            : `${value.length}${maxImages < DEFAULT_MAX ? `/${maxImages}` : ""} ta rasm. JPEG / PNG / WEBP, 10 MB gacha.`}
        </p>
      )}
    </div>
  );
}
