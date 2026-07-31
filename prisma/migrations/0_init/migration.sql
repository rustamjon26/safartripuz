-- CreateTable
CREATE TABLE `SystemSetting` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('super_admin', 'admin', 'user', 'taxi', 'taxi_partner', 'hotel_manager', 'guide', 'restaurant_manager', 'home_stay_partner') NOT NULL DEFAULT 'user',
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `expoPushToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeSayPartner` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HomeSayPartner_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partner` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('taxi', 'hotel', 'guide', 'restaurant', 'agency') NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Partner_userId_key`(`userId`),
    INDEX `Partner_status_type_idx`(`status`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiService` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('INTERCITY_TRANSFER', 'HOTEL_TRANSFER', 'TOUR_DAILY_TRANSPORT') NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxiService_serviceType_isActive_idx`(`serviceType`, `isActive`),
    INDEX `TaxiService_partnerId_isActive_idx`(`partnerId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,
    `plateNumber` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `category` ENUM('STANDARD', 'COMFORT', 'MINIVAN', 'PREMIUM') NOT NULL,
    `images` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_plateNumber_key`(`plateNumber`),
    INDEX `Vehicle_driverId_isActive_idx`(`driverId`, `isActive`),
    INDEX `Vehicle_category_isActive_idx`(`category`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverProfile` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `licenseNumber` VARCHAR(191) NOT NULL,
    `licenseExpiry` DATETIME(3) NOT NULL,
    `rating` DOUBLE NOT NULL DEFAULT 5.0,
    `totalTrips` INTEGER NOT NULL DEFAULT 0,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `currentLat` DOUBLE NULL,
    `currentLng` DOUBLE NULL,
    `lastLat` DOUBLE NULL,
    `lastLng` DOUBLE NULL,
    `lastLocationAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DriverProfile_driverId_key`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideListing` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `meetingPoint` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL,
    `languages` JSON NOT NULL,
    `category` ENUM('CITY_TOUR', 'NATURE', 'HISTORY', 'ADVENTURE', 'FOOD', 'CUSTOM') NOT NULL,
    `region` VARCHAR(191) NULL,
    `duration` VARCHAR(191) NULL,
    `pricePerDay` DECIMAL(12, 2) NOT NULL,
    `pricePerHour` DECIMAL(10, 2) NOT NULL,
    `minHours` INTEGER NOT NULL,
    `maxHours` INTEGER NOT NULL,
    `maxGroupSize` INTEGER NOT NULL,
    `images` JSON NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `verificationNote` VARCHAR(191) NULL,
    `rating` DOUBLE NOT NULL DEFAULT 5.0,
    `totalBookings` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuideListing_partnerId_isActive_idx`(`partnerId`, `isActive`),
    INDEX `GuideListing_hostId_status_idx`(`hostId`, `status`),
    INDEX `GuideListing_status_category_idx`(`status`, `category`),
    INDEX `GuideListing_region_status_idx`(`region`, `status`),
    INDEX `GuideListing_isActive_language_idx`(`isActive`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideAvailability` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuideAvailability_listingId_dayOfWeek_isAvailable_idx`(`listingId`, `dayOfWeek`, `isAvailable`),
    INDEX `GuideAvailability_guideId_dayOfWeek_isAvailable_idx`(`guideId`, `dayOfWeek`, `isAvailable`),
    UNIQUE INDEX `GuideAvailability_guideId_dayOfWeek_key`(`guideId`, `dayOfWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideBlockedSlot` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(191) NULL,
    `endTime` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuideBlockedSlot_listingId_date_idx`(`listingId`, `date`),
    INDEX `GuideBlockedSlot_guideId_date_idx`(`guideId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideBooking` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `travelPlanId` VARCHAR(191) NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `hours` INTEGER NOT NULL,
    `groupSize` INTEGER NOT NULL,
    `hourlyRate` DECIMAL(10, 2) NOT NULL,
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `priceSnapshot` JSON NOT NULL,
    `meetingPoint` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTE') NOT NULL DEFAULT 'PENDING',
    `cancelledBy` ENUM('GUIDE', 'CUSTOMER', 'SYSTEM') NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `guestNote` VARCHAR(191) NULL,
    `guideNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuideBooking_listingId_status_idx`(`listingId`, `status`),
    INDEX `GuideBooking_guideId_status_idx`(`guideId`, `status`),
    INDEX `GuideBooking_guestId_status_idx`(`guestId`, `status`),
    INDEX `GuideBooking_travelPlanId_status_idx`(`travelPlanId`, `status`),
    INDEX `GuideBooking_date_status_idx`(`date`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideBookingLog` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuideBookingLog_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    INDEX `GuideBookingLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuideReview` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GuideReview_bookingId_key`(`bookingId`),
    INDEX `GuideReview_guestId_idx`(`guestId`),
    INDEX `GuideReview_guideId_rating_idx`(`guideId`, `rating`),
    INDEX `GuideReview_listingId_rating_idx`(`listingId`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hotel` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'active', 'suspended') NOT NULL DEFAULT 'draft',
    `name` VARCHAR(191) NOT NULL,
    `totalRooms` INTEGER NOT NULL DEFAULT 20,
    `city` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Hotel_partnerId_key`(`partnerId`),
    INDEX `Hotel_status_idx`(`status`),
    INDEX `Hotel_latitude_longitude_idx`(`latitude`, `longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelBooking` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NULL,
    `guestId` VARCHAR(191) NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `guestPhone` VARCHAR(191) NULL,
    `passportData` TEXT NULL,
    `nationality` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `checkInDate` DATETIME(3) NOT NULL,
    `checkOutDate` DATETIME(3) NOT NULL,
    `roomCount` INTEGER NOT NULL DEFAULT 1,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `source` ENUM('SAFARTRIP', 'DIRECT', 'WALK_IN', 'PHONE', 'CORPORATE', 'ADMIN', 'RECEPTION') NOT NULL DEFAULT 'SAFARTRIP',
    `status` ENUM('PENDING', 'HELD', 'PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'NO_SHOW', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `holdExpiresAt` DATETIME(3) NULL,
    `note` VARCHAR(191) NULL,
    `pricingSnapshot` JSON NULL,
    `cancellationPolicyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelBooking_hotelId_checkInDate_idx`(`hotelId`, `checkInDate`),
    INDEX `HotelBooking_hotelId_status_idx`(`hotelId`, `status`),
    INDEX `HotelBooking_roomTypeId_idx`(`roomTypeId`),
    INDEX `HotelBooking_guestId_idx`(`guestId`),
    INDEX `HotelBooking_status_holdExpiresAt_idx`(`status`, `holdExpiresAt`),
    INDEX `HotelBooking_cancellationPolicyId_idx`(`cancellationPolicyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('PENDING', 'HELD', 'PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'NO_SHOW', 'EXPIRED') NOT NULL,
    `toStatus` ENUM('PENDING', 'HELD', 'PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'NO_SHOW', 'EXPIRED') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `actor` ENUM('USER', 'PARTNER', 'SYSTEM', 'PAYME', 'CLICK') NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingEvent_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventory` (
    `id` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `totalRooms` INTEGER NOT NULL,
    `availableRooms` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    INDEX `Inventory_roomTypeId_date_availableRooms_idx`(`roomTypeId`, `date`, `availableRooms`),
    UNIQUE INDEX `Inventory_roomTypeId_date_key`(`roomTypeId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingGuest` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `passportData` TEXT NULL,
    `nationality` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `isChild` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BookingGuest_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomType` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `capacityAdults` INTEGER NOT NULL DEFAULT 2,
    `capacityChildren` INTEGER NOT NULL DEFAULT 0,
    `basePrice` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `amenities` JSON NULL,
    `images` JSON NULL,
    `cancellationPolicyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RoomType_hotelId_isActive_idx`(`hotelId`, `isActive`),
    INDEX `RoomType_cancellationPolicyId_idx`(`cancellationPolicyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhysicalRoom` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `roomNumber` VARCHAR(191) NOT NULL,
    `floor` VARCHAR(191) NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PhysicalRoom_hotelId_roomTypeId_isActive_status_idx`(`hotelId`, `roomTypeId`, `isActive`, `status`),
    UNIQUE INDEX `PhysicalRoom_hotelId_roomNumber_key`(`hotelId`, `roomNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingRoomAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `physicalRoomId` VARCHAR(191) NOT NULL,
    `checkInDate` DATETIME(3) NOT NULL,
    `checkOutDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BookingRoomAssignment_physicalRoomId_checkInDate_checkOutDat_idx`(`physicalRoomId`, `checkInDate`, `checkOutDate`, `status`),
    INDEX `BookingRoomAssignment_bookingId_status_idx`(`bookingId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TravelPlan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `pax` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `totalAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `note` VARCHAR(191) NULL,
    `tourPackageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TravelPlan_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TravelPlan_status_idx`(`status`),
    INDEX `TravelPlan_tourPackageId_idx`(`tourPackageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TravelPlanItem` (
    `id` VARCHAR(191) NOT NULL,
    `travelPlanId` VARCHAR(191) NOT NULL,
    `type` ENUM('HOTEL', 'HOMESTAY', 'TAXI', 'GUIDE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TravelPlanItem_travelPlanId_type_idx`(`travelPlanId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `travelPlanId` VARCHAR(191) NOT NULL,
    `provider` ENUM('CLICK', 'PAYME', 'UZUM', 'MANUAL', 'MOCK') NOT NULL DEFAULT 'MOCK',
    `status` ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'INITIATED',
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `idempotencyKey` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `didoxDocumentId` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_idempotencyKey_key`(`idempotencyKey`),
    INDEX `Payment_travelPlanId_status_idx`(`travelPlanId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiOrder` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `vehicleId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `travelPlanId` VARCHAR(191) NULL,
    `pickupAddress` VARCHAR(191) NOT NULL,
    `dropoffAddress` VARCHAR(191) NOT NULL,
    `pickupLat` DOUBLE NOT NULL,
    `pickupLng` DOUBLE NOT NULL,
    `dropoffLat` DOUBLE NOT NULL,
    `dropoffLng` DOUBLE NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `estimatedPrice` DECIMAL(10, 2) NOT NULL,
    `finalPrice` DECIMAL(10, 2) NULL,
    `distanceKm` DOUBLE NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTE') NOT NULL DEFAULT 'PENDING',
    `cancelledBy` ENUM('CUSTOMER', 'DRIVER', 'SYSTEM') NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `customerNote` VARCHAR(191) NULL,
    `driverNote` VARCHAR(191) NULL,
    `priceSnapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxiOrder_customerId_status_idx`(`customerId`, `status`),
    INDEX `TaxiOrder_driverId_status_idx`(`driverId`, `status`),
    INDEX `TaxiOrder_vehicleId_idx`(`vehicleId`),
    INDEX `TaxiOrder_serviceId_idx`(`serviceId`),
    INDEX `TaxiOrder_travelPlanId_idx`(`travelPlanId`),
    INDEX `TaxiOrder_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiOrderLog` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaxiOrderLog_orderId_createdAt_idx`(`orderId`, `createdAt`),
    INDEX `TaxiOrderLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxiReview` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TaxiReview_orderId_key`(`orderId`),
    INDEX `TaxiReview_customerId_idx`(`customerId`),
    INDEX `TaxiReview_driverId_rating_idx`(`driverId`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DriverEarning` (
    `id` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `grossAmount` DECIMAL(10, 2) NOT NULL,
    `platformFee` DECIMAL(10, 2) NOT NULL,
    `netAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'SETTLED') NOT NULL DEFAULT 'PENDING',
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DriverEarning_orderId_key`(`orderId`),
    INDEX `DriverEarning_driverId_status_idx`(`driverId`, `status`),
    INDEX `DriverEarning_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerEarning` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `bookingType` ENUM('HOTEL', 'HOMESTAY', 'GUIDE', 'TAXI') NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `grossAmount` DECIMAL(12, 2) NOT NULL,
    `commissionRate` DECIMAL(5, 2) NOT NULL,
    `commissionFee` DECIMAL(12, 2) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerEarning_partnerId_idx`(`partnerId`),
    INDEX `PartnerEarning_bookingId_idx`(`bookingId`),
    INDEX `PartnerEarning_status_idx`(`status`),
    INDEX `PartnerEarning_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `PartnerEarning_bookingType_bookingId_key`(`bookingType`, `bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'info',
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_idx`(`userId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TourPackage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `days` INTEGER NOT NULL,
    `nights` INTEGER NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `category` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `highlights` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TourPackage_status_idx`(`status`),
    INDEX `TourPackage_category_idx`(`category`),
    INDEX `TourPackage_destination_idx`(`destination`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestProfile` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `passportData` TEXT NULL,
    `nationality` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `vipStatus` VARCHAR(191) NOT NULL DEFAULT 'REGULAR',
    `totalVisits` INTEGER NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `preferences` JSON NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuestProfile_hotelId_vipStatus_idx`(`hotelId`, `vipStatus`),
    INDEX `GuestProfile_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelGuest` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `passportId` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `isVip` BOOLEAN NOT NULL DEFAULT false,
    `isBlacklist` BOOLEAN NOT NULL DEFAULT false,
    `visitCount` INTEGER NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HotelGuest_hotelId_idx`(`hotelId`),
    INDEX `HotelGuest_phone_idx`(`phone`),
    UNIQUE INDEX `HotelGuest_hotelId_phone_key`(`hotelId`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HousekeepingTask` (
    `id` VARCHAR(191) NOT NULL,
    `physicalRoomId` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NULL,
    `assigneeName` VARCHAR(191) NULL,
    `taskType` VARCHAR(191) NOT NULL DEFAULT 'CLEANING',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HousekeepingTask_hotelId_status_idx`(`hotelId`, `status`),
    INDEX `HousekeepingTask_physicalRoomId_status_idx`(`physicalRoomId`, `status`),
    INDEX `HousekeepingTask_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskConsumption` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskConsumption_taskId_idx`(`taskId`),
    INDEX `TaskConsumption_inventoryItemId_idx`(`inventoryItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelStaff` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `shift` VARCHAR(191) NULL,
    `salary` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HotelStaff_userId_key`(`userId`),
    INDEX `HotelStaff_hotelId_role_idx`(`hotelId`, `role`),
    INDEX `HotelStaff_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FolioItem` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'ROOM',
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FolioItem_bookingId_idx`(`bookingId`),
    INDEX `FolioItem_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HotelPayment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'CASH',
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `receiptUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HotelPayment_bookingId_idx`(`bookingId`),
    INDEX `HotelPayment_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryCategory` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `InventoryCategory_name_key`(`name`),
    INDEX `InventoryCategory_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `unit` VARCHAR(191) NOT NULL DEFAULT 'PCS',
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `minQuantity` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `isHousekeepingSupply` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_hotelId_category_idx`(`hotelId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `quantity` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryTransaction_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `InventoryTransaction_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MenuItem_hotelId_category_idx`(`hotelId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RestaurantOrder` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `tableNumber` VARCHAR(191) NULL,
    `items` JSON NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `isChargedToRoom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RestaurantOrder_hotelId_status_idx`(`hotelId`, `status`),
    INDEX `RestaurantOrder_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `guestName` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `comment` TEXT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'DIRECT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GuestFeedback_hotelId_rating_idx`(`hotelId`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeStayListing` (
    `id` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `pricePerNight` DECIMAL(10, 2) NOT NULL,
    `maxGuests` INTEGER NOT NULL,
    `rooms` INTEGER NOT NULL,
    `beds` INTEGER NOT NULL,
    `bathrooms` INTEGER NOT NULL,
    `amenities` JSON NOT NULL,
    `images` JSON NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    `verificationNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HomeStayListing_hostId_status_idx`(`hostId`, `status`),
    INDEX `HomeStayListing_city_status_idx`(`city`, `status`),
    INDEX `HomeStayListing_partnerId_idx`(`partnerId`),
    INDEX `HomeStayListing_latitude_longitude_idx`(`latitude`, `longitude`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeStayAvailability` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `reason` ENUM('BOOKED', 'HOST_BLOCKED', 'MAINTENANCE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HomeStayAvailability_bookingId_key`(`bookingId`),
    INDEX `HomeStayAvailability_listingId_startDate_endDate_idx`(`listingId`, `startDate`, `endDate`),
    INDEX `HomeStayAvailability_reason_idx`(`reason`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeStayBooking` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `travelPlanId` VARCHAR(191) NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `nights` INTEGER NOT NULL,
    `guestCount` INTEGER NOT NULL,
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `priceSnapshot` JSON NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'DISPUTE') NOT NULL DEFAULT 'PENDING',
    `holdExpiresAt` DATETIME(3) NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `guestNote` VARCHAR(191) NULL,
    `hostNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HomeStayBooking_listingId_status_idx`(`listingId`, `status`),
    INDEX `HomeStayBooking_guestId_status_idx`(`guestId`, `status`),
    INDEX `HomeStayBooking_travelPlanId_status_idx`(`travelPlanId`, `status`),
    INDEX `HomeStayBooking_checkIn_checkOut_idx`(`checkIn`, `checkOut`),
    INDEX `HomeStayBooking_status_holdExpiresAt_idx`(`status`, `holdExpiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeStayBookingLog` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorRole` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HomeStayBookingLog_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    INDEX `HomeStayBookingLog_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `checkInDate` DATETIME(3) NULL,
    `checkOutDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Booking_userId_status_idx`(`userId`, `status`),
    INDEX `Booking_hotelId_status_idx`(`hotelId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymeTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `paymeId` VARCHAR(191) NOT NULL,
    `paymeTime` BIGINT NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `state` INTEGER NOT NULL DEFAULT 1,
    `amount` INTEGER NOT NULL,
    `reason` INTEGER NULL,
    `performTime` BIGINT NULL,
    `cancelTime` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymeTransaction_paymeId_key`(`paymeId`),
    UNIQUE INDEX `PaymeTransaction_bookingId_key`(`bookingId`),
    INDEX `PaymeTransaction_paymeTime_idx`(`paymeTime`),
    INDEX `PaymeTransaction_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeStayReview` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HomeStayReview_bookingId_key`(`bookingId`),
    INDEX `HomeStayReview_guestId_idx`(`guestId`),
    INDEX `HomeStayReview_listingId_rating_idx`(`listingId`, `rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `amountTiyin` BIGINT NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `status` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `travelPlanId` VARCHAR(191) NULL,
    `legacyPaymentId` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentTransaction_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PaymentTransaction_provider_externalRef_idx`(`provider`, `externalRef`),
    INDEX `PaymentTransaction_legacyPaymentId_idx`(`legacyPaymentId`),
    INDEX `PaymentTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcessedEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerEventId` VARCHAR(191) NOT NULL,
    `payloadHash` VARCHAR(191) NOT NULL,
    `responseJson` JSON NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProcessedEvent_provider_providerEventId_key`(`provider`, `providerEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookLog` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `headers` JSON NOT NULL,
    `rawBody` LONGTEXT NOT NULL,
    `verified` BOOLEAN NULL,
    `resultNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookLog_provider_createdAt_idx`(`provider`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerAccount` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('ASSET', 'LIABILITY', 'REVENUE', 'EQUITY') NOT NULL,
    `ownerType` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LedgerAccount_ownerType_ownerId_type_currency_key`(`ownerType`, `ownerId`, `type`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `reversesTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LedgerTransaction_idempotencyKey_key`(`idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `amount` BIGINT NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerEntry_accountId_idx`(`accountId`),
    INDEX `LedgerEntry_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CancellationPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CancellationPolicy_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CancellationRule` (
    `id` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NOT NULL,
    `hoursBeforeCheckIn` INTEGER NOT NULL,
    `refundPercent` INTEGER NOT NULL,
    `conditions` JSON NULL,

    INDEX `CancellationRule_policyId_hoursBeforeCheckIn_idx`(`policyId`, `hoursBeforeCheckIn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RatePlan` (
    `id` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('BASE', 'DERIVED', 'INDEPENDENT') NOT NULL,
    `basePriceTiyin` BIGINT NULL,
    `derivedFromId` VARCHAR(191) NULL,
    `adjustmentType` VARCHAR(191) NULL,
    `adjustmentValueTiyin` BIGINT NULL,
    `adjustmentBps` INTEGER NULL,
    `cancellationPolicyId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RatePlan_roomTypeId_isActive_idx`(`roomTypeId`, `isActive`),
    INDEX `RatePlan_roomTypeId_type_idx`(`roomTypeId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateOverride` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `priceTiyin` BIGINT NOT NULL,
    `minLos` INTEGER NULL,

    INDEX `RateOverride_ratePlanId_startDate_endDate_idx`(`ratePlanId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` BIGINT NOT NULL,
    `stackGroup` VARCHAR(191) NOT NULL,
    `priority` INTEGER NOT NULL,
    `combinableWith` JSON NOT NULL,
    `maxDiscountTiyin` BIGINT NULL,
    `activeFrom` DATETIME(3) NULL,
    `activeTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Promotion_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxFeeRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` BIGINT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OccupancyRule` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NULL,
    `roomTypeId` VARCHAR(191) NULL,
    `rules` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LosRule` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NULL,
    `minLos` INTEGER NULL,
    `maxLos` INTEGER NULL,
    `tiers` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboxEvent` (
    `id` VARCHAR(191) NOT NULL,
    `aggregateType` VARCHAR(191) NOT NULL,
    `aggregateId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,

    INDEX `OutboxEvent_status_availableAt_idx`(`status`, `availableAt`),
    INDEX `OutboxEvent_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    INDEX `OutboxEvent_eventType_status_idx`(`eventType`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboxProcessedKey` (
    `id` VARCHAR(191) NOT NULL,
    `consumer` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OutboxProcessedKey_consumer_key_key`(`consumer`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Site` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameRu` VARCHAR(191) NULL,
    `nameEn` VARCHAR(191) NULL,
    `regionCode` VARCHAR(191) NOT NULL,
    `districtCode` VARCHAR(191) NULL,
    `category` ENUM('OBIDA', 'MADRASA', 'MASJID', 'MAQBARA', 'MUZEY', 'ARXEOLOGIYA', 'TABIAT', 'BOZOR', 'ZIYORATGOH', 'BOSHQA', 'RESTORAN', 'CHAYXONA', 'KAFE') NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `openingHours` JSON NULL,
    `dining` JSON NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Site_slug_key`(`slug`),
    INDEX `Site_regionCode_districtCode_status_idx`(`regionCode`, `districtCode`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Claim` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `kind` ENUM('TARIX', 'ARXITEKTURA', 'AMALIY', 'NARX', 'RIVOYAT') NOT NULL,
    `level` ENUM('TASDIQLANGAN', 'ILMIY_MANBA', 'NIZOLI', 'OGZAKI_RIVOYAT', 'TASDIQLANMAGAN') NOT NULL DEFAULT 'TASDIQLANMAGAN',
    `levelLockedBy` VARCHAR(191) NULL,
    `levelLockedNote` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `checkedAt` DATETIME(3) NULL,
    `recheckAfter` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Claim_siteId_level_idx`(`siteId`, `level`),
    INDEX `Claim_recheckAfter_idx`(`recheckAfter`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Source` (
    `id` VARCHAR(191) NOT NULL,
    `tier` ENUM('A_RASMIY', 'B_ILMIY', 'C_ENSIKLOPEDIK', 'D_IKKILAMCHI') NOT NULL,
    `publisher` VARCHAR(191) NOT NULL,
    `publisherKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `citation` TEXT NOT NULL,
    `retrievedAt` DATETIME(3) NOT NULL,
    `deadSince` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Source_publisherKey_tier_idx`(`publisherKey`, `tier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClaimPosition` (
    `id` VARCHAR(191) NOT NULL,
    `claimId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ClaimPosition_claimId_idx`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClaimSource` (
    `id` VARCHAR(191) NOT NULL,
    `claimId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `quote` TEXT NULL,
    `supportsPositionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ClaimSource_sourceId_idx`(`sourceId`),
    INDEX `ClaimSource_claimId_idx`(`claimId`),
    UNIQUE INDEX `ClaimSource_claimId_sourceId_key`(`claimId`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccuracyReport` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `message` TEXT NOT NULL,
    `guideUserId` VARCHAR(191) NULL,
    `regionCode` VARCHAR(191) NULL,
    `siteId` VARCHAR(191) NULL,
    `claimId` VARCHAR(191) NULL,
    `reporterUserId` VARCHAR(191) NULL,
    `upheld` BOOLEAN NULL,
    `reviewNote` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AccuracyReport_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `AccuracyReport_guideUserId_upheld_idx`(`guideUserId`, `upheld`),
    INDEX `AccuracyReport_regionCode_idx`(`regionCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HomeSayPartner` ADD CONSTRAINT `HomeSayPartner_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiService` ADD CONSTRAINT `TaxiService_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriverProfile` ADD CONSTRAINT `DriverProfile_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideListing` ADD CONSTRAINT `GuideListing_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideListing` ADD CONSTRAINT `GuideListing_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideAvailability` ADD CONSTRAINT `GuideAvailability_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `GuideListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideAvailability` ADD CONSTRAINT `GuideAvailability_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBlockedSlot` ADD CONSTRAINT `GuideBlockedSlot_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `GuideListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBlockedSlot` ADD CONSTRAINT `GuideBlockedSlot_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBooking` ADD CONSTRAINT `GuideBooking_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `GuideListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBooking` ADD CONSTRAINT `GuideBooking_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBooking` ADD CONSTRAINT `GuideBooking_travelPlanId_fkey` FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBooking` ADD CONSTRAINT `GuideBooking_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBookingLog` ADD CONSTRAINT `GuideBookingLog_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `GuideBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideBookingLog` ADD CONSTRAINT `GuideBookingLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideReview` ADD CONSTRAINT `GuideReview_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `GuideBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideReview` ADD CONSTRAINT `GuideReview_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideReview` ADD CONSTRAINT `GuideReview_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuideReview` ADD CONSTRAINT `GuideReview_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `GuideListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hotel` ADD CONSTRAINT `Hotel_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_cancellationPolicyId_fkey` FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingEvent` ADD CONSTRAINT `BookingEvent_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingGuest` ADD CONSTRAINT `BookingGuest_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomType` ADD CONSTRAINT `RoomType_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomType` ADD CONSTRAINT `RoomType_cancellationPolicyId_fkey` FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhysicalRoom` ADD CONSTRAINT `PhysicalRoom_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhysicalRoom` ADD CONSTRAINT `PhysicalRoom_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingRoomAssignment` ADD CONSTRAINT `BookingRoomAssignment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingRoomAssignment` ADD CONSTRAINT `BookingRoomAssignment_physicalRoomId_fkey` FOREIGN KEY (`physicalRoomId`) REFERENCES `PhysicalRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelPlan` ADD CONSTRAINT `TravelPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelPlan` ADD CONSTRAINT `TravelPlan_tourPackageId_fkey` FOREIGN KEY (`tourPackageId`) REFERENCES `TourPackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TravelPlanItem` ADD CONSTRAINT `TravelPlanItem_travelPlanId_fkey` FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_travelPlanId_fkey` FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrder` ADD CONSTRAINT `TaxiOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrder` ADD CONSTRAINT `TaxiOrder_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrder` ADD CONSTRAINT `TaxiOrder_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrder` ADD CONSTRAINT `TaxiOrder_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `TaxiService`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrder` ADD CONSTRAINT `TaxiOrder_travelPlanId_fkey` FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrderLog` ADD CONSTRAINT `TaxiOrderLog_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `TaxiOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiOrderLog` ADD CONSTRAINT `TaxiOrderLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiReview` ADD CONSTRAINT `TaxiReview_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `TaxiOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiReview` ADD CONSTRAINT `TaxiReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxiReview` ADD CONSTRAINT `TaxiReview_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriverEarning` ADD CONSTRAINT `DriverEarning_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DriverEarning` ADD CONSTRAINT `DriverEarning_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `TaxiOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerEarning` ADD CONSTRAINT `PartnerEarning_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestProfile` ADD CONSTRAINT `GuestProfile_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelGuest` ADD CONSTRAINT `HotelGuest_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HousekeepingTask` ADD CONSTRAINT `HousekeepingTask_physicalRoomId_fkey` FOREIGN KEY (`physicalRoomId`) REFERENCES `PhysicalRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HousekeepingTask` ADD CONSTRAINT `HousekeepingTask_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `HotelStaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskConsumption` ADD CONSTRAINT `TaskConsumption_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `HousekeepingTask`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskConsumption` ADD CONSTRAINT `TaskConsumption_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelStaff` ADD CONSTRAINT `HotelStaff_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelStaff` ADD CONSTRAINT `HotelStaff_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FolioItem` ADD CONSTRAINT `FolioItem_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelPayment` ADD CONSTRAINT `HotelPayment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryCategory` ADD CONSTRAINT `InventoryCategory_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuItem` ADD CONSTRAINT `MenuItem_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestaurantOrder` ADD CONSTRAINT `RestaurantOrder_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestFeedback` ADD CONSTRAINT `GuestFeedback_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayListing` ADD CONSTRAINT `HomeStayListing_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayListing` ADD CONSTRAINT `HomeStayListing_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `HomeSayPartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayAvailability` ADD CONSTRAINT `HomeStayAvailability_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `HomeStayListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayAvailability` ADD CONSTRAINT `HomeStayAvailability_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HomeStayBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayBooking` ADD CONSTRAINT `HomeStayBooking_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `HomeStayListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayBooking` ADD CONSTRAINT `HomeStayBooking_travelPlanId_fkey` FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayBooking` ADD CONSTRAINT `HomeStayBooking_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayBookingLog` ADD CONSTRAINT `HomeStayBookingLog_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HomeStayBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayBookingLog` ADD CONSTRAINT `HomeStayBookingLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymeTransaction` ADD CONSTRAINT `PaymeTransaction_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayReview` ADD CONSTRAINT `HomeStayReview_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `HomeStayBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayReview` ADD CONSTRAINT `HomeStayReview_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeStayReview` ADD CONSTRAINT `HomeStayReview_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `HomeStayListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `LedgerAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CancellationRule` ADD CONSTRAINT `CancellationRule_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_derivedFromId_fkey` FOREIGN KEY (`derivedFromId`) REFERENCES `RatePlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_cancellationPolicyId_fkey` FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RateOverride` ADD CONSTRAINT `RateOverride_ratePlanId_fkey` FOREIGN KEY (`ratePlanId`) REFERENCES `RatePlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Claim` ADD CONSTRAINT `Claim_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClaimPosition` ADD CONSTRAINT `ClaimPosition_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_supportsPositionId_fkey` FOREIGN KEY (`supportsPositionId`) REFERENCES `ClaimPosition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccuracyReport` ADD CONSTRAINT `AccuracyReport_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccuracyReport` ADD CONSTRAINT `AccuracyReport_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

