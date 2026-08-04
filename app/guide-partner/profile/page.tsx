"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/Skeleton";

const LANGS = ["uz", "ru", "en", "tr", "de", "fr", "ar"] as const;

type ProfilePayload = {
  partner: {
    displayName: string | null;
    bio: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    user: {
      first_name: string;
      last_name: string | null;
      email: string;
      phone: string | null;
    };
  };
  languages: string[];
  stats: { avgRating: number | null; totalBookings: number };
};

export default function GuidePartnerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [stats, setStats] = useState<ProfilePayload["stats"] | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/guide/partner/profile", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: ProfilePayload;
        error?: string;
      };
      if (!res.ok || json.success === false || !json.data) {
        throw new Error(json.error || "Profil yuklanmadi");
      }
      const { partner, languages: langs, stats: s } = json.data;
      setDisplayName(
        partner.displayName ||
          `${partner.user.first_name} ${partner.user.last_name ?? ""}`.trim(),
      );
      setBio(partner.bio ?? "");
      setPhone(partner.contactPhone || partner.user.phone || "");
      setEmail(partner.contactEmail || partner.user.email || "");
      setLanguages(langs ?? []);
      setStats(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleLang(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/guide/partner/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          phone: phone.trim() || undefined,
          languages,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        throw new Error(json.error || "Saqlab bo'lmadi");
      }
      toast.success("Profil saqlandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
          Profil / Sozlamalar
        </h1>
        <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
          Gid ma&apos;lumotlari — portal ichida qoladi
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Bandlovlar
              </p>
              <p className="text-xl font-display font-bold text-[#0d2137] mt-1">
                {stats?.totalBookings ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Reyting
              </p>
              <p className="text-xl font-display font-bold text-[#0d2137] mt-1">
                {stats?.avgRating != null ? stats.avgRating.toFixed(1) : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Email
              </p>
              <p className="text-sm font-semibold text-[#0d2137] mt-1 truncate">
                {email}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => void save(e)}
            className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Ko&apos;rsatiladigan ism
              </label>
              <input className="gp-input" value={displayName} readOnly disabled />
            </div>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Telefon
              </label>
              <input
                className="gp-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998…"
              />
            </div>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Bio
              </label>
              <textarea
                className="gp-input min-h-[110px]"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="O'zingiz haqingizda qisqacha…"
              />
            </div>
            <div>
              <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Tillar
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((lang) => {
                  const on = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLang(lang)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                        on
                          ? "bg-[#006781]/10 text-[#006781] border-[#006781]/30"
                          : "bg-white text-[#64748B] border-[#d8e3fb]"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="submit" disabled={saving} className="gp-btn gp-btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Saqlash
            </button>
          </form>
        </>
      )}
    </div>
  );
}
