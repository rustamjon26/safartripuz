-- Support live chat (hotel / homestay / taxi / guide / customer ↔ agent)

CREATE TABLE `SupportThread` (
    `id` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `partyType` ENUM('hotel', 'homestay', 'taxi', 'guide', 'customer') NOT NULL,
    `partyUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `lastMessageAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportThread_status_lastMessageAt_idx`(`status`, `lastMessageAt`),
    INDEX `SupportThread_partyUserId_status_idx`(`partyUserId`, `status`),
    INDEX `SupportThread_partyType_status_idx`(`partyType`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportThreadMember` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('AGENT', 'PARTY') NOT NULL,
    `lastReadAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportThreadMember_userId_idx`(`userId`),
    UNIQUE INDEX `SupportThreadMember_threadId_userId_key`(`threadId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SupportMessage` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportMessage_threadId_createdAt_idx`(`threadId`, `createdAt`),
    INDEX `SupportMessage_authorUserId_idx`(`authorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SupportThread` ADD CONSTRAINT `SupportThread_partyUserId_fkey` FOREIGN KEY (`partyUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SupportThreadMember` ADD CONSTRAINT `SupportThreadMember_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `SupportThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SupportThreadMember` ADD CONSTRAINT `SupportThreadMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `SupportThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SupportMessage` ADD CONSTRAINT `SupportMessage_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
