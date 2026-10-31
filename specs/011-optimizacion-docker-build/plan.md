# Plan 011 — Optimización del Build de Docker

## Archivos y responsabilidades
- `package.json`:
  - Asegurar script de build y eliminación del override huérfano de `sharp`.
- `.dockerignore`:
  - Permitir `dist/` y `node_modules/` en el contexto de Docker, excluyendo `.git`, `tests`, `specs`, `scratch`, `backups`, etc.
- `Dockerfile`:
  - Configurar imagen de etapa única basada en `node:20-alpine` que copie directamente los artefactos locales (`package*.json`, `prisma/`, `node_modules/`, `dist/`, `public/`, `docker-entrypoint.sh`).
- `MEMORY.md`:
  - Registrar la decisión arquitectónica del build con artefactos locales y la existencia de `binaryTargets` para Linux.

## Decisiones justificadas y alternativas descartadas
- **Alternativa A (Descarga en contenedor vía WSL2):** Se comprobó empíricamente que el adaptador virtual Hyper-V/WSL2 en Windows congela conexiones TCP en streaming masivo de paquetes npm, provocando timeouts repetidos de 10 a 30 minutos. Descartada por inestabilidad de la pila de red virtual.
- **Decisión adoptada (Empaquetado de artefactos locales):** `prisma/schema.prisma` ya genera el motor nativo `linux-musl-openssl-3.0.x` (`libquery_engine-linux-musl-openssl-3.0.x.so.node`). Todas las demás dependencias son JavaScript puro multiplataforma. Empaquetar directamente los artefactos ya compilados localmente garantiza una construcción de 5 a 10 segundos, cero fallos de red y reproducibilidad absoluta.

## Estrategia de validación
1. Compilar localmente con `npm run build` (genera `dist/`, `public/` y Prisma Client para Windows y Linux).
2. Modificar `.dockerignore` y `Dockerfile`.
3. Ejecutar `docker compose up --build -d`.
4. Verificar con `docker compose ps` que ambos contenedores estén `healthy`.
5. Probar con `curl` o `wget` que `http://localhost:3000/api/health` responda 200 OK.
