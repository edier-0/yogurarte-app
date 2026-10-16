#!/bin/sh
set -e

echo "🚀 [YogurArte Entrypoint] Sincronizando migraciones de base de datos..."
if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --skip-generate || echo "⚠️ [YogurArte Entrypoint] prisma db push falló. Continuando arranque..."
else
  echo "⚠️ [YogurArte Entrypoint] DATABASE_URL no está definida. Saltando migrate deploy..."
fi

echo "🥛 [YogurArte Entrypoint] Iniciando servidor de producción..."
exec "$@"
