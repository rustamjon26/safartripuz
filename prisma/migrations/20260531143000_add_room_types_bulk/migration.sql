-- Bulk xona yaratish: RoomType jadvaliga amenities (qulayliklar) ustuni
ALTER TABLE `RoomType` ADD COLUMN `amenities` JSON NULL;

UPDATE `RoomType` SET `amenities` = JSON_ARRAY() WHERE `amenities` IS NULL;
