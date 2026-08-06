"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";

type GateState = "checking" | "ready" | "offline";

/**
 * Blocks render until the session check resolves — the pattern app/staff/layout
 * already used. Without it a protected page mounts, fetches, and only then
 * redirects, so its content is briefly visible to a signed-out visitor.
 *
 * Middleware is the real gate (it redirects at the edge, before any HTML ships).
 * This covers client-side navigations and the case where the access token
 * expired while the tab sat open.
 */
export function AuthGate({
  children,
  allow,
  fallbackPath = "/",
}: {
  children: ReactNode;
  /** Omit to accept any signed-in role. */
  allow?: readonly string[];
  /** Where a signed-in user with the wrong role is sent. */
  fallbackPath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GateState>("checking");

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace(loginWithNext(pathname || "/"));
        return;
      }
      if (!res.ok) {
        setState("offline");
        return;
      }
      const data = (await res.json()) as { user?: { role?: string } };
      const role = data.user?.role;
      if (!role) {
        router.replace(loginWithNext(pathname || "/"));
        return;
      }
      if (allow && !allow.includes(role)) {
        router.replace(fallbackPath);
        return;
      }
      setState("ready");
    } catch {
      // A dropped connection is not a signed-out session; offer a retry rather
      // than bouncing the user to /login and losing their place.
      setState("offline");
    }
  }, [router, pathname, allow, fallbackPath]);

  useEffect(() => {
    // The gate's whole job is to fetch on mount and record the answer, so the
    // React Compiler rule cannot be satisfied without a different data-loading
    // shape. Same trade-off the panel layouts already make.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  function retry() {
    setState("checking");
    void check();
  }

  if (state === "offline") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[15px] font-bold text-slate-800">Ulanishda muammo</p>
        <p className="text-[13px] font-semibold text-slate-500">
          Internetga ulanishni tekshirib, qayta urinib ko&apos;ring.
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (state === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthGate;
