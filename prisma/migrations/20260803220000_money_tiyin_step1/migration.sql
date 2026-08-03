-- Tiyin migration step 1: Payment / HotelPayment / FolioItem
-- New BigInt tiyin columns, backfilled from Decimal som (1 som = 100 tiyin).
-- Old Decimal columns stay until all read paths migrate (dual-write phase).

ALTER TABLE `Payment` ADD COLUMN `amountTiyin` BIGINT NULL;
UPDATE `Payment` SET `amountTiyin` = CAST(ROUND(`amount` * 100) AS SIGNED);

ALTER TABLE `HotelPayment` ADD COLUMN `amountTiyin` BIGINT NULL;
UPDATE `HotelPayment` SET `amountTiyin` = CAST(ROUND(`amount` * 100) AS SIGNED);

ALTER TABLE `FolioItem` ADD COLUMN `amountTiyin` BIGINT NULL;
UPDATE `FolioItem` SET `amountTiyin` = CAST(ROUND(`amount` * 100) AS SIGNED);
