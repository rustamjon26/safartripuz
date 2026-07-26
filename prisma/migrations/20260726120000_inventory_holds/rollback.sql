-- Manual down migration (Prisma does not auto-apply).
-- Restores CHECKED_OUT rows from `_booking_status_migration_20260726` when present.

ALTER TABLE `Inventory` DROP CHECK `Inventory_available_lte_total`;
ALTER TABLE `Inventory` DROP CHECK `Inventory_availableRooms_non_negative`;
ALTER TABLE `Inventory` DROP FOREIGN KEY `Inventory_roomTypeId_fkey`;
DROP TABLE IF EXISTS `Inventory`;

DROP INDEX `HomeStayBooking_status_holdExpiresAt_idx` ON `HomeStayBooking`;
ALTER TABLE `HomeStayBooking` DROP COLUMN `holdExpiresAt`;

ALTER TABLE `BookingEvent` DROP FOREIGN KEY `BookingEvent_bookingId_fkey`;
DROP TABLE IF EXISTS `BookingEvent`;

DROP INDEX `HotelBooking_status_holdExpiresAt_idx` ON `HotelBooking`;
ALTER TABLE `HotelBooking` DROP COLUMN `holdExpiresAt`;

-- Re-add CHECKED_OUT (and temporarily keep new values so mapped rows can restore)
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

UPDATE `HotelBooking` b
INNER JOIN `_booking_status_migration_20260726` m ON m.`bookingId` = b.`id`
SET b.`status` = m.`oldStatus`
WHERE m.`oldStatus` = 'CHECKED_OUT';

ALTER TABLE `HotelBooking` MODIFY COLUMN `status` ENUM(
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
) NOT NULL DEFAULT 'PENDING';

DROP TABLE IF EXISTS `_booking_status_migration_20260726`;
