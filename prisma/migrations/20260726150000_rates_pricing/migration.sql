-- Rates pricing pipeline (additive). Do not apply to prod without approval.

ALTER TABLE `HotelBooking` ADD COLUMN `pricingSnapshot` JSON NULL;

CREATE TABLE `CancellationPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CancellationPolicy_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CancellationRule` (
    `id` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NOT NULL,
    `hoursBeforeCheckIn` INT NOT NULL,
    `refundPercent` INT NOT NULL,
    `conditions` JSON NULL,
    INDEX `CancellationRule_policyId_hoursBeforeCheckIn_idx`(`policyId`, `hoursBeforeCheckIn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RatePlan` (
    `id` VARCHAR(191) NOT NULL,
    `roomTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('BASE', 'DERIVED', 'INDEPENDENT') NOT NULL,
    `basePriceTiyin` BIGINT NULL,
    `derivedFromId` VARCHAR(191) NULL,
    `adjustmentType` VARCHAR(191) NULL,
    `adjustmentValueTiyin` BIGINT NULL,
    `adjustmentBps` INT NULL,
    `cancellationPolicyId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `RatePlan_roomTypeId_isActive_idx`(`roomTypeId`, `isActive`),
    INDEX `RatePlan_roomTypeId_type_idx`(`roomTypeId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RateOverride` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `priceTiyin` BIGINT NOT NULL,
    `minLos` INT NULL,
    INDEX `RateOverride_ratePlanId_startDate_endDate_idx`(`ratePlanId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` BIGINT NOT NULL,
    `stackGroup` VARCHAR(191) NOT NULL,
    `priority` INT NOT NULL,
    `combinableWith` JSON NOT NULL,
    `maxDiscountTiyin` BIGINT NULL,
    `activeFrom` DATETIME(3) NULL,
    `activeTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    UNIQUE INDEX `Promotion_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TaxFeeRule` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` BIGINT NOT NULL,
    `sortOrder` INT NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OccupancyRule` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NULL,
    `roomTypeId` VARCHAR(191) NULL,
    `rules` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LosRule` (
    `id` VARCHAR(191) NOT NULL,
    `ratePlanId` VARCHAR(191) NULL,
    `minLos` INT NULL,
    `maxLos` INT NULL,
    `tiers` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CancellationRule` ADD CONSTRAINT `CancellationRule_policyId_fkey`
  FOREIGN KEY (`policyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_roomTypeId_fkey`
  FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_derivedFromId_fkey`
  FOREIGN KEY (`derivedFromId`) REFERENCES `RatePlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_cancellationPolicyId_fkey`
  FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RateOverride` ADD CONSTRAINT `RateOverride_ratePlanId_fkey`
  FOREIGN KEY (`ratePlanId`) REFERENCES `RatePlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
