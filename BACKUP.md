# MongoDB Backup Guide

This folder contains automated backup scripts that dump the `inventory_db` MongoDB database, compress it, and upload it to **Google Drive** via `rclone`.

---

## Architecture

```
MongoDB (Docker container: inventory-mongo)
      |
      v
mongodump  -->  /backups/mongodump-YYYY-MM-DD  (shared volume)
      |
      v
tar.gz compression on host
      |
      v
rclone copy  -->  gdrive:InventoryBackups
      |
      v
Retention policy (keep last 12 backups)
```

> On Linux production, `docker-compose.prod.yml` mounts `./backups:/backups`, so the dump is immediately available on the host without `docker cp`.

---

## Prerequisites

| Tool | Status | Check Command |
|------|--------|---------------|
| **Docker** | Required | `docker ps` |
| **rclone** | Required | `rclone version` |
| **Google Drive remote** | Required | `rclone listremotes` should show `gdrive:` |
| **tar** | Required | `tar --version` |

> **Note:** `mongodump` runs **inside** the MongoDB Docker container, so you do **not** need MongoDB Database Tools installed on the host.

---

## Files

| File | Purpose |
|------|---------|
| `scripts/backup.bat` | Windows wrapper — double-click to run |
| `scripts/backup.ps1` | Windows PowerShell backup script (core logic) |
| `scripts/backup.sh` | Linux / production server backup script |
| `scripts/setup-cron.sh` | One-click cron installer for Ubuntu production servers |
| `backups/` | Temporary local folder for dumps (ignored by Git) |

---

## Quick Start (Windows)

1. **Ensure your Docker container is running:**
   ```powershell
   docker ps
   # Should show: inventory-mongo
   ```

2. **Run the backup:**
   - Double-click `scripts/backup.bat`, **or**
   - From PowerShell:
     ```powershell
     cd scripts
     .\backup.ps1
     ```

3. **Verify on Google Drive:**
   - Open your Google Drive `InventoryBackups` folder.
   - You should see: `inventory-backup-YYYY-MM-DD.tar.gz`

---

## Quick Start (Linux / Production)

1. **Make scripts executable:**
   ```bash
   chmod +x scripts/backup.sh scripts/setup-cron.sh
   ```

2. **Install the automated cron job (one-time setup):**
   ```bash
   ./scripts/setup-cron.sh
   ```
   This automatically adds a weekly cron job (Sundays at 2:00 AM) and verifies `rclone` is configured.

3. **Run a manual backup (optional test):**
   ```bash
   ./scripts/backup.sh
   ```

4. **Verify the cron job:**
   ```bash
   crontab -l
   ```

### Manual cron setup (if you prefer)

If you don't want to use `setup-cron.sh`, edit crontab directly:
```bash
crontab -e
```
Add:
```cron
0 2 * * 0 /home/deployer/inventory-app/scripts/backup.sh >> /home/deployer/inventory-app/backups/backup.log 2>&1
```

---

## Configuration

All scripts use sensible defaults. You can override them via environment variables (Linux) or parameters (PowerShell).

### PowerShell Parameters

```powershell
.\backup.ps1 `
  -Container "inventory-mongo" `
  -DbName "inventory_db" `
  -BackupDir "C:\backups" `
  -RcloneRemote "gdrive:InventoryBackups" `
  -RetentionCount 12
```

### Linux Environment Variables

```bash
export CONTAINER="inventory-mongo"
export DB_NAME="inventory_db"
export BACKUP_DIR="/opt/backups"
export RCLONE_REMOTE="gdrive:InventoryBackups"
export RETENTION_COUNT=12
./scripts/backup.sh
```

---

## Retention Policy

By default, the scripts **keep the last 12 backups** and automatically delete older ones from Google Drive.

- Filenames are sorted alphabetically (`inventory-backup-YYYY-MM-DD.tar.gz`).
- The oldest backups are deleted first.
- **Local temp files are always cleaned up**, regardless of retention.

To change the retention count, pass a different value (e.g., `24` for ~6 months of weekly backups).

---

## Windows Task Scheduler (Automated Weekly Backup)

1. Open **Task Scheduler** (`taskschd.msc`).
2. Click **Create Basic Task**.
3. Name: `Weekly MongoDB Backup`
4. Trigger: **Weekly** → Every **Sunday** at **2:00 AM**
5. Action: **Start a program**
   - Program: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
   - Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\path\to\inventory-app\scripts\backup.ps1"`
6. Finish and ensure the task is **Enabled**.

---

## Restoring a Backup

1. **Download the backup from Google Drive** (or use `rclone copy`).
2. **Extract it:**
   ```bash
   tar -xzf inventory-backup-YYYY-MM-DD.tar.gz
   ```
3. **Restore into MongoDB:**
   ```bash
   docker exec -i inventory-mongo mongorestore --db=inventory_db --drop mongodump-YYYY-MM-DD/inventory_db
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `inventory-mongo` container not found | Check `docker ps`. If the name differs, pass `-Container` (PS) or `export CONTAINER=...` (bash). |
| `rclone` upload fails | Run `rclone lsd gdrive:` to verify the remote is configured. |
| `tar` not found on Windows | Use Windows 10/11 (has built-in tar), or install Git Bash / 7-Zip and update the script. |
| Permission denied on Linux | Run `chmod +x scripts/backup.sh`. |
| Backups not deleting | Check that filenames match the pattern `inventory-backup-*.tar.gz`. |

---

## Security Recommendations

1. **Use a dedicated Google account** for backups (not your personal one).
2. **Encrypt sensitive backups** before upload if required:
   ```bash
   gpg --symmetric --cipher-algo AES256 inventory-backup-YYYY-MM-DD.tar.gz
   ```
3. **Store DB credentials securely** — the script uses Docker exec, so no credentials are exposed on the host.
4. **Test restores monthly** to ensure backups are valid.
