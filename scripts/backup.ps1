param(
  [string]$BackupDirectory = "$env:USERPROFILE\clinic-backups"
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force $BackupDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $BackupDirectory "cskclinic-$timestamp.dump"

if (-not $env:DATABASE_URL) {
  throw 'DATABASE_URL is required.'
}

pg_dump --format=custom --file="$file" "$env:DATABASE_URL"
Write-Host "Backup created: $file"
