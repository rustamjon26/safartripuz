-- Google login used to sign into any account matching the email, while signup
-- never verified email ownership. Track verification + the bound Google identity.

ALTER TABLE `User` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `googleId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `User_googleId_key` ON `User`(`googleId`);

-- Accounts created without a password only ever signed in through Google.
UPDATE `User` SET `emailVerifiedAt` = `createdAt` WHERE `password` = '';
