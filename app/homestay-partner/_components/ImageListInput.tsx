"use client";

import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

export default function ImageListInput({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const preview = useMemo(() => urlInput.trim(), [urlInput]);

  function addImage() {
    const next = urlInput.trim();
    if (!next) return;
    onChange([...images, next]);
    setUrlInput("");
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="h-input flex-1"
          placeholder="https://..."
        />
        <button
          type="button"
          onClick={addImage}
          className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700"
        >
          <Plus size={14} />
        </button>
      </div>

      {preview ? (
        <div className="rounded-xl border border-slate-200 p-2">
          <p className="text-xs font-semibold text-slate-500 mb-2">Preview</p>
          <img src={preview} alt="preview" className="h-28 w-full object-cover rounded-lg bg-slate-100" />
        </div>
      ) : null}

      <div className="space-y-2">
        {images.map((img, idx) => (
          <div key={`${img}-${idx}`} className="border border-slate-200 rounded-xl p-2">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500">
                {idx === 0 ? "Cover image" : `Image ${idx + 1}`}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(idx, -1)} className="p-1 rounded border border-slate-200">
                  <ArrowUp size={12} />
                </button>
                <button type="button" onClick={() => move(idx, 1)} className="p-1 rounded border border-slate-200">
                  <ArrowDown size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, i) => i !== idx))}
                  className="p-1 rounded border border-slate-200 text-red-500"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <img src={img} alt={`listing-${idx}`} className="h-24 w-full object-cover rounded-lg bg-slate-100" />
            <p className="text-xs text-slate-500 mt-1 truncate">{img}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
