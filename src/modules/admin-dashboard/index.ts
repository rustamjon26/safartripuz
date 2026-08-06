/**
 * Cross-vertical read model for the admin dashboard. Reporting only: it never
 * writes, and every other module stays the owner of its own data.
 */
export {
  adminDashboardService,
  AdminDashboardService,
} from "./service/admin-dashboard.service";
export type { AdminDashboardStats } from "./service/admin-dashboard.service";
export { dashboardWindow, occupancyRate } from "./domain/window";
export type { DashboardWindow } from "./domain/window";
