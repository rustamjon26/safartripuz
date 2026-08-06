export type DashboardWindow = {
  dayStart: Date;
  dayEnd: Date;
  monthStart: Date;
  monthEnd: Date;
};

/**
 * Today and this-month boundaries in the server's local timezone.
 *
 * Local, not UTC, on purpose: the admin dashboard answers "how many check-ins
 * today" for a UZ operator, and production runs in Asia/Tashkent. Inventory
 * date-only values use UTC (see inventory/domain/nights) — these two are not
 * interchangeable.
 */
export function dashboardWindow(now: Date = new Date()): DashboardWindow {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  return { dayStart, dayEnd, monthStart, monthEnd };
}

/** Occupancy as a percentage with one decimal; 0 when there are no rooms. */
export function occupancyRate(occupied: number, active: number): number {
  if (active <= 0) return 0;
  return Math.round((occupied / active) * 1000) / 10;
}
