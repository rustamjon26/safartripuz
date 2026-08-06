import { adminDashboardRepository } from "../repository/admin-dashboard.repository";
import { dashboardWindow, occupancyRate } from "../domain/window";

export class AdminDashboardService {
  async getStats(now: Date = new Date()) {
    const counters = await adminDashboardRepository.loadCounters(
      dashboardWindow(now),
    );

    return {
      ...counters,
      hotelOccupancyRate: occupancyRate(
        counters.occupiedRooms,
        counters.totalActiveRooms,
      ),
    };
  }
}

export const adminDashboardService = new AdminDashboardService();

export type AdminDashboardStats = Awaited<
  ReturnType<AdminDashboardService["getStats"]>
>;
