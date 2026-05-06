-- Run as MySQL superuser, e.g.:
--   sudo mysql < scripts/setup-mysql.sql
-- Or:  mysql -u root -p < scripts/setup-mysql.sql
--
-- Replace CHANGE_THIS_PASSWORD before running, or set via env + sed in CI.

CREATE DATABASE IF NOT EXISTS safartrip_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'safartrip_user'@'localhost'
  IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

GRANT ALL PRIVILEGES ON safartrip_prod.*
  TO 'safartrip_user'@'localhost';

FLUSH PRIVILEGES;

SHOW DATABASES;
SHOW GRANTS FOR 'safartrip_user'@'localhost';
