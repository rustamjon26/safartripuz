'use client';
import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email("Email noto‘g‘ri"),
        password: z.string().min(1, "Parol majburiy"),
      }),
    [],
  );

  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const busy = form.formState.isSubmitting;

  async function onSubmit(values: Values) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as
        | { user: { role: string } }
        | { message?: string };

      if (!res.ok) {
        toast.error(("message" in data && data.message) || "Xatolik yuz berdi");
        return;
      }

      toast.success("Muvaffaqiyatli kirdingiz!");

      const role = "user" in data ? data.user.role : "user";
      const nextPath = searchParams.get("next");
      const redirects: Record<string, string> = {
        user: "/bookings",
        super_admin: "/admin",
        admin: "/admin",
        hotel_manager: "/hotel",
        taxi: "/taxi/home",
        guide: "/guide",
        restaurant_manager: "/restaurant",
      };

      if (nextPath && nextPath.startsWith("/")) {
        router.push(nextPath);
        return;
      }
      router.push(redirects[role] ?? "/trip-builder");
    } catch {
      toast.error("Server xatosi");
    }
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
      <div className="text-sm font-semibold text-slate-600">SafarTrip</div>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        Kirish
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Hisobingizga kiring va safaringizni davom ettiring.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => toast.message("Google login hozircha simulyatsiya qilindi")}
        className={[
          "mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition",
          busy ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50",
        ].join(" ")}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-700">
          G
        </span>
        Google bilan davom etish
      </button>

      <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        yoki
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              disabled={busy}
              className={[
                "w-full rounded-xl border bg-white px-3 py-3 pl-10 text-[15px] text-slate-900 shadow-sm outline-none transition",
                form.formState.errors.email
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
                  : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
                busy ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
              ].join(" ")}
              placeholder="Email"
              {...form.register("email", {
                onBlur: () => form.trigger("email"),
              })}
            />
          </div>
          {form.formState.errors.email?.message ? (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              disabled={busy}
              className={[
                "w-full rounded-xl border bg-white px-3 py-3 pl-10 pr-12 text-[15px] text-slate-900 shadow-sm outline-none transition",
                form.formState.errors.password
                  ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
                  : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
                busy ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
              ].join(" ")}
              placeholder="Parol"
              {...form.register("password", {
                onBlur: () => form.trigger("password"),
              })}
            />
            <button
              type="button"
              disabled={busy}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.password?.message ? (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end pt-1 text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
          >
            Parolni unutdingizmi?
          </Link>
        </div>

        <button
          type="submit"
          disabled={busy || !form.formState.isValid}
          className={[
            "mt-1 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition",
            busy || !form.formState.isValid
              ? "cursor-not-allowed opacity-70"
              : "hover:bg-slate-800",
          ].join(" ")}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kirilmoqda...
            </>
          ) : (
            "Kirish"
          )}
        </button>
      </form>

      <p className="pt-4 text-center text-sm text-slate-600">
        Hisobingiz yo‘qmi?{" "}
        <Link
          href="/register"
          className="font-bold text-slate-900 underline underline-offset-4 hover:text-slate-700"
        >
          Ro'yxatdan o'ting
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex w-full items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
