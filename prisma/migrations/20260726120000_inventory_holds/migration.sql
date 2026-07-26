-- Booking status machine (drop CHECKED_OUT) + holds + room-night Inventory
-- MySQL 8.0.16+ required for CHECK constraints.
-- Do not apply to production from the agent; operators run migrate deploy explicitly.

-- 1) Side table for reversible CHECKED_OUT → COMPLETED mapping
CREATE TABLE IF NOT EXISTS `_booking_status_migration_20260726` (
  `bookingId` VARCHAR(191) NOT NULL PRIMARY KEY,
  `oldStatus` VARCHAR(32) NOT NULL,
  `newStatus` VARCHAR(32) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) Expand BookingStatus enum (keep CHECKED_OUT temporarily)
ALTER TABLE `HotelBooking` MODIFY COLUMN `status` ENUM(
  'PENDING',
  'HELD',
  'PAID',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'NO_SHOW',
  'EXPIRED'
) NOT NULL DEFAULT 'PENDING';

-- 3) Map CHECKED_OUT → COMPLETED and record for rollback
INSERT INTO `_booking_status_migration_20260726` (`bookingId`, `oldStatus`, `newStatus`)
SELECT `id`, 'CHECKED_OUT', 'COMPLETED'
FROM `HotelBooking`
WHERE `status` = 'CHECKED_OUT';

UPDATE `HotelBooking`
SET `status` = 'COMPLETED'
WHERE `status` = 'CHECKED_OUT';

-- 4) Drop CHECKED_OUT from enum
ALTER TABLE `HotelBooking` MODIFY COLUMN `status` ENUM(
  'PENDING',
  'HELD',
  'PAID',
  'CONFIRMED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'NO_SHOW',
  'EXPIRED'
) NOT NULL DEFAULT 'PENDING';

ALTER TABLE `HotelBooking` ADD COLUMN `holdExpiresAt` DATETIME(3) NULL;
CREATE INDEX `HotelBooking_status_holdExpiresAt_idx` ON `HotelBooking`(`status`, `holdExpiresAt`);

-- 5) BookingEventActor + BookingEvent (no CHECKED_OUT)
CREATE TABLE `BookingEvent` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('PENDING','HELD','PAID','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','REFUNDED','NO_SHOW','EXPIRED') NOT NULL,
    `toStatus` ENUM('PENDING','HELD','PAID','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','REFUNDED','NO_SHOW','EXPIRED') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `actor` ENUM('USER','PARTNER','SYSTEM','PAYME','CLICK') NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `BookingEvent_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BookingEvent` ADD CONSTRAINT `BookingEvent_bookingId_fkey`
  FOREIGN KEY (`bookingId`) REFERENCES `HotelBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Homestay hold deadline (HomeStayBookingStatus unchanged — still has CHECKED_OUT)
ALTER TABLE `HomeStayBooking` ADD COLUMN `holdExpiresAt` DATETIME(3) NULL;
CREATE INDEX `HomeStayBooking_status_holdExpiresAt_idx` ON `HomeStayBooking`(`status`, `holdExpiresAt`);

-- Room-night Inventory (fungible)
CREATE TABLE `Inventory` (
    `id` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `totalRooms` INT NOT NULL,
    `availableRooms` INT NOT NULL,
    `version` INT NOT NULL DEFAULT 0,
    UNIQUE INDEX `Inventory_roomTypeId_date_key`(`roomTypeId`, `date`),
    INDEX `Inventory_roomTypeId_date_availableRooms_idx`(`roomTypeId`, `date`, `availableRooms`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_roomTypeId_fkey`
  FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Inventory`
  ADD CONSTRAINT `Inventory_availableRooms_non_negative`
  CHECK (`availableRooms` >= 0);

ALTER TABLE `Inventory`
  ADD CONSTRAINT `Inventory_available_lte_total`
  CHECK (`availableRooms` <= `totalRooms`);
