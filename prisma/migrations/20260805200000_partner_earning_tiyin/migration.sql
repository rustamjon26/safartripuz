-- Finish the float→tiyin migration for the partner subledger.
--
-- PartnerEarning stored som in Decimal(12,2) while the ledger it must reconcile
-- against stores tiyin BigInt, so every write went through a som round-trip.
-- Decimal*100 is exact in MySQL (not float), so the backfill is lossless.

ALTER TABLE `PartnerEarning`
  ADD COLUMN `grossTiyin` BIGINT NULL,
  ADD COLUMN `commissionFeeTiyin` BIGINT NULL,
  ADD COLUMN `netTiyin` BIGINT NULL;

UPDATE `PartnerEarning`
SET `grossTiyin` = CAST(ROUND(`grossAmount` * 100) AS SIGNED),
    `commissionFeeTiyin` = CAST(ROUND(`commissionFee` * 100) AS SIGNED),
    `netTiyin` = CAST(ROUND(`netAmount` * 100) AS SIGNED);

ALTER TABLE `PartnerEarning`
  MODIFY `grossTiyin` BIGINT NOT NULL,
  MODIFY `commissionFeeTiyin` BIGINT NOT NULL,
  MODIFY `netTiyin` BIGINT NOT NULL;

ALTER TABLE `PartnerEarning`
  DROP COLUMN `grossAmount`,
  DROP COLUMN `commissionFee`,
  DROP COLUMN `netAmount`;

-- Rates are parsed as integer percent everywhere (asRatePercent truncates), so
-- Decimal(5,2) only ever held whole numbers.
ALTER TABLE `PartnerEarning` MODIFY `commissionRate` INT NOT NULL;

-- Payment.amountTiyin was nullable while the som Decimal stayed authoritative.
-- Backfill the stragglers, then make the tiyin column the required source.
UPDATE `Payment`
SET `amountTiyin` = CAST(ROUND(`amount` * 100) AS SIGNED)
WHERE `amountTiyin` IS NULL;

ALTER TABLE `Payment` MODIFY `amountTiyin` BIGINT NOT NULL;
