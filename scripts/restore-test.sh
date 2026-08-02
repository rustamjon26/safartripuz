#!/bin/bash
# Restore latest daily backup into a scratch DB and run deterministic checks.
#
# Compares prod vs restore using DUMP_TS from the sidecar written by backup.sh
# (MySQL NOW(6) taken BEFORE mysqldump). Live rows created after DUMP_TS are
# excluded — no flaky race with traffic after the snapshot.
#
# Checks:
#   - sidecar DUMP_TS present
#   - HotelBooking / LedgerEntry / PartnerEarning COUNTs WHERE createdAt <= DUMP_TS match
#   - MAX(createdAt) on HotelBooking (as-of DUMP_TS) matches
#   - DUMP_TS itself is fresh (≤ MAX_STALE_HOURS, default 36)
# Env: DATABASE_URL or MYSQL_*; BACKUP_DIR; SCRATCH_DB; MAX_STALE_HOURS
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/safartrip}"
SCRATCH_DB="${SCRATCH_DB:-restore_test}"
MAX_STALE_HOURS="${MAX_STALE_HOURS:-36}"

if [[ -n "${DATABASE_URL:-}" ]]; then
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
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
export MYSQL_PWD="${MYSQL_PASSWORD:-}"

mysql_q() {
  local db="$1"
  shift
  mysql -N -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$db" -e "$*"
}

table_exists() {
  local db="$1"
  local table="$2"
  local n
  n="$(mysql_q "$db" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${db}' AND table_name='${table}';")"
  [[ "$n" -ge 1 ]]
}

LATEST="$(ls -1t "$BACKUP_DIR/daily"/safartrip-*.sql.gz 2>/dev/null | head -n1 || true)"
if [[ -z "$LATEST" ]]; then
  echo "[restore-test] FAIL: no backup in $BACKUP_DIR/daily" >&2
  exit 1
fi

META="${LATEST%.sql.gz}.meta"
if [[ ! -f "$META" ]]; then
  echo "[restore-test] FAIL: missing sidecar $META (re-run backup.sh — needs DUMP_TS)" >&2
  exit 1
fi

# shellcheck disable=SC1090
DUMP_TS="$(grep '^DUMP_TS=' "$META" | head -n1 | cut -d= -f2-)"
if [[ -z "$DUMP_TS" ]]; then
  echo "[restore-test] FAIL: DUMP_TS empty in $META" >&2
  exit 1
fi

echo "[restore-test] using $LATEST"
echo "[restore-test] DUMP_TS=${DUMP_TS} (as-of compare; post-dump traffic excluded)"

mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -e "DROP DATABASE IF EXISTS \`${SCRATCH_DB}\`; CREATE DATABASE \`${SCRATCH_DB}\`;"
gunzip -c "$LATEST" | mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$SCRATCH_DB"

FAIL=0

for t in HotelBooking LedgerEntry PartnerEarning; do
  if ! table_exists "$MYSQL_DATABASE" "$t"; then
    echo "[restore-test] FAIL: prod missing table $t" >&2
    FAIL=1
  fi
  if ! table_exists "$SCRATCH_DB" "$t"; then
    echo "[restore-test] FAIL: restore missing table $t" >&2
    FAIL=1
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -e "DROP DATABASE IF EXISTS \`${SCRATCH_DB}\`;" || true
  unset MYSQL_PWD
  exit 1
fi

# Escape single quotes for SQL literal
sql_ts="${DUMP_TS//\'/\'\'}"

count_asof() {
  local db="$1"
  local table="$2"
  mysql_q "$db" "SELECT COUNT(*) FROM \`${table}\` WHERE createdAt <= '${sql_ts}';"
}

max_booking_asof() {
  local db="$1"
  mysql_q "$db" "SELECT COALESCE(DATE_FORMAT(MAX(createdAt), '%Y-%m-%d %H:%i:%s.%f'),'') FROM HotelBooking WHERE createdAt <= '${sql_ts}';"
}

