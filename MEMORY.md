# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico por adición de mermeladas en Fase B y elaboraciones compuestas de inventario.
- Spec 011 y Spec 012 completadas al 100% y fusionadas en develop y main.
- Pull Request #31 fusionado exitosamente en `develop` y sincronizado a producción (`main`).
- Despliegue de Render y pipeline de GitHub Actions corregidos: Dockerfile 100% autónomo y aislado sin dependencias de directorios del host (`node_modules`), sin cache mounts propensos a deadlocks en WSL2 y con flags de aceleración `--no-audit --no-fund`.
- Local: PostgreSQL healthy en Docker (`docker compose up -d postgres`), typecheck (tsc), build de frontend y suite completa de Vitest (39/39 integración + 12/12 golden master) en verde.

## Decisiones (y por qué)
- Mono-presentación por fraccionamiento de Fase B: cada lote de Fase B (BatchPackaging) se envasa en un solo formato activo para simplificar costos unitarios, trazabilidad y empaque.
- Rendimiento volumétrico por mermeladas (Constitución Art. 5.6): base láctea fija, rendimiento comercial > 100%.
- Dockerfile Multi-Stage 100% Autónomo:
  - Eliminado todo intento de `COPY node_modules/...` que provocaba `lstat /node_modules: no such file or directory` en clones limpios de Git en Render y CI.
  - Eliminados los `--mount=type=cache` en `/root/.npm` y `/root/.cache/prisma` que causaban bloqueos por locks huérfanos al interrumpir builds en Windows WSL2.
  - Añadidos flags `--no-audit --no-fund --legacy-peer-deps` y `npm prune --omit=dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund` para resiliencia y aceleración drástica de la compilación.
  - `.dockerignore`: exclusión limpia de `node_modules`, `dist`, `frontend/node_modules`, `frontend/dist`.
- Flujo local recomendado: `docker compose up -d postgres` para DB y `npm run dev` + `npm run dev:client` para ciclo rápido (inner loop); build de imagen Docker reservado para validación de empaquetado y producción (outer loop).

## Aprendizajes y errores a evitar
- NUNCA usar cadenas de conexión reales como fallback en scripts o pruebas; requerir variables en `.env`.
- No asumir que `node_modules` existe en el contexto de Docker en clones limpios de Render o CI.
- En Docker Desktop (WSL2), los `--mount=type=cache` compartidos pueden corromperse tras cancelaciones forzadas (`docker builder prune -f` para sanear).
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.

## Próximos pasos
- Solicitar autorización al usuario para eliminar la rama de trabajo `fix/render-docker-build-clean-context` (local y remota).
