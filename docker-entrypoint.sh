#!/bin/sh
set -e

# Solo ejecutar prisma db push si se solicita explícitamente mediante RUN_MIGRATIONS=true
if [ "$RUN_MIGRATIONS" = "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "🚀 [YogurArte Entrypoint] Sincronizando esquema de base de datos..."
  ./node_modules/.bin/prisma db push --skip-generate || echo "⚠️ [YogurArte Entrypoint] prisma db push falló. Continuando arranque..."
fi

echo "🥛 [YogurArte Entrypoint] Iniciando servidor de producción..."
exec "$@"
