-- Rate limit counters lived in process memory: every PM2 process kept its own,
-- and each deploy reset them to zero. Move them to a shared table.

CREATE TABLE `RateLimit` (
    `id` VARCHAR(191) NOT NULL,
    `bucketKey` VARCHAR(191) NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RateLimit_bucketKey_windowStart_key`(`bucketKey`, `windowStart`),
    INDEX `RateLimit_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
