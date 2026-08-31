-- AuditLog and RefreshToken are both read "everything for this user", but neither
-- index was declared. RefreshToken only had the implicit InnoDB FK index, which
-- disappears if the FK is ever reshaped; AuditLog had nothing usable for the
-- admin audit screen, which also orders by createdAt.

-- CreateIndex
CREATE INDEX `AuditLog_actorId_createdAt_idx` ON `AuditLog`(`actorId`, `createdAt`);

-- RenameIndex (adopt the implicit FK index instead of adding a duplicate)
ALTER TABLE `RefreshToken` RENAME INDEX `RefreshToken_userId_fkey` TO `RefreshToken_userId_idx`;
