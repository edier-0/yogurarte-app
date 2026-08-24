@echo off
setlocal
if not exist "backups" mkdir backups
for /f %%I in ('powershell -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TIMESTAMP=%%I
set BACKUP_FILE=backups\backup_yogurarte_%TIMESTAMP%.sql
echo [YogurArte] Generando Copia de Seguridad...
docker exec yogurarte_postgres pg_dump -U postgres -d yogurarte_db --clean --if-exists > "%BACKUP_FILE%"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Copia creada exitosamente en: %BACKUP_FILE%
) else (
    echo [ERROR] Fallo al generar respaldo.
)
