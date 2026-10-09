#!/bin/sh
# RG-Card Railway startup script
# Keeps SQLite and uploads on the Railway Volume mounted at /data.
set -eu

DATA_DIR="${RG_CARD_DATA_DIR:-/data}"
DB_PATH="${RG_CARD_DB_PATH:-${DATA_DIR}/rg-card.db}"
UPLOADS_PATH="${RG_CARD_UPLOADS_PATH:-${DATA_DIR}/uploads}"
PUBLIC_UPLOADS_PATH="/app/public/uploads"
SEED_UPLOADS_PATH="/app/seed-uploads"

mkdir -p "${DATA_DIR}" "${UPLOADS_PATH}" "${DATA_DIR}/backups"

# Restore bundled legacy images only once if a seed directory exists and the
# persistent Volume does not yet contain uploads.
if [ -d "${SEED_UPLOADS_PATH}" ] && [ -z "$(find "${UPLOADS_PATH}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
  echo "[RG-Card] First launch: restoring bundled uploads into ${UPLOADS_PATH}"
  cp -a "${SEED_UPLOADS_PATH}/." "${UPLOADS_PATH}/" 2>/dev/null || true
fi

# Do not use a public/uploads symlink. Next.js indexes public files at server
# startup and will return 404 for images written later. /uploads/[...asset]
# serves the persistent Volume dynamically instead.
rm -rf "${PUBLIC_UPLOADS_PATH}"
echo "[RG-Card] Persistent uploads served dynamically from ${UPLOADS_PATH}"

export DATABASE_URL="${DATABASE_URL:-file:${DB_PATH}}"

if [ ! -f "${DB_PATH}" ]; then
  echo "[RG-Card] First launch: creating persistent SQLite database at ${DB_PATH}"
  npx prisma db push
  npm run db:seed
else
  echo "[RG-Card] Using persistent SQLite database at ${DB_PATH}"
  npx prisma db push
fi

exec npm run start
