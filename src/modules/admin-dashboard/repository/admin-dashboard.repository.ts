import type { BookingStatus } from "@prisma/client";
import { db, type DbClient } from "@/src/shared/db/client";
import type { DashboardWindow } from "../domain/window";

/**
 * Read-only counters for the admin dashboard.
 *
 * This is a reporting repository: it reads across verticals that each have their
 * own module. That is deliberate and allowed — these are independent aggregates,
 * not cross-module joins, and the alternative (a count method on every module for
 * one screen) spreads a presentation concern across the whole codebase.
 */
export class AdminDashboardRepository {
  async loadCounters(window: DashboardWindow, client: DbClient = db) {
    const { dayStart, dayEnd, monthStart, monthEnd } = window;
    const today = { gte: dayStart, lte: dayEnd };
    const thisMonth = { gte: monthStart, lt: monthEnd };
    const occupyingStay = { in: ["CONFIRMED", "CHECKED_IN"] satisfies BookingStatus[] };

    const [
      totalUsers,
      pendingPartners,
      totalPayments,
      successPayments,
      totalTours,
      totalHotels,
      recentAudit,
      recentPayments,
      homeStayPendingListings,
      homeStayActiveListings,
      taxiOrdersToday,
      onlineDrivers,
      guideBookingsThisMonth,
      guideActiveListings,
      taxiDisputeCount,
      guideDisputeCount,
      guidePendingListingCount,
      unverifiedDriverCount,
      hotelBookingsToday,
      hotelCheckoutsToday,
      totalActiveRooms,
      occupiedRooms,
      hotelRevenueThisMonth,
      pendingHotelApprovals,
    ] = await Promise.all([
      client.user.count(),
      client.partner.count({ where: { status: "pending" } }),
      client.payment.count(),
      client.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      client.tourPackage.count(),
      client.hotel.count(),
      client.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { first_name: true, last_name: true, role: true } },
        },
      }),
      client.payment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { travelPlan: { select: { destination: true } } },
      }),
      client.homeStayListing.count({ where: { status: "PENDING" } }),
      client.homeStayListing.count({ where: { status: "ACTIVE" } }),
      client.taxiOrder.count({ where: { createdAt: today } }),
      client.driverProfile.count({ where: { isOnline: true } }),
      client.guideBooking.count({ where: { createdAt: thisMonth } }),
      client.guideListing.count({ where: { status: "ACTIVE" } }),
      client.taxiOrder.count({ where: { status: "DISPUTE" } }),
      client.guideBooking.count({ where: { status: "DISPUTE" } }),
      client.guideListing.count({ where: { status: "PENDING" } }),
      client.user.count({
        where: {
          role: "taxi_partner",
          OR: [{ driverProfile: null }, { driverProfile: { isVerified: false } }],
        },
      }),
      client.hotelBooking.count({
        where: { checkInDate: today, status: occupyingStay },
      }),
      client.hotelBooking.count({
        where: { checkOutDate: today, status: occupyingStay },
      }),
      client.physicalRoom.count({ where: { isActive: true } }),
      client.physicalRoom.count({ where: { isActive: true, status: "OCCUPIED" } }),
      client.hotelBooking.aggregate({
        where: { createdAt: thisMonth, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      client.hotel.count({ where: { status: "draft" } }),
    ]);

    return {
      totalUsers,
      pendingPartners,
      totalPayments,
      totalRevenue: Number(successPayments._sum.amount ?? 0),
      totalTours,
      totalHotels,
      recentAudit,
      recentPayments,
      homeStayPendingListings,
      homeStayActiveListings,
      taxiOrdersToday,
      onlineDrivers,
      guideBookingsThisMonth,
      guideActiveListings,
      taxiDisputeCount,
      guideDisputeCount,
      guidePendingListingCount,
      unverifiedDriverCount,
      hotelBookingsToday,
      hotelCheckoutsToday,
      totalActiveRooms,
      occupiedRooms,
      hotelRevenueThisMonth: Number(hotelRevenueThisMonth._sum.totalAmount ?? 0),
      pendingHotelApprovals,
    };
  }
}

export const adminDashboardRepository = new AdminDashboardRepository();
