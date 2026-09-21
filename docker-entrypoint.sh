#!/bin/sh
set -e

echo "🚀 [YogurArte Entrypoint] Sincronizando migraciones de base de datos..."
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy || echo "⚠️ [YogurArte Entrypoint] prisma migrate deploy falló o no tiene nuevas migraciones. Continuando arranque..."
else
  echo "⚠️ [YogurArte Entrypoint] DATABASE_URL no está definida. Saltando migrate deploy..."
fi

echo "🥛 [YogurArte Entrypoint] Iniciando servidor de producción..."
exec "$@"
