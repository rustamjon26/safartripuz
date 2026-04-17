"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Utensils, Search, Plus, Loader2, RefreshCw, X, Verified,
  ShoppingCart, CreditCard, ChevronRight, CheckCircle2, User,
  Settings
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface MenuItem { id: string; name: string; description: string | null; price: number; category: string; isActive: boolean; }
interface Booking { id: string; guestName: string; }
interface UserData { role: string; }

export default function RestaurantPage() {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [ordering, setOrdering] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [table, setTable] = useState("");

  // Management State
  const [user, setUser] = useState<UserData | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [managingItem, setManagingItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", category: "MAIN", price: "", description: "" });

  async function load() {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        fetch("/api/hotel/me"),
        fetch("/api/hotel/rest")
      ]);
      const uData = await uRes.json();
      const rData = await rRes.json();
      
      if (uRes.ok) setUser(uData.staffRecord);
      if (rRes.ok) { setMenu(rData.menuItems); setBookings(rData.activeBookings); }
    } catch { toast.error(t("common.error")); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { item, qty: 1 }];
    });
  };

  const total = cart.reduce((acc, i) => acc + (Number(i.item.price) * i.qty), 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    try {
      const res = await fetch("/api/hotel/rest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId || null,
          tableNumber: table || null,
          items: cart,
          totalAmount: total
        })
      });
      if (res.ok) {
        toast.success(t("services.rest.toasts.order_success"));
        setCart([]); setBookingId(""); setTable(""); setOrdering(false);
        void load();
      }
    } catch { toast.error(t("common.error")); }
  }

  const canManage = user?.role === "hotel_manager" || user?.role === "admin";

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const isEdit = !!managingItem;
      const res = await fetch("/api/hotel/rest/menu", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...itemForm, id: managingItem.id } : itemForm)
      });
      if (res.ok) {
        toast.success(isEdit ? t("services.rest.toasts.save_success") : t("services.rest.toasts.add_success"));
        setShowItemModal(false);
        setManagingItem(null);
        setItemForm({ name: "", category: "MAIN", price: "", description: "" });
        void load();
      }
    } catch { toast.error(t("common.toasts.error")); }
  }

  async function toggleItemActive(item: MenuItem) {
    try {
      const res = await fetch("/api/hotel/rest/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive })
      });
      if (res.ok) {
        toast.success(t("services.rest.toasts.status_updated"));
        void load();
      }
    } catch { toast.error(t("common.error")); }
  }

  const filteredMenu = activeTab === "ALL" 
    ? (isManaging ? menu : menu.filter(m => m.isActive)) 
    : (isManaging ? menu.filter(i => i.category === activeTab) : menu.filter(i => i.category === activeTab && i.isActive));
  
  const categories = ["ALL", "MAIN", "STARTER", "DRINK", "DESSERT"];

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight flex items-center gap-2">
               <Utensils size={24} className="text-[var(--accent)]"/> {t("services.rest.title")}
            </h1>
            <p className="text-[13px] font-semibold text-slate-500 mt-1">
              {t("services.rest.subtitle")}
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsManaging(!isManaging)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black uppercase transition-all ${isManaging ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
               >
                 {isManaging ? <CheckCircle2 size={16}/> : <Settings size={16}/>}
                 {isManaging ? t("services.rest.finish_manage") : t("services.rest.manage_btn")}
               </button>
               {isManaging && (
                 <button 
                   onClick={() => { setManagingItem(null); setItemForm({ name: "", category: "MAIN", price: "", description: "" }); setShowItemModal(true); }}
                   className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-[12px] font-black uppercase rounded-xl shadow-md"
                 >
                   <Plus size={16}/> {t("services.rest.add_item")}
                 </button>
               )}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 shrink-0">
           {categories.map(cat => (
             <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${activeTab === cat ? 'bg-[var(--accent)] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
                {t(`services.rest.categories.${cat}`)}
             </button>
           ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
           {loading ? (
             <div className="col-span-full py-20 text-center text-slate-400">
                <Loader2 size={32} className="animate-spin mx-auto mb-2"/>
                <p className="text-[11px] font-bold uppercase tracking-widest">{t("services.rest.loading_menu")}</p>
             </div>
           ) : filteredMenu.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400">{t("services.rest.no_data")}</div>
           ) : filteredMenu.map(item => (
              <div key={item.id} className={`bg-white border rounded-2xl p-4 text-left shadow-sm transition-all relative overflow-hidden flex flex-col justify-between ${!item.isActive ? 'opacity-50 grayscale' : ''} ${isManaging ? 'border-slate-200' : 'hover:border-[var(--accent)] hover:shadow-md active:scale-95 group cursor-pointer'}`}
                onClick={() => !isManaging && item.isActive && addToCart(item)}
              >
                 {!isManaging && item.isActive && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-light-blue)] p-1 rounded-lg">
                      <Plus size={16} className="text-[var(--accent)]"/>
                    </div>
                 )}
                 {isManaging && (
                   <div className="absolute top-2 right-2 flex gap-1">
                     <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setManagingItem(item); 
                          setItemForm({ name: item.name, category: item.category, price: String(item.price), description: item.description || "" }); 
                          setShowItemModal(true); 
                        }}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                     >
                       <Settings size={14}/>
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); toggleItemActive(item); }}
                        className={`p-1.5 rounded-lg ${item.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                     >
                       {item.isActive ? <X size={14}/> : <RefreshCw size={14}/>}
                     </button>
                   </div>
                 )}
                 
                 <div>
                    <div className={`text-[14px] font-extrabold text-[var(--primary)] line-clamp-1 mb-1 ${!item.isActive ? 'line-through' : ''}`}>{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-3">{t(`services.rest.categories.${item.category}`)}</div>
                 </div>
                 
                 <div className="flex items-end justify-between">
                    <div className="text-[15px] font-black text-[var(--accent)]">{Number(item.price).toLocaleString()} <span className="text-[10px] lowercase">{t("common.currency")}</span></div>
                 </div>
              </div>
            ))}
        </div>
      </div>

      {/* Cart Drawer */}
      <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shadow-inner">
         <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center gap-2">
            <ShoppingCart size={18} className="text-[var(--primary)]"/>
            <h3 className="font-black text-[var(--primary)] text-[14px] uppercase tracking-wider">{t("services.rest.cart_title")}</h3>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                 <Utensils size={48} className="mb-4" />
                 <p className="text-[11px] font-black uppercase">{t("services.rest.cart_empty")}</p>
              </div>
            ) : cart.map((i, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm group">
                 <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[var(--primary)] text-[13px]">{i.item.name}</span>
                    <button onClick={() => setCart(prev => prev.filter(c => c.item.id !== i.item.id))} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"><X size={14}/></button>
                 </div>
                 <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-black text-slate-600">
                       x {i.qty}
                    </div>
                    <div className="text-[13px] font-black text-slate-800">{(Number(i.item.price) * i.qty).toLocaleString()} {t("common.currency")}</div>
                 </div>
              </div>
            ))}
         </div>

         <div className="p-5 bg-white border-t border-slate-200 space-y-4">
            <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
               <span>{t("services.rest.total_label")}</span>
               <span className="text-xl text-[var(--primary)] tracking-tight">{total.toLocaleString()} {t("common.currency")}</span>
            </div>
            
            <button disabled={cart.length === 0} onClick={() => setOrdering(true)} className="w-full py-3 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl hover:bg-[var(--secondary)] transition-all shadow-md disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
               {t("services.rest.checkout_btn")} <ChevronRight size={16}/>
            </button>
         </div>
      </div>

      {/* Checkout Modal */}
      {ordering && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{t("services.rest.modal_checkout_title")}</h3>
                  <button onClick={() => setOrdering(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               <form onSubmit={handleCheckout} className="p-5 space-y-4">
                  <div className="bg-[var(--bg-light-blue)] p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center">
                     <span className="font-black text-[var(--primary)] text-[11px] uppercase">{t("services.rest.pay_total")}</span>
                     <span className="font-black text-[var(--accent)] text-lg">{total.toLocaleString()} {t("common.currency")}</span>
                  </div>
                  
                  <div>
                     <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">{t("services.rest.pay_method_label")}</label>
                     <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setBookingId("")} className={`p-3 rounded-xl border text-[11px] font-black uppercase text-center transition-all ${!bookingId ? 'border-[var(--accent)] bg-white text-[var(--accent)] shadow-md' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                           <div className="flex flex-col items-center gap-1"><CreditCard size={20}/> {t("services.rest.pay_cash")}</div>
                        </button>
                        <select value={bookingId} onChange={e => { setBookingId(e.target.value); setTable(""); }} className={`p-3 rounded-xl border text-[11px] font-black uppercase text-center transition-all appearance-none cursor-pointer ${bookingId ? 'border-[var(--accent)] bg-white text-[var(--accent)] shadow-md' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                           <option value="">{t("services.rest.folio_option")}</option>
                           {bookings.map(b => <option key={b.id} value={b.id}>{b.guestName} (Hotel)</option>)}
                        </select>
                     </div>
                  </div>

                  {!bookingId && (
                    <div>
                       <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.rest.table_number")}</label>
                       <input value={table} onChange={e => setTable(e.target.value)} placeholder="01" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-black outline-none focus:border-[var(--accent)]"/>
                    </div>
                  )}

                  <div className="pt-2">
                     <button type="submit" className="w-full py-3 bg-green-600 text-white text-[13px] font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                       <CheckCircle2 size={16}/> {t("services.rest.finish_order")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* Item Management Modal */}
      {showItemModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-bold text-[var(--primary)] text-[15px]">{managingItem ? t("services.rest.modal_item_title_edit") : t("services.rest.modal_item_title_add")}</h3>
                  <button onClick={() => setShowItemModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 bg-white rounded-md shadow-sm"><X size={16}/></button>
               </div>
               <form onSubmit={handleSaveItem} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.rest.item_name")}</label>
                    <input required value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.rest.item_category")}</label>
                        <select value={itemForm.category} onChange={e=>setItemForm({...itemForm, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold appearance-none bg-white cursor-pointer">
                           <option value="MAIN">{t("services.rest.categories.MAIN")}</option>
                           <option value="STARTER">{t("services.rest.categories.STARTER")}</option>
                           <option value="DRINK">{t("services.rest.categories.DRINK")}</option>
                           <option value="DESSERT">{t("services.rest.categories.DESSERT")}</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.rest.item_price")}</label>
                        <input required type="number" value={itemForm.price} onChange={e=>setItemForm({...itemForm, price: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-[var(--accent)]"/>
                     </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">{t("services.rest.item_desc")}</label>
                    <textarea value={itemForm.description} onChange={e=>setItemForm({...itemForm, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[var(--accent)] resize-none" />
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full py-2.5 bg-[var(--accent)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors flex items-center justify-center gap-2">
                       <Verified size={16}/> {t("services.rest.save_btn")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
