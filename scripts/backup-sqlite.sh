#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${RG_CARD_DB_PATH:-${DB_PATH:-$PROJECT_DIR/prisma/dev.db}}"
BACKUP_DIR="${BACKUP_DIR:-${RG_CARD_DATA_DIR:-$PROJECT_DIR}/backups}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/rg-card-$STAMP.db"
find "$BACKUP_DIR" -type f -name 'rg-card-*.db' -mtime +14 -delete
printf 'Backup created: %s\n' "$BACKUP_DIR/rg-card-$STAMP.db"
