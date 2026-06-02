import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminUserAuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

export type AdminUserPartner = {
  id: string;
  status: string;
  type: string;
};

export type AdminUserDetail = {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: Role;
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
  };
  partner: AdminUserPartner | null;
  roleContext:
    | {
        type: "hotel_manager";
        hotel: {
          id: string;
          name: string;
          status: string;
          roomCount: number;
          activeBookingCount: number;
        };
      }
    | {
        type: "taxi_partner" | "taxi";
        driverProfile: {
          id: string;
          licenseNumber: string;
          isVerified: boolean;
          isOnline: boolean;
          rating: number;
          totalTrips: number;
        } | null;
        vehicle: {
          make: string;
          model: string;
          plateNumber: string;
        } | null;
      }
    | {
        type: "guide";
        partnerId: string | null;
      }
    | {
        type: "home_stay_partner";
        partnerId: string | null;
        listings: Array<{ id: string; title: string; status: string }>;
      }
    | {
        type: "user";
        guestStats: {
          visitCount: number;
          totalSpent: number;
        } | null;
      }
    | { type: "other" };
  auditLogs: AdminUserAuditRow[];
};

function buildRoleContext(
  user: {
    id: string;
    role: Role;
    driverProfile: {
      id: string;
      licenseNumber: string;
      isVerified: boolean;
      isOnline: boolean;
      rating: number;
      totalTrips: number;
    } | null;
    taxiVehicles: Array<{
      make: string;
      model: string;
      plateNumber: string;
    }>;
    partnerProfile: {
      id: string;
      status: string;
      type: string;
      hotel: {
        id: string;
        name: string;
        status: string;
        _count: { rooms: number };
      } | null;
    } | null;
    homeStayListings: Array<{ id: string; title: string; status: string }>;
  },
  activeBookingCount: number,
  guestStats: { visitCount: number; totalSpent: number } | null,
): AdminUserDetail["roleContext"] {
  if (user.role === "hotel_manager" && user.partnerProfile?.hotel) {
    const hotel = user.partnerProfile.hotel;
    return {
      type: "hotel_manager",
      hotel: {
        id: hotel.id,
        name: hotel.name,
        status: hotel.status,
        roomCount: hotel._count.rooms,
        activeBookingCount,
      },
    };
  }

  if (user.role === "taxi_partner" || user.role === "taxi") {
    const vehicle = user.taxiVehicles[0] ?? null;
    return {
      type: user.role,
      driverProfile: user.driverProfile,
      vehicle: vehicle
        ? {
            make: vehicle.make,
            model: vehicle.model,
            plateNumber: vehicle.plateNumber,
          }
        : null,
    };
  }

  if (user.role === "guide") {
    return {
      type: "guide",
      partnerId: user.partnerProfile?.id ?? null,
    };
  }

  if (user.role === "home_stay_partner") {
    return {
      type: "home_stay_partner",
      partnerId: user.partnerProfile?.id ?? null,
      listings: user.homeStayListings,
    };
  }

  if (user.role === "user") {
    return { type: "user", guestStats };
  }

  return { type: "other" };
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      driverProfile: {
        select: {
          id: true,
          licenseNumber: true,
          isVerified: true,
          isOnline: true,
          rating: true,
          totalTrips: true,
        },
      },
      taxiVehicles: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          make: true,
          model: true,
          plateNumber: true,
        },
      },
      partnerProfile: {
        select: {
          id: true,
          status: true,
          type: true,
          hotel: {
            include: {
              _count: { select: { rooms: true } },
            },
          },
        },
      },
      homeStayListings: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!user) return null;

  const hotelId = user.partnerProfile?.hotel?.id;

  const [guestRows, auditLogs, activeBookingCount] = await Promise.all([
    user.role === "user"
      ? prisma.hotelGuest.findMany({
          where: { phone: user.phone },
          select: { visitCount: true, totalSpent: true },
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
    }),
    hotelId
      ? prisma.hotelBooking.count({
          where: {
            hotelId,
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
        })
      : Promise.resolve(0),
  ]);

  const guestStats =
    guestRows.length > 0
      ? {
          visitCount: guestRows.reduce((sum, row) => sum + row.visitCount, 0),
          totalSpent: guestRows.reduce((sum, row) => sum + Number(row.totalSpent), 0),
        }
      : null;

  const partner = user.partnerProfile
    ? {
        id: user.partnerProfile.id,
        status: user.partnerProfile.status,
        type: user.partnerProfile.type,
      }
    : null;

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    partner,
    roleContext: buildRoleContext(user, activeBookingCount, guestStats),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
