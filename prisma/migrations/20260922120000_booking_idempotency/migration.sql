-- Retried booking creates replay the first response instead of inserting again.

CREATE TABLE `BookingIdempotencyKey` (
    `id` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `statusCode` INTEGER NULL,
    `responseJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BookingIdempotencyKey_scope_actorId_key_key`(`scope`, `actorId`, `key`),
    INDEX `BookingIdempotencyKey_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