prod_bookings="$(count_asof "$MYSQL_DATABASE" HotelBooking)"
prod_ledger="$(count_asof "$MYSQL_DATABASE" LedgerEntry)"
prod_earn="$(count_asof "$MYSQL_DATABASE" PartnerEarning)"
prod_latest="$(max_booking_asof "$MYSQL_DATABASE")"

rst_bookings="$(count_asof "$SCRATCH_DB" HotelBooking)"
rst_ledger="$(count_asof "$SCRATCH_DB" LedgerEntry)"
rst_earn="$(count_asof "$SCRATCH_DB" PartnerEarning)"
rst_latest="$(max_booking_asof "$SCRATCH_DB")"

echo "[restore-test] prod@DUMP_TS    bookings=${prod_bookings} ledger=${prod_ledger} earnings=${prod_earn} latest=${prod_latest}"
echo "[restore-test] scratch@DUMP_TS bookings=${rst_bookings} ledger=${rst_ledger} earnings=${rst_earn} latest=${rst_latest}"

if [[ "$rst_bookings" != "$prod_bookings" ]]; then
  echo "[restore-test] FAIL: HotelBooking COUNT mismatch at DUMP_TS (scratch=${rst_bookings} prod=${prod_bookings})" >&2
  FAIL=1
fi
if [[ "$rst_ledger" != "$prod_ledger" ]]; then
  echo "[restore-test] FAIL: LedgerEntry COUNT mismatch at DUMP_TS (scratch=${rst_ledger} prod=${prod_ledger})" >&2
  FAIL=1
fi
if [[ "$rst_earn" != "$prod_earn" ]]; then
  echo "[restore-test] FAIL: PartnerEarning COUNT mismatch at DUMP_TS (scratch=${rst_earn} prod=${prod_earn})" >&2
  FAIL=1
fi
if [[ "$rst_latest" != "$prod_latest" ]]; then
  echo "[restore-test] FAIL: HotelBooking MAX(createdAt) mismatch at DUMP_TS (scratch=${rst_latest} prod=${prod_latest})" >&2
  FAIL=1
fi

# Freshness of the dump boundary itself (not "live now vs week-old rows that still have COUNT>0")
age_hours="$(mysql_q "$MYSQL_DATABASE" "SELECT TIMESTAMPDIFF(HOUR, '${sql_ts}', NOW());")"
echo "[restore-test] DUMP_TS age_hours=${age_hours} (max allowed ${MAX_STALE_HOURS})"
if [[ "$age_hours" =~ ^-?[0-9]+$ ]]; then
  if [[ "$age_hours" -lt 0 ]]; then
    echo "[restore-test] FAIL: DUMP_TS is in the future" >&2
    FAIL=1
  elif [[ "$age_hours" -gt "$MAX_STALE_HOURS" ]]; then
    echo "[restore-test] FAIL: dump too stale (DUMP_TS is ${age_hours}h old; need <= ${MAX_STALE_HOURS}h)" >&2
    FAIL=1
  fi
else
  echo "[restore-test] FAIL: could not compute DUMP_TS age" >&2
  FAIL=1
fi

if [[ "$prod_ledger" -eq 0 ]]; then
  echo "[restore-test] WARN: LedgerEntry COUNT@DUMP_TS=0 — confirm ledger migration applied" >&2
fi
if [[ "$prod_earn" -eq 0 ]]; then
  echo "[restore-test] WARN: PartnerEarning COUNT@DUMP_TS=0" >&2
fi

mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" -e "DROP DATABASE IF EXISTS \`${SCRATCH_DB}\`;"
unset MYSQL_PWD

if [[ "$FAIL" -ne 0 ]]; then
  echo "[restore-test] FAIL — do not treat as restore passed" >&2
  exit 1
fi
echo "[restore-test] PASS — as-of DUMP_TS counts match; dump fresh; LedgerEntry+PartnerEarning present"
