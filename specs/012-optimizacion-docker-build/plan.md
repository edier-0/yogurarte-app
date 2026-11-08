# Plan 012 — Optimización del Build de Docker y Compatibilidad CI/Local

## Archivos y responsabilidades
- `package.json`:
  - Eliminación del override huérfano de `sharp`.
- `.dockerignore`:
  - Excluir `node_modules` y `dist` de forma general, pero incluir `node_modules/.prisma` para acelerar el build en local.
- `Dockerfile`:
  - Configurar Dockerfile Multi-Stage con BuildKit cache mounts (`--mount=type=cache,target=/root/.npm`), flags de resiliencia (`--ignore-scripts`, `--legacy-peer-deps`), detección inteligente del motor nativo de Linux y poda limpia con `npm prune --omit=dev`.
- `MEMORY.md`:
  - Registrar la decisión arquitectónica del build Multi-Stage híbrido y la resolución de cuellos de botella de red.

## Decisiones justificadas y alternativas descartadas
- **Alternativa A (Descarga en contenedor estándar sin cache ni control de scripts):** Se comprobó empíricamente que el postinstall descontrolado de Prisma y la dependencia huérfana de `sharp` congelaban las conexiones en WSL2. Descartada.
- **Alternativa B (Empaquetado puro de artefactos locales sin compilación en contenedor):** Aunque rápida en local, fallaba en GitHub Actions porque `dist` y `node_modules` están en `.gitignore`. Descartada.
- **Decisión adoptada (Multi-Stage Híbrido Autónomo):** Compila de forma 100% autónoma en CI a partir del código fuente y, si se ejecuta en local, reutiliza el motor nativo de Linux ya generado en `.prisma`, evitando llamadas de red lentas.

## Estrategia de validación
1. Simular JOB 1 de GitHub Actions (`npm audit`, `npx prisma generate`, `npx tsc --noEmit`, `npm run build`, `vitest`).
2. Simular JOB 2 de GitHub Actions (`docker build -t yogurarte-app:ci .`).
3. Levantar contenedores con `docker compose up -d`.
4. Verificar con `docker compose ps` que ambos contenedores estén `healthy`.
5. Probar con `curl.exe` que `http://localhost:3000/api/health` responda 200 OK.
