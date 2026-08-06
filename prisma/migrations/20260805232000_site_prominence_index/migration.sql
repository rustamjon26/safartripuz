-- Pre-existing drift, found by the new CI drift check. The composite index
-- `@@index([regionCode, status, prominence])` landed in schema.prisma alongside
-- 20260731170000_site_prominence but never got its SQL, so every
-- `migrate deploy`-only environment is missing it.
--
-- Guarded because an environment that was brought up with `prisma db push` will
-- already have the index, and this migration must not abort its deploy.
SET @site_idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'Site'
    AND index_name = 'Site_regionCode_status_prominence_idx'
);
SET @site_idx_sql := IF(
  @site_idx_exists = 0,
  'CREATE INDEX `Site_regionCode_status_prominence_idx` ON `Site`(`regionCode`, `status`, `prominence`)',
  'SELECT 1'
);
PREPARE site_idx_stmt FROM @site_idx_sql;
EXECUTE site_idx_stmt;
DEALLOCATE PREPARE site_idx_stmt;
