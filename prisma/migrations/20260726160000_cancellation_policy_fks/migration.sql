-- RoomType / HotelBooking cancellation policy snapshot FKs.
-- Do not apply to prod without approval.

ALTER TABLE `RoomType` ADD COLUMN `cancellationPolicyId` VARCHAR(191) NULL;
ALTER TABLE `HotelBooking` ADD COLUMN `cancellationPolicyId` VARCHAR(191) NULL;

CREATE INDEX `RoomType_cancellationPolicyId_idx` ON `RoomType`(`cancellationPolicyId`);
CREATE INDEX `HotelBooking_cancellationPolicyId_idx` ON `HotelBooking`(`cancellationPolicyId`);

ALTER TABLE `RoomType` ADD CONSTRAINT `RoomType_cancellationPolicyId_fkey`
  FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_cancellationPolicyId_fkey`
  FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
