import Link from "next/link";

type Action = { href: string; label: string; primary?: boolean };

export function AdminTaxiPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: Action[];
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm font-bold text-slate-400 mt-1">{subtitle}</p> : null}
      </div>
      {actions && actions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={a.primary ? "adm-btn adm-btn-primary" : "adm-btn"}
            >
              {a.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
