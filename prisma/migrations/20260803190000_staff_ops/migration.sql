-- AlterEnum: frontline staff roles
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
  'support',
  'cleaner',
  'receptionist',
  'waiter',
  'hotel_staff'
) NOT NULL DEFAULT 'user';

-- StaffShift
CREATE TABLE `StaffShift` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffShift_hotelId_startsAt_idx`(`hotelId`, `startsAt`),
    INDEX `StaffShift_staffId_startsAt_idx`(`staffId`, `startsAt`),
    INDEX `StaffShift_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- StaffOpsTask
CREATE TABLE `StaffOpsTask` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `department` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `dueAt` DATETIME(3) NULL,
    `housekeepingTaskId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffOpsTask_hotelId_status_idx`(`hotelId`, `status`),
    INDEX `StaffOpsTask_staffId_status_idx`(`staffId`, `status`),
    INDEX `StaffOpsTask_hotelId_dueAt_idx`(`hotelId`, `dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- StaffChatThread
CREATE TABLE `StaffChatThread` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('DEPARTMENT', 'DIRECT', 'ANNOUNCEMENT') NOT NULL DEFAULT 'DEPARTMENT',
    `department` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffChatThread_hotelId_kind_idx`(`hotelId`, `kind`),
    UNIQUE INDEX `StaffChatThread_hotelId_kind_department_key`(`hotelId`, `kind`, `department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffChatMember` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastReadAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StaffChatMember_threadId_userId_key`(`threadId`, `userId`),
    INDEX `StaffChatMember_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffChatMessage_threadId_createdAt_idx`(`threadId`, `createdAt`),
    INDEX `StaffChatMessage_authorUserId_idx`(`authorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Training
CREATE TABLE `StaffCourse` (
    `id` VARCHAR(191) NOT NULL,
    `hotelId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'STANDARDS',
    `durationMin` INTEGER NOT NULL DEFAULT 15,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StaffCourse_hotelId_isPublished_idx`(`hotelId`, `isPublished`),
    INDEX `StaffCourse_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffCourseModule` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `videoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StaffCourseModule_courseId_sortOrder_idx`(`courseId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffCourseEnrollment` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NULL,
    `progressPct` INTEGER NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffCourseEnrollment_courseId_userId_key`(`courseId`, `userId`),
    INDEX `StaffCourseEnrollment_userId_idx`(`userId`),
    INDEX `StaffCourseEnrollment_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffModuleProgress` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `StaffModuleProgress_enrollmentId_moduleId_key`(`enrollmentId`, `moduleId`),
    INDEX `StaffModuleProgress_moduleId_idx`(`moduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- FKs
ALTER TABLE `StaffShift` ADD CONSTRAINT `StaffShift_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffShift` ADD CONSTRAINT `StaffShift_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `HotelStaff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `StaffOpsTask` ADD CONSTRAINT `StaffOpsTask_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffOpsTask` ADD CONSTRAINT `StaffOpsTask_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `HotelStaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StaffOpsTask` ADD CONSTRAINT `StaffOpsTask_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `StaffChatThread` ADD CONSTRAINT `StaffChatThread_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffChatMember` ADD CONSTRAINT `StaffChatMember_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `StaffChatThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffChatMember` ADD CONSTRAINT `StaffChatMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffChatMessage` ADD CONSTRAINT `StaffChatMessage_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `StaffChatThread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffChatMessage` ADD CONSTRAINT `StaffChatMessage_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StaffCourse` ADD CONSTRAINT `StaffCourse_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffCourseModule` ADD CONSTRAINT `StaffCourseModule_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `StaffCourse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffCourseEnrollment` ADD CONSTRAINT `StaffCourseEnrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `StaffCourse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffCourseEnrollment` ADD CONSTRAINT `StaffCourseEnrollment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffCourseEnrollment` ADD CONSTRAINT `StaffCourseEnrollment_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `HotelStaff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StaffModuleProgress` ADD CONSTRAINT `StaffModuleProgress_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `StaffCourseEnrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffModuleProgress` ADD CONSTRAINT `StaffModuleProgress_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `StaffCourseModule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
