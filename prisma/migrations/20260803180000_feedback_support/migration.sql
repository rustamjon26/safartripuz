-- AlterEnum: add support role
ALTER TABLE `User` MODIFY `role` ENUM(
  'super_admin',
  'admin',
  'user',
  'taxi',
  'taxi_partner',
  'hotel_manager',
  'guide',
  'restaurant_manager',
  'home_stay_partner',
  'support'
) NOT NULL DEFAULT 'user';

-- CreateEnum (MySQL inline on columns)
-- CreateTable FeedbackTicket
CREATE TABLE `FeedbackTicket` (
    `id` VARCHAR(191) NOT NULL,
    `channel` ENUM('hotel', 'guide', 'taxi', 'homestay', 'direct') NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NULL,
    `authorName` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `serviceLabel` VARCHAR(191) NULL,
    `subjectId` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'ANSWERED', 'ESCALATED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `sentiment` ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE') NOT NULL,
    `category` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `repliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeedbackTicket_sourceType_sourceId_key`(`sourceType`, `sourceId`),
    INDEX `FeedbackTicket_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `FeedbackTicket_channel_rating_idx`(`channel`, `rating`),
    INDEX `FeedbackTicket_sentiment_createdAt_idx`(`sentiment`, `createdAt`),
    INDEX `FeedbackTicket_assignedToId_idx`(`assignedToId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable FeedbackReply
CREATE TABLE `FeedbackReply` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackReply_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    INDEX `FeedbackReply_authorUserId_idx`(`authorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeedbackTicket` ADD CONSTRAINT `FeedbackTicket_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FeedbackReply` ADD CONSTRAINT `FeedbackReply_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `FeedbackTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FeedbackReply` ADD CONSTRAINT `FeedbackReply_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
