-- Booking ownership FK: guest-facing APIs matched bookings by guest name/phone,
-- which let same-named users read and cancel each other's bookings.

ALTER TABLE `HotelBooking` ADD COLUMN `userId` VARCHAR(191) NULL;

-- Backfill from the real TravelPlan link first (authoritative owner).
UPDATE `HotelBooking` hb
JOIN `TravelPlan` tp ON tp.`id` = hb.`travelPlanId`
SET hb.`userId` = tp.`userId`
WHERE hb.`userId` IS NULL;

-- Remaining SAFARTRIP rows: fall back to the unique User.phone match.
UPDATE `HotelBooking` hb
JOIN `User` u ON u.`phone` = hb.`guestPhone`
SET hb.`userId` = u.`id`
WHERE hb.`userId` IS NULL
  AND hb.`source` = 'SAFARTRIP'
  AND hb.`guestPhone` IS NOT NULL
  AND hb.`guestPhone` <> '';

CREATE INDEX `HotelBooking_userId_status_idx` ON `HotelBooking`(`userId`, `status`);

ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
