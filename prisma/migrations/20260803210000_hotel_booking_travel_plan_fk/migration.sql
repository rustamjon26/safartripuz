-- Real FK linkage HotelBooking → TravelPlan (replaces `note contains` matching)
ALTER TABLE `HotelBooking` ADD COLUMN `travelPlanId` VARCHAR(191) NULL;

-- Backfill from legacy note format: "TravelPlan: <id>"
UPDATE `HotelBooking` hb
JOIN `TravelPlan` tp ON tp.`id` = TRIM(SUBSTRING(hb.`note`, 12))
SET hb.`travelPlanId` = tp.`id`
WHERE hb.`note` LIKE 'TravelPlan:%';

CREATE INDEX `HotelBooking_travelPlanId_idx` ON `HotelBooking`(`travelPlanId`);

ALTER TABLE `HotelBooking`
  ADD CONSTRAINT `HotelBooking_travelPlanId_fkey`
  FOREIGN KEY (`travelPlanId`) REFERENCES `TravelPlan`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
