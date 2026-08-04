"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CheckCircle, Clock, Info, X } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
};

interface NotificationPopoverProps {
  notifications: Notification[];
  onMarkRead: (id: string | "all") => void;
  onClose: () => void;
  /** Bell button element — popover anchors below this. */
  anchorEl: HTMLElement | null;
}

type PanelPos = {
  top: number;
  left: number;
  width: number;
};

function computePosition(anchor: HTMLElement): PanelPos {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(384, Math.max(288, window.innerWidth - 16));
  const gap = 8;
  let left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  let top = rect.bottom + gap;
  const estimatedHeight = 360;
  if (top + estimatedHeight > window.innerHeight - 8 && rect.top > estimatedHeight) {
    top = Math.max(8, rect.top - estimatedHeight - gap);
  }
  return { top, left, width };
}

export default function NotificationPopover({
  notifications,
  onMarkRead,
  onClose,
  anchorEl,
}: NotificationPopoverProps) {
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    const update = () => setPos(computePosition(anchorEl));
    update();
    window.addEventListener("resize", update);
    // Capture scroll on any ancestor — sticky headers move the anchor.
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || !pos) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Yopish"
        className="fixed inset-0 z-[60] cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Bildirishnomalar"
        className="fixed z-[70] bg-white border border-gray-200 rounded-3xl shadow-2xl shadow-gray-900/10 overflow-hidden flex flex-col max-h-[min(500px,calc(100vh-24px))]"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0">
          <div>
            <h3 className="font-black text-gray-900 leading-none">
              Bildirishnomalar
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              {unreadCount > 0
                ? `${unreadCount} ta o'qilmagan`
                : "Hamma xabarlar o'qilgan"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => onMarkRead("all")}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
              >
                Hammasini o&apos;qish
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-6">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                <Bell className="text-gray-300" size={24} />
              </div>
              <p className="text-sm font-bold text-gray-500">
                Hozircha xabarlar yo&apos;q
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.readAt && onMarkRead(n.id)}
                className={`p-5 flex gap-4 transition-colors cursor-pointer group ${
                  !n.readAt
                    ? "bg-blue-50/50 hover:bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : n.type === "warning"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {n.type === "success" ? (
                    <CheckCircle size={18} />
                  ) : n.type === "warning" ? (
                    <Clock size={18} />
                  ) : (
                    <Info size={18} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h4
                      className={`text-sm font-black leading-tight mb-1 truncate ${
                        !n.readAt ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.readAt && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-xs font-medium leading-relaxed line-clamp-2 ${
                      !n.readAt ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {n.body}
                  </p>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                    {new Date(n.createdAt).toLocaleDateString("uz-UZ")} •{" "}
                    {new Date(n.createdAt).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <button
            type="button"
            className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors"
          >
            Barcha xabarlarni ko&apos;rish
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
