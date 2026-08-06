#!/bin/bash
# Fail if prisma/migrations does not reproduce prisma/schema.prisma.
#
# Catches the failure mode where a schema change is applied with `prisma db push`
# locally: it works for the author forever, and silently never reaches any
# environment deployed with `migrate deploy` (which is all of them).
#
# Usage:
#   SHADOW_DATABASE_URL=mysql://root:pass@127.0.0.1:3307/safartrip_shadow \
#   SHADOW_ADMIN_URL=mysql://root:pass@127.0.0.1:3307/safartrip_test \
#     bash scripts/check-migration-drift.sh
#
# SHADOW_ADMIN_URL only supplies credentials that may CREATE/DROP a database; it
# defaults to DATABASE_URL and is never modified. Prisma refuses to connect to
# the `mysql` system database, hence the separate handle.
#
# The shadow database is DROPPED AND RECREATED on every run — never point it at
# a database holding data.

set -euo pipefail

: "${SHADOW_DATABASE_URL:?SHADOW_DATABASE_URL is required}"
ADMIN_URL="${SHADOW_ADMIN_URL:-${DATABASE_URL:?SHADOW_ADMIN_URL or DATABASE_URL is required}}"

# mysql://user:pass@host:port/<name>[?params]
SHADOW_NAME="${SHADOW_DATABASE_URL##*/}"
SHADOW_NAME="${SHADOW_NAME%%\?*}"

if [[ -z "$SHADOW_NAME" ]]; then
  echo "SHADOW_DATABASE_URL must end in a database name" >&2
  exit 2
fi

if [[ "$ADMIN_URL" == *"/${SHADOW_NAME}" || "$ADMIN_URL" == *"/${SHADOW_NAME}?"* ]]; then
  echo "SHADOW_ADMIN_URL must not point at the shadow database itself" >&2
  exit 2
fi

echo "==> Resetting shadow database ${SHADOW_NAME}..."
echo "DROP DATABASE IF EXISTS \`${SHADOW_NAME}\`;" \
  | npx prisma db execute --url "$ADMIN_URL" --stdin
echo "CREATE DATABASE \`${SHADOW_NAME}\`;" \
  | npx prisma db execute --url "$ADMIN_URL" --stdin

echo "==> Diffing prisma/migrations against prisma/schema.prisma..."
DRIFT_SQL="$(mktemp)"
STATUS=0
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --exit-code --script > "$DRIFT_SQL" || STATUS=$?

case "$STATUS" in
  0)
    echo "==> No drift."
    ;;
  2)
    echo "==> DRIFT: prisma/migrations does not produce prisma/schema.prisma." >&2
    echo "    Generate the missing migration (never \`db push\`):" >&2
    echo "      npx prisma migrate dev --name <change>" >&2
    echo "    Missing statements:" >&2
    cat "$DRIFT_SQL" >&2
    exit 1
    ;;
  *)
    echo "==> migrate diff failed (exit ${STATUS})." >&2
    cat "$DRIFT_SQL" >&2
    exit "$STATUS"
    ;;
esac
