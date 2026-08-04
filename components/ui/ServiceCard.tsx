"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, Check, Star } from "lucide-react";
import { formatUzInteger } from "@/lib/displayHelpers";

export type ServiceCardAmenity = {
  label: string;
  /** Prefer Lucide icon; emoji kept for backward compat. */
  Icon?: LucideIcon;
  emoji?: string;
};

export type ServiceCardProps = {
  title: string;
  image?: string | null;
  placeholderIcon?: React.ElementType;
  placeholderGradient?: string;
  city?: string;
  subtitle?: string;
  price?: number | null;
  priceUnit?: string;
  /** Average rating (e.g. 4.8) shown with star icon */
  rating?: number | null;
  ratingCount?: number;
  /** Hotel star class 1–5 */
  starCount?: number;
  amenities?: ServiceCardAmenity[];
  isSelected?: boolean;
  onClick?: () => void;
  href?: string;
  actionLabel?: string;
  selectedLabel?: string;
  className?: string;
};

function StarBadge({ count }: { count: number }) {
  const filled = Math.min(5, Math.max(1, Math.round(count)));
  return (
    <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={10}
          className={i < filled ? "text-orange-500 fill-orange-500" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </div>
  );
}

function CardInner({
  title,
  image,
  placeholderIcon: PlaceholderIcon = Building2,
  placeholderGradient = "from-orange-100 via-amber-50 to-slate-100",
  city,
  subtitle,
  price,
  priceUnit = "so'm/kecha",
  rating,
  ratingCount,
  starCount,
  amenities,
  isSelected = false,
  actionLabel = "Tanlash →",
  selectedLabel = "Tanlandi ✓",
}: Omit<ServiceCardProps, "onClick" | "href" | "className">) {
  return (
    <>
      <div className="relative h-[200px] w-full overflow-hidden bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${placeholderGradient}`}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <PlaceholderIcon size={32} className="text-slate-400" />
            </div>
            {city && <span className="text-slate-500 text-xs font-bold mt-2">{city}</span>}
          </div>
        )}

        {city && (
          <span className="absolute top-3 left-3 bg-white text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
            {city}
          </span>
        )}

        {isSelected && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
            <Check size={16} strokeWidth={3} className="text-white" />
          </div>
        )}

        {!isSelected && starCount != null && starCount > 0 && (
          <div className="absolute top-3 right-3">
            <StarBadge count={starCount} />
          </div>
        )}

        {!isSelected && starCount == null && rating != null && rating > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
            <Star size={11} className="text-orange-500 fill-orange-500" />
            <span className="text-slate-900 text-xs font-bold">{rating.toFixed(1)}</span>
            {ratingCount != null && ratingCount > 0 && (
              <span className="text-slate-400 text-xs">({ratingCount})</span>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mt-1">{subtitle}</p>
        )}

        {amenities && amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {amenities.map((a) => {
              const Icon = a.Icon;
              return (
                <span
                  key={a.label}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full"
                >
                  {Icon ? (
                    <Icon size={11} className="text-slate-500 shrink-0" strokeWidth={2.25} />
                  ) : a.emoji ? (
                    <span>{a.emoji}</span>
                  ) : null}
                  {a.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-200 mt-4 pt-4 flex items-end justify-between gap-3">
          {price != null && price > 0 ? (
            <div>
              <p className="text-2xl font-black text-orange-500 leading-none">
                {formatUzInteger(price)}
              </p>
              <p className="text-xs text-slate-400 font-bold mt-0.5">{priceUnit}</p>
            </div>
          ) : (
            <div />
          )}
          <span
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              isSelected
                ? "bg-emerald-500 text-white"
                : "bg-slate-900 text-white group-hover:bg-orange-500"
            }`}
          >
            {isSelected ? selectedLabel : actionLabel}
          </span>
        </div>
      </div>
    </>
  );
}

export default function ServiceCard({
  className = "",
  href,
  onClick,
  isSelected = false,
  ...props
}: ServiceCardProps) {
  const shellClass = `group bg-white rounded-2xl shadow-sm border overflow-hidden text-left transition-all duration-300 ${
    isSelected
      ? "border-2 border-orange-500 shadow-md ring-2 ring-orange-500/10"
      : "border-slate-200 hover:shadow-md hover:border-orange-300"
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${shellClass} block hover:-translate-y-0.5`}>
        <CardInner {...props} isSelected={isSelected} actionLabel={props.actionLabel ?? "Ko'rish →"} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${shellClass} w-full`}>
      <CardInner {...props} isSelected={isSelected} />
    </button>
  );
}

export function ServiceCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse ${className}`}
    >
      <div className="h-[200px] bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="border-t border-slate-100 pt-4 flex justify-between">
          <div className="space-y-2">
            <div className="h-7 bg-slate-100 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
          <div className="h-9 bg-slate-100 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}
