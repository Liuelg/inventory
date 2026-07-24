# MongoDB Backup Script for Windows
# Backs up the inventory database from Docker, compresses it, and uploads to Google Drive via rclone.
# Keeps only the last N backups (retention policy).

param(
    [string]$Container = "inventory-mongo",
    [string]$DbName = "inventory_db",
    [string]$BackupDir = "$PSScriptRoot\..\backups",
    [string]$RcloneRemote = "gdrive:InventoryBackups",
    [int]$RetentionCount = 12
)

$ErrorActionPreference = "Stop"

$dateStr = Get-Date -Format "yyyy-MM-dd"
$dumpName = "mongodump-$dateStr"
$archiveName = "inventory-backup-$dateStr.tar.gz"
$stagingDir = "/var/backups"

# Use native Windows tar if available (avoids Git Bash tar path issues)
$nativeTar = "C:\Windows\System32\tar.exe"
if (Test-Path $nativeTar) {
    $tarCmd = $nativeTar
} else {
    $tarCmd = "tar"
}

Write-Host "========================================"
Write-Host " MongoDB Backup to Google Drive"
Write-Host "========================================"
Write-Host "Date:       $dateStr"
Write-Host "Container:  $Container"
Write-Host "DB:         $DbName"
Write-Host "Remote:     $RcloneRemote"
Write-Host ""

# Ensure backup directory exists
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# 1. Ensure staging directory exists inside container
Write-Host "[1/7] Creating staging directory inside container..."
docker exec $Container mkdir -p $stagingDir

# 2. mongodump inside Docker container
Write-Host "[2/7] Running mongodump inside container '$Container'..."
docker exec $Container mongodump --db=$DbName --out=$stagingDir/$dumpName
if ($LASTEXITCODE -ne 0) {
    Write-Error "mongodump failed with exit code $LASTEXITCODE"
}

# 3. Copy dump from container to host
Write-Host "[3/7] Copying dump from container to host..."
docker cp "${Container}:$stagingDir/$dumpName" "$BackupDir\$dumpName"
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker cp failed with exit code $LASTEXITCODE"
}

# 4. Compress the dump
Write-Host "[4/7] Compressing backup to '$archiveName'..."
& $tarCmd -czf "$BackupDir\$archiveName" -C "$BackupDir" "$dumpName"
if ($LASTEXITCODE -ne 0) {
    Write-Error "tar compression failed with exit code $LASTEXITCODE"
}

# 5. Upload to Google Drive via rclone
Write-Host "[5/7] Uploading to Google Drive..."
rclone copy "$BackupDir\$archiveName" $RcloneRemote
if ($LASTEXITCODE -ne 0) {
    Write-Error "rclone upload failed with exit code $LASTEXITCODE"
}

# 6. Clean up local and container temp files
Write-Host "[6/7] Cleaning up temporary files..."
docker exec $Container rm -rf $stagingDir/$dumpName
Remove-Item -Recurse -Force "$BackupDir\$dumpName" -ErrorAction SilentlyContinue
Remove-Item -Force "$BackupDir\$archiveName" -ErrorAction SilentlyContinue

# 7. Retention policy — keep only the last N backups
Write-Host "[7/7] Applying retention policy (keep last $RetentionCount backups)..."
# Use cmd /c to suppress rclone NOTICE stderr cleanly
$allFiles = cmd /c "rclone lsf `"$RcloneRemote`" --format `"p`" 2>nul"
$backupFiles = $allFiles | Where-Object { $_ -match "^inventory-backup-.*\.tar\.gz$" } | Sort-Object
$count = $backupFiles.Count

if ($count -gt $RetentionCount) {
    $toDelete = $count - $RetentionCount
    Write-Host "       Found $count backups. Deleting $toDelete old backup(s)..."
    for ($i = 0; $i -lt $toDelete; $i++) {
        $file = $backupFiles[$i]
        Write-Host "       - Deleting: $file"
        cmd /c "rclone delete `"$RcloneRemote/$file`" 2>nul"
    }
}
else {
    Write-Host "       Found $count backup(s). Nothing to delete."
}

Write-Host ""
Write-Host "========================================"
Write-Host " Backup completed successfully!"
Write-Host " File: $archiveName"
Write-Host " Remote: $RcloneRemote"
Write-Host "========================================"
