$backupDir = "backups"
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir/backup_yogurarte_$timestamp.sql"
Write-Host "📦 [YogurArte] Generando Copia de Seguridad..." -ForegroundColor Cyan
docker exec yogurarte_postgres pg_dump -U postgres -d yogurarte_db --clean --if-exists | Out-File -FilePath $backupFile -Encoding utf8
if ($LASTEXITCODE -eq 0 -or (Test-Path $backupFile)) {
    Write-Host "✅ [OK] Copia creada exitosamente en: $backupFile" -ForegroundColor Green
} else {
    Write-Host "❌ [ERROR] Fallo al generar respaldo" -ForegroundColor Red
}
