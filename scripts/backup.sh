#!/bin/bash
# Daily MySQL backup for SafarTrip. Exit non-zero on ANY failure.
# Env: DATABASE_URL or MYSQL_* ; BACKUP_DIR ; BACKUP_OFFSITE_CMD (REQUIRED)
# Retention: 7 daily + 4 weekly (Sunday) kept under BACKUP_DIR.
#
# Records DUMP_TS (MySQL NOW(6) BEFORE mysqldump) in a sidecar so restore-test
# can compare counts at the consistent --single-transaction snapshot boundary
# without racing live traffic after the dump starts.
#
# BACKUP_OFFSITE_CMD must copy OUT_DAILY (and ideally OUT_META) off the VPS.
# Example:
#   export BACKUP_OFFSITE_CMD='scp "$OUT_DAILY" "$OUT_META" backup@otherhost:/backups/'
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/safartrip}"
STAMP="$(date +%F_%H%M%S)"
DAY="$(date +%F)"
DOW="$(date +%u)" # 1=Mon … 7=Sun
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

if [[ -n "${DATABASE_URL:-}" ]]; then
  # mysql://user:pass@host:port/db
  proto_removed="${DATABASE_URL#mysql://}"
  creds="${proto_removed%%@*}"
  hostportdb="${proto_removed#*@}"
  MYSQL_USER="${creds%%:*}"
  MYSQL_PASSWORD="${creds#*:}"
  hostport="${hostportdb%%/*}"
  MYSQL_DATABASE="${hostportdb#*/}"
  MYSQL_HOST="${hostport%%:*}"
  MYSQL_PORT="${hostport##*:}"
  if [[ "$MYSQL_HOST" == "$MYSQL_PORT" ]]; then MYSQL_PORT=3306; fi
fi

: "${MYSQL_USER:?Set MYSQL_USER or DATABASE_URL}"
: "${MYSQL_DATABASE:?Set MYSQL_DATABASE or DATABASE_URL}"
: "${BACKUP_OFFSITE_CMD:?Set BACKUP_OFFSITE_CMD — off-site copy is mandatory (scp/rclone/b2). Local-only backup is not enough.}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

OUT_DAILY="$BACKUP_DIR/daily/safartrip-${DAY}.sql.gz"
OUT_META="$BACKUP_DIR/daily/safartrip-${DAY}.meta"
OUT_TMP="$BACKUP_DIR/daily/.safartrip-${STAMP}.tmp.sql.gz"
export OUT_DAILY OUT_META

export MYSQL_PWD="${MYSQL_PASSWORD:-}"

mysql_q() {
  mysql -N -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "$*"
}

# Snapshot boundary BEFORE dump — matches --single-transaction consistency point intent
DUMP_TS="$(mysql_q "SELECT DATE_FORMAT(NOW(6), '%Y-%m-%d %H:%i:%s.%f');")"
if [[ -z "$DUMP_TS" ]]; then
  echo "[backup] FAIL: could not read DUMP_TS from MySQL" >&2
  exit 1
fi
export DUMP_TS
echo "[backup] DUMP_TS=${DUMP_TS}"

echo "[backup] dumping ${MYSQL_DATABASE}@${MYSQL_HOST}:${MYSQL_PORT} → ${OUT_DAILY}"
mysqldump --single-transaction --routines --triggers \
  -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" \
  "$MYSQL_DATABASE" | gzip > "$OUT_TMP"

SIZE="$(stat -c%s "$OUT_TMP" 2>/dev/null || stat -f%z "$OUT_TMP")"
if [[ "${SIZE:-0}" -lt 1000 ]]; then
  echo "[backup] FAIL: dump too small (${SIZE} bytes)" >&2
  rm -f "$OUT_TMP"
  exit 1
fi

mv -f "$OUT_TMP" "$OUT_DAILY"

# Sidecar: dump timestamp + sizes for restore-test (deterministic as-of compare)
{
  echo "DUMP_TS=${DUMP_TS}"
  echo "DATABASE=${MYSQL_DATABASE}"
  echo "SIZE_BYTES=${SIZE}"
  echo "CREATED_AT_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT_META"

if [[ "$DOW" == "7" ]]; then
  cp -f "$OUT_DAILY" "$BACKUP_DIR/weekly/safartrip-week-${DAY}.sql.gz"
  cp -f "$OUT_META" "$BACKUP_DIR/weekly/safartrip-week-${DAY}.meta"
fi

# Retention: 7 daily, 4 weekly (gzip + meta)
ls -1t "$BACKUP_DIR/daily"/safartrip-*.sql.gz 2>/dev/null | tail -n +8 | while read -r f; do
  rm -f "$f" "${f%.sql.gz}.meta"
done
ls -1t "$BACKUP_DIR/weekly"/safartrip-week-*.sql.gz 2>/dev/null | tail -n +5 | while read -r f; do
  rm -f "$f" "${f%.sql.gz}.meta"
done

echo "[backup] off-site (required): $BACKUP_OFFSITE_CMD"
# shellcheck disable=SC2086
eval $BACKUP_OFFSITE_CMD
echo "[backup] off-site OK"

echo "[backup] OK size=${SIZE} path=${OUT_DAILY} meta=${OUT_META}"
unset MYSQL_PWD
