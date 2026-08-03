-- AlterEnum: BookingSource — OTA inbound sources
ALTER TABLE `HotelBooking` MODIFY `source` ENUM(
  'SAFARTRIP',
  'DIRECT',
  'WALK_IN',
  'PHONE',
  'CORPORATE',
  'ADMIN',
  'RECEPTION',
  'BOOKING_COM',
  'EXPEDIA',
  'AIRBNB'
) NOT NULL DEFAULT 'SAFARTRIP';

-- HotelIntegration
CREATE TABLE `HotelIntegration` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(191) NOT NULL,
    `category` ENUM('OTA', 'PAYMENT', 'LOCAL') NOT NULL,
    `status` ENUM('DISCONNECTED', 'PENDING', 'CONNECTED', 'LICENSE_REQUIRED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
    `externalHotelId` VARCHAR(191) NULL,
    `configJson` JSON NULL,
    `credentialsEnc` TEXT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `meta` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HotelIntegration_hotelId_providerKey_key`(`hotelId`, `providerKey`),
    INDEX `HotelIntegration_hotelId_category_idx`(`hotelId`, `category`),
    INDEX `HotelIntegration_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- HotelInvoice
CREATE TABLE `HotelInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `number` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'SENT', 'PAID', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `bookingId` VARCHAR(191) NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientAddress` VARCHAR(191) NULL,
    `clientCity` VARCHAR(191) NULL,
    `clientCountry` VARCHAR(191) NULL DEFAULT 'O‘zbekiston',
    `clientTin` VARCHAR(191) NULL,
    `project` VARCHAR(191) NULL,
    `terms` TEXT NULL,
    `notes` TEXT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `vatRateBps` INT NOT NULL DEFAULT 800,
    `subtotalTiyin` BIGINT NOT NULL DEFAULT 0,
    `vatTiyin` BIGINT NOT NULL DEFAULT 0,
    `totalTiyin` BIGINT NOT NULL DEFAULT 0,
    `issuedAt` DATETIME(3) NULL,
    `dueAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `didoxDocumentId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HotelInvoice_hotelId_number_key`(`hotelId`, `number`),
    INDEX `HotelInvoice_hotelId_status_createdAt_idx`(`hotelId`, `status`, `createdAt`),
    INDEX `HotelInvoice_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `HotelInvoiceLine` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `sortOrder` INT NOT NULL DEFAULT 0,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unitPriceTiyin` BIGINT NOT NULL,
    `lineTotalTiyin` BIGINT NOT NULL,

    INDEX `HotelInvoiceLine_invoiceId_sortOrder_idx`(`invoiceId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Channel mappings / sync / inbound reservations
CREATE TABLE `ChannelRoomMapping` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `externalRoomCode` VARCHAR(191) NOT NULL,
    `externalRateCode` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChannelRoomMapping_hotelId_providerKey_roomTypeId_externalRateCode_key`(`hotelId`, `providerKey`, `roomTypeId`, `externalRateCode`),
    INDEX `ChannelRoomMapping_hotelId_providerKey_active_idx`(`hotelId`, `providerKey`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChannelSyncJob` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(191) NOT NULL,
    `kind` ENUM('ARI_PUSH', 'RESERVATION_PULL', 'FULL_REFRESH', 'MAPPING_PULL') NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
    `payloadJson` JSON NULL,
    `resultJson` JSON NULL,
    `errorMessage` TEXT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChannelSyncJob_hotelId_status_scheduledAt_idx`(`hotelId`, `status`, `scheduledAt`),
    INDEX `ChannelSyncJob_providerKey_status_idx`(`providerKey`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChannelReservationInbox` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(191) NOT NULL,
    `externalReservationId` VARCHAR(191) NOT NULL,
    `status` ENUM('RECEIVED', 'MAPPED', 'BOOKING_CREATED', 'IGNORED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    `payloadJson` JSON NOT NULL,
    `hotelBookingId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ChannelReservationInbox_hotelId_providerKey_externalReservationId_key`(`hotelId`, `providerKey`, `externalReservationId`),
    INDEX `ChannelReservationInbox_hotelId_status_receivedAt_idx`(`hotelId`, `status`, `receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FKs
ALTER TABLE `HotelIntegration` ADD CONSTRAINT `HotelIntegration_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HotelInvoice` ADD CONSTRAINT `HotelInvoice_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HotelInvoiceLine` ADD CONSTRAINT `HotelInvoiceLine_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `HotelInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ChannelRoomMapping` ADD CONSTRAINT `ChannelRoomMapping_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ChannelSyncJob` ADD CONSTRAINT `ChannelSyncJob_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ChannelReservationInbox` ADD CONSTRAINT `ChannelReservationInbox_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
