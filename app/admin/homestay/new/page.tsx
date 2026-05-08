"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewHomestayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    city: "",
    region: "",
    address: "",
    description: "",
    pricePerNight: "",
    maxGuests: 2,
    rooms: 1,
    beds: 1,
    bathrooms: 1,
  });

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homestays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/admin/homestay");
      } else {
        const data = await res.json();
        alert(data.message || "Xato yuz berdi");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Yangi Uy mehmonxona qo'shish</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nomi *</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Uy Mehmonxona nomi"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shahar *</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          >
            <option value="">Shaharni tanlang</option>
            <option value="Toshkent">Toshkent</option>
            <option value="Samarqand">Samarqand</option>
            <option value="Buxoro">Buxoro</option>
            <option value="Xiva">Xiva</option>
            <option value="Jizzax">Jizzax</option>
            <option value="Namangan">Namangan</option>
            <option value="Andijon">Andijon</option>
            <option value="Farg'ona">Farg'ona</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Region *</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="Viloyat yoki hudud"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Manzil *</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="To'liq manzil"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Narx (1 kecha)</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.pricePerNight}
            onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
            placeholder="150000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mehmonlar soni</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.maxGuests}
            onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) || 0 })}
            placeholder="2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Xonalar soni</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.rooms}
            onChange={(e) => setForm({ ...form, rooms: Number(e.target.value) || 0 })}
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Yotoqlar soni</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.beds}
            onChange={(e) => setForm({ ...form, beds: Number(e.target.value) || 0 })}
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Hammomlar soni</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2"
            value={form.bathrooms}
            onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) || 0 })}
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tavsif</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Uy Mehmonxona haqida qisqacha"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading || !form.title || !form.city || !form.region || !form.address}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </button>
          <button
            onClick={() => router.push("/admin/homestay")}
            className="border px-6 py-2 rounded-lg hover:bg-gray-50"
          >
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}
