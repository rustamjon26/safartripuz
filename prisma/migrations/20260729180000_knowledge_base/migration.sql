-- Knowledge base: Site, Claim, Source, ClaimSource, ClaimPosition, AccuracyReport.
-- Generate-only for this PR — do not apply to remote DBs from local machines.
-- Deploy path: git push → server migrate via scripts/deploy-safe.sh.

CREATE TABLE `Site` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nameRu` VARCHAR(191) NULL,
    `nameEn` VARCHAR(191) NULL,
    `regionCode` VARCHAR(191) NOT NULL,
    `districtCode` VARCHAR(191) NULL,
    `category` ENUM('OBIDA', 'MADRASA', 'MASJID', 'MAQBARA', 'MUZEY', 'ARXEOLOGIYA', 'TABIAT', 'BOZOR', 'ZIYORATGOH', 'BOSHQA') NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `openingHours` JSON NULL,
    `status` ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Site_slug_key`(`slug`),
    INDEX `Site_regionCode_districtCode_status_idx`(`regionCode`, `districtCode`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Claim` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `kind` ENUM('TARIX', 'ARXITEKTURA', 'AMALIY', 'NARX', 'RIVOYAT') NOT NULL,
    `level` ENUM('TASDIQLANGAN', 'ILMIY_MANBA', 'NIZOLI', 'OGZAKI_RIVOYAT', 'TASDIQLANMAGAN') NOT NULL DEFAULT 'TASDIQLANMAGAN',
    `levelLockedBy` VARCHAR(191) NULL,
    `levelLockedNote` TEXT NULL,
    `version` INT NOT NULL DEFAULT 1,
    `checkedAt` DATETIME(3) NULL,
    `recheckAfter` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Claim_siteId_level_idx`(`siteId`, `level`),
    INDEX `Claim_recheckAfter_idx`(`recheckAfter`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

CREATE TABLE `ClaimSource` (
    `id` VARCHAR(191) NOT NULL,
    `claimId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `quote` TEXT NULL,
    `supportsPositionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ClaimSource_claimId_sourceId_key`(`claimId`, `sourceId`),
    INDEX `ClaimSource_sourceId_idx`(`sourceId`),
    INDEX `ClaimSource_claimId_idx`(`claimId`),
    INDEX `ClaimSource_supportsPositionId_idx`(`supportsPositionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    INDEX `AccuracyReport_siteId_idx`(`siteId`),
    INDEX `AccuracyReport_claimId_idx`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Claim` ADD CONSTRAINT `Claim_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClaimPosition` ADD CONSTRAINT `ClaimPosition_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ClaimSource` ADD CONSTRAINT `ClaimSource_supportsPositionId_fkey` FOREIGN KEY (`supportsPositionId`) REFERENCES `ClaimPosition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AccuracyReport` ADD CONSTRAINT `AccuracyReport_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `Site`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AccuracyReport` ADD CONSTRAINT `AccuracyReport_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `Claim`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
