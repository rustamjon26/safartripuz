-- Guide bookings blocked their slot the moment they were created and had no
-- TTL, so an abandoned checkout held the slot until the tour date passed — and
-- only if a guide happened to open their bookings page. Give them the same
-- 15-minute hold hotel and homestay already use.

ALTER TABLE `GuideBooking` ADD COLUMN `holdExpiresAt` DATETIME(3) NULL;

CREATE INDEX `GuideBooking_status_holdExpiresAt_idx`
  ON `GuideBooking`(`status`, `holdExpiresAt`);
