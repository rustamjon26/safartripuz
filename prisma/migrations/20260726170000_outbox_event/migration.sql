-- Transactional outbox. Do not apply to prod without approval.

CREATE TABLE `OutboxEvent` (
    `id` VARCHAR(191) NOT NULL,
    `aggregateType` VARCHAR(191) NOT NULL,
    `aggregateId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INT NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    INDEX `OutboxEvent_status_availableAt_idx`(`status`, `availableAt`),
    INDEX `OutboxEvent_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    INDEX `OutboxEvent_eventType_status_idx`(`eventType`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OutboxProcessedKey` (
    `id` VARCHAR(191) NOT NULL,
    `consumer` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `OutboxProcessedKey_consumer_key_key`(`consumer`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
