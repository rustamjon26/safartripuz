"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginWithNext } from "@/lib/authLinks";
import { normalizeUzPhone } from "@/src/shared/phone";

const schema = z.object({
  hotelName: z.string().trim().min(2, "Mehmonxona nomi majburiy"),
  city: z.string().trim().min(2, "Shahar majburiy"),
  address: z.string().trim().min(5, "Manzil majburiy"),
  contactEmail: z.string().trim().email("Email noto‘g‘ri"),
  contactPhone: z
    .string()
    .trim()
    .refine((v) => Boolean(normalizeUzPhone(v)), {
      message: "Telefon formati: +998XXXXXXXXX",
    }),
  note: z.string().trim().max(500, "Maks 500 belgi").optional(),
});

type Values = z.infer<typeof schema>;

type AuthUser = {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  first_name: string;
  last_name: string;
};

async function ensureSession(): Promise<AuthUser | null> {
  const me = await fetch("/api/auth/me", { credentials: "include" });
  if (me.ok) {
    const data = (await me.json()) as { user?: AuthUser };
    return data.user ?? null;
  }
  if (me.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!refreshed.ok) return null;
    const again = await fetch("/api/auth/me", { credentials: "include" });
    if (!again.ok) return null;
    const data = (await again.json()) as { user?: AuthUser };
    return data.user ?? null;
  }
  return null;
}

export default function HotelPartnerApplyPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      hotelName: "",
      city: "",
      address: "",
      contactEmail: "",
      contactPhone: "+998",
      note: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const u = await ensureSession();
      if (cancelled) return;
      setUser(u);
      if (u) {
        form.reset({
          hotelName: "",
          city: "",
          address: "",
          contactEmail: u.email || "",
          contactPhone: normalizeUzPhone(u.phone ?? "") ?? "+998",
          note: "",
        });
      }
      setAuthLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const busy = form.formState.isSubmitting;
  const canSubmit = form.formState.isValid && !busy && Boolean(user);

  const fields = useMemo(
    () => [
      {
        name: "hotelName" as const,
        label: "Mehmonxona nomi",
        placeholder: "Safar Hotel",
      },
      { name: "city" as const, label: "Shahar", placeholder: "Jizzax" },
      {
        name: "address" as const,
        label: "Manzil",
        placeholder: "Ko‘cha, uy, mo‘ljal",
      },
      {
        name: "contactEmail" as const,
        label: "Kontakt email",
        placeholder: "hotel@mail.com",
        type: "email",
      },
      {
        name: "contactPhone" as const,
        label: "Kontakt telefon",
        placeholder: "+998901234567",
      },
    ],
    [],
  );

  async function onSubmit(values: Values) {
    const phone = normalizeUzPhone(values.contactPhone);
    if (!phone) {
      toast.error("Telefon formati noto‘g‘ri");
      return;
    }

    try {
      let session = user ?? (await ensureSession());
      if (!session) {
        toast.error("Ariza yuborish uchun avval tizimga kiring");
        window.location.href = loginWithNext("/partner/hotel");
        return;
      }
      if (session.role !== "user") {
        toast.error(
          "Faqat oddiy foydalanuvchi ariza topshira oladi. Hozirgi rolingiz: " +
            session.role,
        );
        return;
      }

      const res = await fetch("/api/partners/apply/hotel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          contactPhone: phone,
          note: values.note?.trim() ? values.note.trim() : undefined,
        }),
      });

      if (res.status === 401) {
        session = await ensureSession();
        if (!session) {
          toast.error("Sessiya tugagan — qayta kiring");
          window.location.href = loginWithNext("/partner/hotel");
          return;
        }
        const retry = await fetch("/api/partners/apply/hotel", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            contactPhone: phone,
            note: values.note?.trim() ? values.note.trim() : undefined,
          }),
        });
        const retryData = (await retry.json()) as { message?: string };
        if (!retry.ok) {
          throw new Error(retryData.message || "Ariza yuborilmadi");
        }
        toast.success("Ariza yuborildi. Admin tekshiradi.");
        form.reset({
          hotelName: "",
          city: "",
          address: "",
          contactEmail: session.email || "",
          contactPhone: phone,
          note: "",
        });
        return;
      }

      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
      toast.success("Ariza yuborildi. Admin tekshiradi.");
      form.reset({
        hotelName: "",
        city: "",
        address: "",
        contactEmail: session.email || "",
        contactPhone: phone,
        note: "",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Xatolik yuz berdi";
      toast.error(
        msg === "Unauthorized" ? "Avval tizimga kiring" : msg,
      );
    }
  }

  if (authLoading) {
    return (
      <div className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div className="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
          Yuklanmoqda…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div className="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">
            Hotel hamkor bo‘lish
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Ariza yuborish uchun avval SafarTrip hisobingizga kiring. Keyin shu
            sahifaga qaytasiz.
          </p>
          <Link
            href={loginWithNext("/partner/hotel")}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            Kirish / Ro‘yxatdan o‘tish
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "user") {
    return (
      <div className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div className="mx-auto max-w-[520px] rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">
            Hotel hamkor bo‘lish
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            Bu ariza faqat oddiy foydalanuvchi (<code>user</code>) uchun.
            Hozirgi rolingiz: <strong>{user.role}</strong>.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            Dashboardga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div className="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Hotel hamkor bo‘lish
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Ariza topshiring. Tasdiqlashdan so‘ng admin sizga{" "}
          <span className="font-bold">hotel_manager</span> rolini biriktiradi.
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Hisob: {user.email}
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {fields.map((f) => (
            <div key={f.name}>
              <label className="text-sm font-bold text-slate-700">
                {f.label}
              </label>
              <input
                type={f.type ?? "text"}
                disabled={busy}
                placeholder={f.placeholder}
                className={[
                  "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition",
                  form.formState.errors[f.name]
                    ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
                    : "border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
                  busy ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
                ].join(" ")}
                {...form.register(f.name, {
                  onBlur: () => form.trigger(f.name),
                })}
              />
              {form.formState.errors[f.name]?.message ? (
                <p className="mt-1 text-sm text-red-600">
                  {String(form.formState.errors[f.name]?.message)}
                </p>
              ) : null}
            </div>
          ))}

          <div>
            <label className="text-sm font-bold text-slate-700">
              Izoh (ixtiyoriy)
            </label>
            <textarea
              disabled={busy}
              rows={3}
              placeholder="Masalan: nechta xona, yulduzlar, qo‘shimcha xizmatlar..."
              className={[
                "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition",
                form.formState.errors.note
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
                  : "border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
                busy ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
              ].join(" ")}
              {...form.register("note")}
            />
            {form.formState.errors.note?.message ? (
              <p className="mt-1 text-sm text-red-600">
                {String(form.formState.errors.note.message)}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "mt-2 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white transition",
              canSubmit ? "hover:bg-slate-800" : "cursor-not-allowed opacity-70",
            ].join(" ")}
          >
            {busy ? "Yuborilmoqda…" : "Ariza yuborish"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-600">
          Admin tasdiqlashi kerak —{" "}
          <Link
            className="font-bold underline underline-offset-4"
            href="/admin/partners"
          >
            partners
          </Link>{" "}
          bo‘limida ko‘rinadi.
        </div>
      </div>
    </div>
  );
}
