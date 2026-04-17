"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, Clock, Info, X } from "lucide-react";
import { toast } from "sonner";

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
}

export default function NotificationPopover({ notifications, onMarkRead, onClose }: NotificationPopoverProps) {
  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0">
        <div>
          <h3 className="font-black text-slate-900 leading-none">Bildirishnomalar</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {unreadCount > 0 ? `${unreadCount} ta o'qilmagan` : "Hamma xabarlar o'qilgan"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={() => onMarkRead("all")}
              className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
            >
              Hammasini o'qish
            </button>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
               <Bell className="text-slate-200" size={24} />
            </div>
            <p className="text-sm font-bold text-slate-400">Hozircha xabarlar yo'q</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => !n.readAt && onMarkRead(n.id)}
              className={`p-5 flex gap-4 transition-colors cursor-pointer group ${!n.readAt ? "bg-blue-50/30 hover:bg-blue-50/50" : "hover:bg-slate-50"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                n.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {n.type === 'success' ? <CheckCircle size={18} /> : n.type === 'warning' ? <Clock size={18} /> : <Info size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`text-sm font-black leading-tight mb-1 truncate ${!n.readAt ? "text-slate-900" : "text-slate-500"}`}>
                    {n.title}
                  </h4>
                  {!n.readAt && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 shrink-0" />}
                </div>
                <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${!n.readAt ? "text-slate-600" : "text-slate-400"}`}>
                  {n.body}
                </p>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                  {new Date(n.createdAt).toLocaleDateString("uz-UZ")} • {new Date(n.createdAt).toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
        <button className="text-xs font-black text-slate-500 hover:text-slate-900 transition-colors">
          Barcha xabarlarni ko'rish
        </button>
      </div>
    </div>
  );
}
