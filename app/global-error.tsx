"use client";

import { useEffect } from "react";

/**
 * Last resort: the root layout itself failed, so this file replaces it and has
 * to supply its own <html>/<body>. No shared component, no global CSS and no
 * metadata export are available here — everything is inline on purpose.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error("[global-render-error]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        <title>Xatolik | SafarTrip</title>
        <main style={{ maxWidth: 440, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "16px 0 8px" }}>
            Sahifani ochib bo&apos;lmadi
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#64748b", margin: 0 }}>
            Kutilmagan xatolik yuz berdi. Qayta urinib ko&apos;ring — muammo
            takrorlansa, qo&apos;llab-quvvatlash xizmatiga murojaat qiling.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 12,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#cbd5e1",
                fontWeight: 700,
              }}
            >
              Xato kodi: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {retry ? (
              <button
                type="button"
                onClick={() => retry()}
                style={{
                  border: 0,
                  borderRadius: 12,
                  padding: "10px 20px",
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Qayta urinish
              </button>
            ) : null}
            <a
              href="/"
              style={{
                borderRadius: 12,
                padding: "10px 20px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Bosh sahifa
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
