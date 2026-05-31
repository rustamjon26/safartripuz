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

    UNIQUE INDEX `PartnerEarning_bookingType_bookingId_key`(`bookingType`, `bookingId`),
    INDEX `PartnerEarning_partnerId_idx`(`partnerId`),
    INDEX `PartnerEarning_bookingId_idx`(`bookingId`),
    INDEX `PartnerEarning_status_idx`(`status`),
    INDEX `PartnerEarning_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerEarning` ADD CONSTRAINT `PartnerEarning_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
