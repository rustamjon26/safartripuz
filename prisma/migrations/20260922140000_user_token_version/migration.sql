-- Access tokens carry this integer. Block and role changes increment it so
-- a still-unexpired JWT no longer matches and the page shell closes immediately.

ALTER TABLE `User` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;
