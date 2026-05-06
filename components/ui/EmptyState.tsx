import Link from "next/link";

type EmptyStateProps = {
  title?: string;
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** "card" — to'liq blok; "embedded" — jadval ichida ixcham */
  variant?: "card" | "embedded";
};

export function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
  variant = "card",
}: EmptyStateProps) {
  const body = (
    <>
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100" />
      {title ? <h3 className="text-xl font-black text-slate-700">{title}</h3> : null}
      <p className={`text-slate-500 ${title ? "mt-2" : "mt-0"}`}>{message}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="inline-block mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </>
  );

  if (variant === "embedded") {
    return <div className="py-12 px-4 text-center">{body}</div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">{body}</div>
  );
}
