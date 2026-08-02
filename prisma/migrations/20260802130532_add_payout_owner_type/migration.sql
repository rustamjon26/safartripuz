-- AlterTable
ALTER TABLE `GuideListing` ADD COLUMN `ownerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `GuideBooking` ADD COLUMN `payoutOwnerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `ownerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `HotelBooking` ADD COLUMN `payoutOwnerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `HomeStayListing` ADD COLUMN `ownerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `HomeStayBooking` ADD COLUMN `payoutOwnerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `payoutOwnerType` ENUM('PLATFORM', 'PARTNER') NOT NULL DEFAULT 'PARTNER';

-- CreateIndex
CREATE INDEX `HotelBooking_payoutOwnerType_idx` ON `HotelBooking`(`payoutOwnerType`);

-- CreateIndex
CREATE INDEX `Booking_payoutOwnerType_idx` ON `Booking`(`payoutOwnerType`);
