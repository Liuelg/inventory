#!/bin/bash
# MongoDB Backup Script for Linux / Production Server
# Backs up the inventory database from Docker, compresses it, and uploads to Google Drive via rclone.
# Keeps only the last N backups (retention policy).
#
# Usage:
#   ./backup.sh                          # Run with defaults
#   BACKUP_DIR=/opt/backups ./backup.sh  # Override backup directory
#
# Cron example (weekly, Sunday 2:00 AM):
#   0 2 * * 0 /home/deployer/inventory-app/scripts/backup.sh >> /home/deployer/inventory-app/backups/backup.log 2>&1

set -euo pipefail

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
CONTAINER="${CONTAINER:-inventory-mongo}"
DB_NAME="${DB_NAME:-inventory_db}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:InventoryBackups}"
RETENTION_COUNT="${RETENTION_COUNT:-12}"

DATE_STR=$(date +%Y-%m-%d)
DUMP_NAME="mongodump-$DATE_STR"
ARCHIVE_NAME="inventory-backup-$DATE_STR.tar.gz"

# In production docker-compose.prod.yml mounts ./backups:/backups
STAGING_DIR="/backups"

# ------------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed or not in PATH" >&2
    exit 1
fi

if ! command -v rclone &>/dev/null; then
    echo "ERROR: rclone is not installed or not in PATH" >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "ERROR: Docker container '$CONTAINER' is not running" >&2
    exit 1
fi

# ------------------------------------------------------------------
# Backup workflow
# ------------------------------------------------------------------
echo "========================================"
echo " MongoDB Backup to Google Drive"
echo "========================================"
echo "Date:       $DATE_STR"
echo "Container:  $CONTAINER"
echo "DB:         $DB_NAME"
echo "Remote:     $RCLONE_REMOTE"
echo ""

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# 1. mongodump inside Docker container (writes directly to shared volume)
echo "[1/5] Running mongodump inside container '$CONTAINER'..."
docker exec "$CONTAINER" mongodump --db="$DB_NAME" --out="$STAGING_DIR/$DUMP_NAME"

# 2. Compress the dump (on host, reading from shared volume)
echo "[2/5] Compressing backup to '$ARCHIVE_NAME'..."
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_DIR" "$DUMP_NAME"

# 3. Upload to Google Drive via rclone
echo "[3/5] Uploading to Google Drive..."
rclone copy "$BACKUP_DIR/$ARCHIVE_NAME" "$RCLONE_REMOTE"

# 4. Clean up local and container temp files
echo "[4/5] Cleaning up temporary files..."
docker exec "$CONTAINER" rm -rf "$STAGING_DIR/$DUMP_NAME"
rm -f "$BACKUP_DIR/$ARCHIVE_NAME"

# 5. Retention policy — keep only the last N backups
echo "[5/5] Applying retention policy (keep last $RETENTION_COUNT backups)..."
mapfile -t FILES < <(rclone lsf "$RCLONE_REMOTE" --format "p" 2>/dev/null | grep -E '^inventory-backup-.*\.tar\.gz$' | sort)
COUNT=${#FILES[@]}

if [ "$COUNT" -gt "$RETENTION_COUNT" ]; then
    TO_DELETE=$((COUNT - RETENTION_COUNT))
    echo "       Found $COUNT backups. Deleting $TO_DELETE old backup(s)..."
    for ((i = 0; i < TO_DELETE; i++)); do
        FILE="${FILES[$i]}"
        echo "       - Deleting: $FILE"
        rclone delete "$RCLONE_REMOTE/$FILE"
    done
else
    echo "       Found $COUNT backup(s). Nothing to delete."
fi

echo ""
echo "========================================"
echo " Backup completed successfully!"
echo " File: $ARCHIVE_NAME"
echo " Remote: $RCLONE_REMOTE"
echo "========================================"
