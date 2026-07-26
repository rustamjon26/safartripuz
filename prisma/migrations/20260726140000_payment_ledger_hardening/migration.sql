-- Payment hardening + minimal ledger (additive). Do not apply to prod without approval.

CREATE TABLE `PaymentTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `amountTiyin` BIGINT NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `status` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `travelPlanId` VARCHAR(191) NULL,
    `legacyPaymentId` VARCHAR(191) NULL,
    `externalRef` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `PaymentTransaction_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PaymentTransaction_provider_externalRef_idx`(`provider`, `externalRef`),
    INDEX `PaymentTransaction_legacyPaymentId_idx`(`legacyPaymentId`),
    INDEX `PaymentTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProcessedEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerEventId` VARCHAR(191) NOT NULL,
    `payloadHash` VARCHAR(191) NOT NULL,
    `responseJson` JSON NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ProcessedEvent_provider_providerEventId_key`(`provider`, `providerEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WebhookLog` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `headers` JSON NOT NULL,
    `rawBody` LONGTEXT NOT NULL,
    `verified` BOOLEAN NULL,
    `resultNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `WebhookLog_provider_createdAt_idx`(`provider`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LedgerAccount` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('ASSET', 'LIABILITY', 'REVENUE', 'EQUITY') NOT NULL,
    `ownerType` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'UZS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `LedgerAccount_ownerType_ownerId_type_currency_key`(`ownerType`, `ownerId`, `type`, `currency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LedgerTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `reversesTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `LedgerTransaction_idempotencyKey_key`(`idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `amount` BIGINT NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `LedgerEntry_accountId_idx`(`accountId`),
    INDEX `LedgerEntry_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `LedgerAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
