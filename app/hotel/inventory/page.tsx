"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type RoomType = {
  id: string;
  name: string;
  basePrice: string;
  capacityAdults: number;
  capacityChildren: number;
  _count?: { rooms: number };
};
type Room = {
  id: string;
  roomNumber: string;
  floor: string | null;
  status: string;
  roomType: { id: string; name: string };
};

export default function HotelInventoryPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [rtName, setRtName] = useState("");
  const [rtPrice, setRtPrice] = useState("");
  const [rtAdults, setRtAdults] = useState(2);
  const [rtChildren, setRtChildren] = useState(0);

  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [typesRes, roomsRes] = await Promise.all([
        fetch("/api/hotel/room-types"),
        fetch("/api/hotel/rooms"),
      ]);
      const typesData = (await typesRes.json()) as { items?: RoomType[]; message?: string };
      const roomsData = (await roomsRes.json()) as { items?: Room[]; message?: string };
      if (!typesRes.ok) throw new Error(typesData.message || "Room types error");
      if (!roomsRes.ok) throw new Error(roomsData.message || "Rooms error");
      setRoomTypes(typesData.items ?? []);
      setRooms(roomsData.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRoomType(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rtName,
          basePrice: Number(rtPrice),
          capacityAdults: rtAdults,
          capacityChildren: rtChildren,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Create room type error");
      toast.success("Room type yaratildi");
      setRtName("");
      setRtPrice("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  }

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/hotel/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          roomNumber,
          floor: floor || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Create room error");
      toast.success("Xona yaratildi");
      setRoomNumber("");
      setFloor("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Hotel Inventory</h1>
      <p className="mt-1 text-slate-600">Room types va physical roomlar boshqaruvi.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <form onSubmit={createRoomType} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-900">Yangi Room Type</div>
          <div className="mt-3 grid gap-2">
            <input required value={rtName} onChange={(e) => setRtName(e.target.value)} placeholder="Name (Deluxe)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input required type="number" min={0} step="0.01" value={rtPrice} onChange={(e) => setRtPrice(e.target.value)} placeholder="Base price" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={rtAdults} onChange={(e) => setRtAdults(Number(e.target.value))} placeholder="Adults" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              <input type="number" min={0} value={rtChildren} onChange={(e) => setRtChildren(Number(e.target.value))} placeholder="Children" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white">Create room type</button>
        </form>

        <form onSubmit={createRoom} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-900">Yangi Physical Room</div>
          <div className="mt-3 grid gap-2">
            <select required value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Room type tanlang...</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
            <input required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Room number (101)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Floor (1)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white">Create room</button>
        </form>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-900">Room Types</div>
          {loading ? <div className="mt-2 text-sm text-slate-600">Yuklanmoqda...</div> : (
            <div className="mt-2 space-y-2">
              {roomTypes.map((rt) => (
                <div key={rt.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <div className="font-bold">{rt.name}</div>
                  <div className="text-xs text-slate-600">
                    {Number(rt.basePrice).toLocaleString()} so‘m • Adults {rt.capacityAdults} • Children {rt.capacityChildren} • Rooms {rt._count?.rooms ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-900">Physical Rooms</div>
          {loading ? <div className="mt-2 text-sm text-slate-600">Yuklanmoqda...</div> : (
            <div className="mt-2 space-y-2">
              {rooms.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <div className="font-bold">Room {r.roomNumber}</div>
                  <div className="text-xs text-slate-600">
                    {r.roomType.name} • Floor: {r.floor ?? "-"} • Status: {r.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

