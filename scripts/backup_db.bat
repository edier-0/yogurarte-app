@echo off
setlocal enabledelayedexpansion
if not exist "backups" mkdir backups
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=backups\backup_yogurarte_%TIMESTAMP%.sql
echo [YogurArte] Generando Copia de Seguridad...
docker exec yogurarte_postgres pg_dump -U postgres -d yogurarte_db --clean --if-exists > "%BACKUP_FILE%"
if %ERRORLEVEL% EQU 0 (
    echo [OK] Copia creada exitosamente: %BACKUP_FILE%
) else (
    echo [ERROR] Fallo al generar respaldo.
)
