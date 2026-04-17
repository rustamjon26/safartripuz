import Link from "next/link";

export function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100" />
      <h3 className="text-xl font-black text-slate-700">{title}</h3>
      <p className="text-slate-500 mt-2">{message}</p>
      <Link href={ctaHref} className="inline-block mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black">
        {ctaLabel}
      </Link>
    </div>
  );
}
