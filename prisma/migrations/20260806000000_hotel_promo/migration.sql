-- Hotel marketing promos had no storage at all: the panel's "new promo" form
-- only fired a toast, and the active count was the literal 2.
CREATE TABLE `HotelPromo` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `discountBps` INTEGER NOT NULL,
    `type` ENUM('SEASONAL', 'EVENT', 'LOYALTY') NOT NULL DEFAULT 'SEASONAL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HotelPromo_hotelId_code_key`(`hotelId`, `code`),
    INDEX `HotelPromo_hotelId_isActive_idx`(`hotelId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `HotelPromo` ADD CONSTRAINT `HotelPromo_hotelId_fkey`
  FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
