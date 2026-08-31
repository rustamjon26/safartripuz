-- Financial rows cascaded away with their parent: deleting one Hotel erased its
-- bookings, deleting a User erased partner earnings, and deleting a ledger
-- transaction erased its immutable entries. Block those deletes instead.

ALTER TABLE `HotelBooking` DROP FOREIGN KEY `HotelBooking_hotelId_fkey`;
ALTER TABLE `HotelBooking` ADD CONSTRAINT `HotelBooking_hotelId_fkey`
  FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PartnerEarning` DROP FOREIGN KEY `PartnerEarning_partnerId_fkey`;
ALTER TABLE `PartnerEarning` ADD CONSTRAINT `PartnerEarning_partnerId_fkey`
  FOREIGN KEY (`partnerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_transactionId_fkey`;
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `LedgerTransaction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
