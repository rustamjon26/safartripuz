-- Tiyin migration step 2: booking / travel-plan / driver-earning totals.
-- Decimal som columns stay until every read path uses the BigInt columns.

ALTER TABLE `HotelBooking` ADD COLUMN `totalAmountTiyin` BIGINT NULL;
ALTER TABLE `HotelBooking` ADD COLUMN `paidAmountTiyin` BIGINT NULL;
UPDATE `HotelBooking`
SET `totalAmountTiyin` = CAST(ROUND(`totalAmount` * 100) AS SIGNED),
    `paidAmountTiyin` = CAST(ROUND(`paidAmount` * 100) AS SIGNED);

ALTER TABLE `TravelPlan` ADD COLUMN `totalAmountTiyin` BIGINT NULL;
UPDATE `TravelPlan`
SET `totalAmountTiyin` = CAST(ROUND(`totalAmount` * 100) AS SIGNED);

ALTER TABLE `GuideBooking` ADD COLUMN `hourlyRateTiyin` BIGINT NULL;
ALTER TABLE `GuideBooking` ADD COLUMN `totalPriceTiyin` BIGINT NULL;
UPDATE `GuideBooking`
SET `hourlyRateTiyin` = CAST(ROUND(`hourlyRate` * 100) AS SIGNED),
    `totalPriceTiyin` = CAST(ROUND(`totalPrice` * 100) AS SIGNED);

ALTER TABLE `HomeStayBooking` ADD COLUMN `totalPriceTiyin` BIGINT NULL;
UPDATE `HomeStayBooking`
SET `totalPriceTiyin` = CAST(ROUND(`totalPrice` * 100) AS SIGNED);

ALTER TABLE `DriverEarning` ADD COLUMN `grossTiyin` BIGINT NULL;
ALTER TABLE `DriverEarning` ADD COLUMN `platformFeeTiyin` BIGINT NULL;
ALTER TABLE `DriverEarning` ADD COLUMN `netTiyin` BIGINT NULL;
UPDATE `DriverEarning`
SET `grossTiyin` = CAST(ROUND(`grossAmount` * 100) AS SIGNED),
    `platformFeeTiyin` = CAST(ROUND(`platformFee` * 100) AS SIGNED),
    `netTiyin` = CAST(ROUND(`netAmount` * 100) AS SIGNED);
