"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

type DriverProfile = {
  id: string;
  licenseNumber: string;
  licenseExpiry: string;
  rating: number;
  totalTrips: number;
  isOnline: boolean;
};

export default function TaxiProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/driver/profile");
      const json = await res.json();
      if (res.ok && json.success && json.data?.profile) {
        setProfile(json.data.profile);
        setLicenseNumber(json.data.profile.licenseNumber || "");
        setLicenseExpiry(String(json.data.profile.licenseExpiry || "").slice(0, 10));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = profile ? "PUT" : "POST";
      const res = await fetch("/api/taxi/driver/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseNumber, licenseExpiry }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || "Xatolik");
      toast.success("Profil saqlandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  const rating = profile?.rating ?? 5;
  const stars = Array.from({ length: 5 }).map((_, i) => i < Math.round(rating));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
          Sozlamalar / Profil
        </h1>
        <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
          Haydovchi ma&apos;lumotlari va litsenziya
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-amber-500">
                {stars.map((filled, idx) => (
                  <Star key={idx} size={16} fill={filled ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="font-bold text-[#111c2d]">{rating.toFixed(1)}</p>
              <span
                className={
                  profile?.isOnline ? "tp-badge tp-badge-ok ml-auto" : "tp-badge tp-badge-muted ml-auto"
                }
              >
                {profile?.isOnline ? "Onlayn" : "Offline"}
              </span>
            </div>
            <p className="text-sm text-[#64748B] mt-2">
              Jami safarlar: <b className="text-[#0d2137]">{profile?.totalTrips ?? 0}</b>
            </p>
          </div>

          <form
            onSubmit={(e) => void save(e)}
            className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Litsenziya raqami
              </label>
              <input
                className="tp-input"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Litsenziya muddati
              </label>
              <input
                className="tp-input"
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                required
              />
            </div>
            <button disabled={saving} className="tp-btn tp-btn-primary">
              {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
