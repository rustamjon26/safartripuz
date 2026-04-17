"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";

type AuthView = "login" | "register";
type AuthVariant = "modal" | "card";

const phoneRegex = /^\+998\d{9}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Ism majburiy"),
  lastName: z.string().trim().min(1, "Familiya majburiy"),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Telefon formati: +998XXXXXXXXX"),
  email: z.string().trim().email("Email noto‘g‘ri"),
  password: z
    .string()
    .min(8, "Parol kamida 8 ta belgidan iborat bo‘lsin")
    .regex(passwordRegex, "Parolda kamida 1 ta harf va 1 ta raqam bo‘lsin"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Email noto‘g‘ri"),
  password: z.string().min(1, "Parol majburiy"),
});

type RegisterValues = z.infer<typeof registerSchema>;
type LoginValues = z.infer<typeof loginSchema>;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function GoogleIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={props.className}
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.854 32.66 29.22 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.878 19.51C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.199 0-9.821-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.09 12.09 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function Field({
  label,
  type,
  inputMode,
  disabled,
  error,
  leftIcon,
  right,
  ...inputProps
}: {
  label: string;
  type: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  error?: string;
  leftIcon?: React.ReactNode;
  right?: React.ReactNode;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "disabled" | "inputMode"
>) {
  const id = useId();
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      <div className="relative">
        {leftIcon ? (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        ) : null}

        <input
          id={id}
          type={type}
          inputMode={inputMode}
          disabled={disabled}
          aria-invalid={hasError}
          className={[
            "peer w-full rounded-xl border bg-white px-3 pb-2 pt-5 text-[15px] text-slate-900 shadow-sm outline-none transition",
            leftIcon ? "pl-10" : "",
            right ? "pr-12" : "",
            disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "",
            hasError
              ? "border-red-500 focus:ring-4 focus:ring-red-500/15"
              : "border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10",
          ].join(" ")}
          placeholder=" "
          {...inputProps}
        />

        <label
          htmlFor={id}
          className={[
            "pointer-events-none absolute top-2 text-xs font-semibold text-slate-500 transition-all",
            leftIcon ? "left-10" : "left-3",
            "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-medium peer-placeholder-shown:text-slate-400",
            "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-slate-700",
          ].join(" ")}
        >
          {label}
        </label>

        {right ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {right}
          </div>
        ) : null}
      </div>

      {hasError ? (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function SafarTripAuth({
  variant = "card",
  open,
  onOpenChange,
  defaultView = "login",
  title = "SafarTrip",
}: {
  variant?: AuthVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultView?: AuthView;
  title?: string;
}) {
  const [view, setView] = useState<AuthView>(defaultView);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const isModal = variant === "modal";
  const isOpen = isModal ? Boolean(open) : true;

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "+998",
      email: "",
      password: "",
    },
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const busy = useMemo(() => {
    return registerForm.formState.isSubmitting || loginForm.formState.isSubmitting;
  }, [registerForm.formState.isSubmitting, loginForm.formState.isSubmitting]);

  async function onRegisterSubmit(values: RegisterValues) {
    await sleep(1500);
    toast.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
    registerForm.reset(values);
    onOpenChange?.(false);
    window.location.href = "/bookings";
  }

  async function onLoginSubmit(values: LoginValues) {
    await sleep(1500);
    toast.success("Muvaffaqiyatli kirdingiz!");
    loginForm.reset(values);
    onOpenChange?.(false);
    window.location.href = "/bookings";
  }

  function Container({ children }: { children: React.ReactNode }) {
    return (
      <div className="w-full max-w-[420px] overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6 sm:[max-height:min(740px,calc(100dvh-220px))] [max-height:min(720px,calc(100dvh-200px))]">
        {children}
      </div>
    );
  }

  function Shell({ children }: { children: React.ReactNode }) {
    if (!isModal) return <Container>{children}</Container>;
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          onClick={() => onOpenChange?.(false)}
        />

        <div className="relative w-full max-w-[420px]">
          <Container>{children}</Container>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-600">{title}</div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {view === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === "login"
              ? "Hisobingizga kiring va safaringizni davom ettiring."
              : "SafarTrip bilan eng yaxshi sarguzashtingizni boshlang."}
          </p>
        </div>

        {isModal ? (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setView("login")}
          className={[
            "rounded-lg py-2 text-sm font-bold transition",
            view === "login"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          ].join(" ")}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setView("register")}
          className={[
            "rounded-lg py-2 text-sm font-bold transition",
            view === "register"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          ].join(" ")}
        >
          Register
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => toast.message("Google login hozircha simulyatsiya qilindi")}
        className={[
          "mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition",
          busy ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50",
        ].join(" ")}
      >
        <GoogleIcon className="h-5 w-5" />
        Google bilan davom etish
      </button>

      <div className="my-4 flex items-center gap-3 text-xs font-semibold text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        yoki
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {view === "register" ? (
        <form
          className="space-y-3"
          onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label="Ism"
              type="text"
              disabled={busy}
              leftIcon={<User size={18} />}
              error={registerForm.formState.errors.firstName?.message}
              {...registerForm.register("firstName", {
                onBlur: () => registerForm.trigger("firstName"),
              })}
            />
            <Field
              label="Familiya"
              type="text"
              disabled={busy}
              leftIcon={<User size={18} />}
              error={registerForm.formState.errors.lastName?.message}
              {...registerForm.register("lastName", {
                onBlur: () => registerForm.trigger("lastName"),
              })}
            />
          </div>

          <Field
            label="Telefon (+998XXXXXXXXX)"
            type="tel"
            inputMode="tel"
            disabled={busy}
            leftIcon={<Phone size={18} />}
            error={registerForm.formState.errors.phone?.message}
            {...registerForm.register("phone", {
              onBlur: () => registerForm.trigger("phone"),
            })}
          />

          <Field
            label="Email"
            type="email"
            inputMode="email"
            disabled={busy}
            leftIcon={<Mail size={18} />}
            error={registerForm.formState.errors.email?.message}
            {...registerForm.register("email", {
              onBlur: () => registerForm.trigger("email"),
            })}
          />

          <Field
            label="Parol"
            type={showRegisterPassword ? "text" : "password"}
            disabled={busy}
            leftIcon={<Lock size={18} />}
            error={registerForm.formState.errors.password?.message}
            right={
              <button
                type="button"
                disabled={busy}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setShowRegisterPassword((v) => !v)}
                aria-label={showRegisterPassword ? "Hide password" : "Show password"}
              >
                {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            {...registerForm.register("password", {
              onBlur: () => registerForm.trigger("password"),
            })}
          />

          <button
            type="submit"
            disabled={busy || !registerForm.formState.isValid}
            className={[
              "mt-1 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition",
              busy || !registerForm.formState.isValid
                ? "cursor-not-allowed opacity-70"
                : "hover:bg-slate-800",
            ].join(" ")}
          >
            {registerForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yuborilmoqda...
              </>
            ) : (
              "Ro'yxatdan o'tish"
            )}
          </button>

          <p className="pt-1 text-center text-sm text-slate-600">
            Avval ro'yxatdan o'tganmisiz?{" "}
            <button
              type="button"
              className="font-bold text-slate-900 underline underline-offset-4 hover:text-slate-700"
              onClick={() => setView("login")}
            >
              Tizimga kiring
            </button>
          </p>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
        >
          <Field
            label="Email"
            type="email"
            inputMode="email"
            disabled={busy}
            leftIcon={<Mail size={18} />}
            error={loginForm.formState.errors.email?.message}
            {...loginForm.register("email", {
              onBlur: () => loginForm.trigger("email"),
            })}
          />

          <Field
            label="Parol"
            type={showLoginPassword ? "text" : "password"}
            disabled={busy}
            leftIcon={<Lock size={18} />}
            error={loginForm.formState.errors.password?.message}
            right={
              <button
                type="button"
                disabled={busy}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setShowLoginPassword((v) => !v)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
              >
                {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            {...loginForm.register("password", {
              onBlur: () => loginForm.trigger("password"),
            })}
          />

          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-slate-500"> </span>
            <Link
              href="/forgot-password"
              className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-900"
            >
              Parolni unutdingizmi?
            </Link>
          </div>

          <button
            type="submit"
            disabled={busy || !loginForm.formState.isValid}
            className={[
              "mt-1 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition",
              busy || !loginForm.formState.isValid
                ? "cursor-not-allowed opacity-70"
                : "hover:bg-slate-800",
            ].join(" ")}
          >
            {loginForm.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kirilmoqda...
              </>
            ) : (
              "Kirish"
            )}
          </button>

          <p className="pt-1 text-center text-sm text-slate-600">
            Hisobingiz yo‘qmi?{" "}
            <button
              type="button"
              className="font-bold text-slate-900 underline underline-offset-4 hover:text-slate-700"
              onClick={() => setView("register")}
            >
              Ro'yxatdan o'ting
            </button>
          </p>
        </form>
      )}
    </Shell>
  );
}

