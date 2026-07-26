-- Manual down: drop payment hardening + minimal ledger tables.

ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_accountId_fkey`;
ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_transactionId_fkey`;
DROP TABLE IF EXISTS `LedgerEntry`;
DROP TABLE IF EXISTS `LedgerTransaction`;
DROP TABLE IF EXISTS `LedgerAccount`;
DROP TABLE IF EXISTS `WebhookLog`;
DROP TABLE IF EXISTS `ProcessedEvent`;
DROP TABLE IF EXISTS `PaymentTransaction`;
