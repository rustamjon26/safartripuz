-- AlterTable
ALTER TABLE `LedgerTransaction` ADD COLUMN `bookingType` ENUM('HOTEL', 'HOMESTAY', 'GUIDE', 'TAXI') NULL;

-- Backfill from linked booking rows (idempotent WHERE bookingType IS NULL).
-- Near-empty prod expected; kept in-migration so deploy-safe.sh / migrate deploy
-- applies schema + data in one step (no separate ops script).
UPDATE `LedgerTransaction` AS lt
INNER JOIN `HotelBooking` AS hb ON hb.`id` = lt.`bookingId`
SET lt.`bookingType` = 'HOTEL'
WHERE lt.`bookingType` IS NULL AND lt.`bookingId` IS NOT NULL;

UPDATE `LedgerTransaction` AS lt
INNER JOIN `HomeStayBooking` AS hsb ON hsb.`id` = lt.`bookingId`
SET lt.`bookingType` = 'HOMESTAY'
WHERE lt.`bookingType` IS NULL AND lt.`bookingId` IS NOT NULL;

UPDATE `LedgerTransaction` AS lt
INNER JOIN `GuideBooking` AS gb ON gb.`id` = lt.`bookingId`
SET lt.`bookingType` = 'GUIDE'
WHERE lt.`bookingType` IS NULL AND lt.`bookingId` IS NOT NULL;

-- Legacy Payme Booking table → HOTEL
UPDATE `LedgerTransaction` AS lt
INNER JOIN `Booking` AS b ON b.`id` = lt.`bookingId`
SET lt.`bookingType` = 'HOTEL'
WHERE lt.`bookingType` IS NULL AND lt.`bookingId` IS NOT NULL;

-- Fallback: PartnerEarning.bookingType when booking row already gone
UPDATE `LedgerTransaction` AS lt
INNER JOIN `PartnerEarning` AS pe ON pe.`bookingId` = lt.`bookingId`
SET lt.`bookingType` = pe.`bookingType`
WHERE lt.`bookingType` IS NULL AND lt.`bookingId` IS NOT NULL;

-- CreateIndex
CREATE INDEX `LedgerTransaction_bookingType_createdAt_idx` ON `LedgerTransaction`(`bookingType`, `createdAt`);
