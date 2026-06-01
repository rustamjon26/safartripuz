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

-- AlterTable
ALTER TABLE `HotelBooking` ADD COLUMN `guestId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `HotelBooking_guestId_idx` ON `HotelBooking`(`guestId`);

-- AddForeignKey
ALTER TABLE `HotelGuest` ADD CONSTRAINT `HotelGuest_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `HotelGuest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
