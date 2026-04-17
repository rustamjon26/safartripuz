"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const schema = z.object({
  hotelName: z.string().trim().min(2, "Mehmonxona nomi majburiy"),
  city: z.string().trim().min(2, "Shahar majburiy"),
  address: z.string().trim().min(5, "Manzil majburiy"),
  contactEmail: z.string().trim().email("Email noto‘g‘ri"),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Telefon formati: +998XXXXXXXXX"),
  note: z.string().trim().max(500, "Maks 500 belgi").optional(),
});

type Values = z.infer<typeof schema>;

export default function HotelPartnerApplyPage() {
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

  const busy = form.formState.isSubmitting;
  const canSubmit = form.formState.isValid && !busy;

  const fields = useMemo(
    () => [
      { name: "hotelName" as const, label: "Mehmonxona nomi", placeholder: "Safar Hotel" },
      { name: "city" as const, label: "Shahar", placeholder: "Jizzax" },
      { name: "address" as const, label: "Manzil", placeholder: "Ko‘cha, uy, mo‘ljal" },
      { name: "contactEmail" as const, label: "Kontakt email", placeholder: "hotel@mail.com", type: "email" },
      { name: "contactPhone" as const, label: "Kontakt telefon", placeholder: "+998901234567" },
    ],
    [],
  );

  async function onSubmit(values: Values) {
    try {
      const res = await fetch("/api/partners/apply/hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
      toast.success("Ariza yuborildi. Admin tekshiradi.");
      form.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div className="container" style={{ paddingTop: 96, paddingBottom: 64 }}>
      <div className="mx-auto max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Hotel hamkor bo‘lish</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ariza topshiring. Tasdiqlashdan so‘ng admin sizga{" "}
          <span className="font-bold">hotel_manager</span> rolini biriktiradi.
        </p>

        <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          {fields.map((f) => (
            <div key={f.name}>
              <label className="text-sm font-bold text-slate-700">{f.label}</label>
              <input
                type={(f as any).type ?? "text"}
                disabled={busy}
                placeholder={f.placeholder}
                className={[
                  "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition",
                  form.formState.errors[f.name]
                    ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
                    : "border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
                  busy ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
                ].join(" ")}
                {...form.register(f.name, { onBlur: () => form.trigger(f.name) })}
              />
              {form.formState.errors[f.name]?.message ? (
                <p className="mt-1 text-sm text-red-600">
                  {String(form.formState.errors[f.name]?.message)}
                </p>
              ) : null}
            </div>
          ))}

          <div>
            <label className="text-sm font-bold text-slate-700">Izoh (ixtiyoriy)</label>
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
            Ariza yuborish
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-600">
          Admin sahifasi{" "}
          <Link className="font-bold underline underline-offset-4" href="/admin/approvals">
            approvals
          </Link>{" "}
          bo‘limida ko‘rinadi.
        </div>
      </div>
    </div>
  );
}

