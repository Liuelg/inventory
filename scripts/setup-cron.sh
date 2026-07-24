#!/bin/bash
# Setup automated weekly MongoDB backups via cron.
# Run this once on the Ubuntu production server after cloning the repo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup.sh"
LOG_FILE="$PROJECT_DIR/backups/backup.log"

# Default: Sunday at 2:00 AM
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * 0}"

echo "========================================"
echo " Backup Cron Setup"
echo "========================================"
echo "Project dir:  $PROJECT_DIR"
echo "Backup script: $BACKUP_SCRIPT"
echo "Log file:     $LOG_FILE"
echo "Schedule:     $CRON_SCHEDULE  (weekly, Sunday 2:00 AM)"
echo ""

# Pre-flight checks
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "ERROR: Backup script not found: $BACKUP_SCRIPT" >&2
    exit 1
fi

if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed" >&2
    exit 1
fi

if ! command -v rclone &>/dev/null; then
    echo "ERROR: rclone is not installed" >&2
    exit 1
fi

if ! rclone listremotes | grep -q "gdrive:"; then
    echo "ERROR: rclone remote 'gdrive:' is not configured" >&2
    echo "       Run: rclone config" >&2
    exit 1
fi

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Build the cron line
CRON_LINE="$CRON_SCHEDULE $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Remove any existing inventory backup cron jobs
crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab - || true

# Add the new cron job
(crontab -l 2>/dev/null || true; echo "$CRON_LINE") | crontab -

echo "Cron job installed successfully!"
echo ""
crontab -l | grep "$BACKUP_SCRIPT"
echo ""
echo "To verify the backup works, run it manually now:"
echo "  $BACKUP_SCRIPT"
echo ""
echo "To change the schedule, edit the CRON_SCHEDULE variable and re-run this script:"
echo "  CRON_SCHEDULE='0 3 * * *' ./scripts/setup-cron.sh   # daily at 3 AM"
