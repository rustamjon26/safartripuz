"use client";

import Link from "next/link";
import { Award, School, TrendingUp } from "lucide-react";

export function TrainingTabs({
  active,
}: {
  active: "catalog" | "progress" | "badges";
}) {
  const items = [
    { id: "catalog" as const, href: "/staff/training", label: "Catalog", icon: School },
    {
      id: "progress" as const,
      href: "/staff/training/progress",
      label: "Progress",
      icon: TrendingUp,
    },
    {
      id: "badges" as const,
      href: "/staff/training/progress#badges",
      label: "Badges",
      icon: Award,
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => {
        const isOn = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={
              isOn
                ? "st-chip st-chip-active shrink-0 inline-flex items-center gap-1.5"
                : "st-chip st-chip-idle shrink-0 inline-flex items-center gap-1.5"
            }
          >
            <item.icon size={12} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
