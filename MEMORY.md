# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico en Fase B e insumos compuestos.
- Spec 013 (`specs/013-flexibilidad-integral-presentaciones/`): 100% implementada, probada e integrada.
- Rama actual: `docs/actualizar-readme-despliegue-estado` con actualización completa del `README.md`.
- `README.md` actualizado: guía exhaustiva de despliegue local (Inner Loop con PostgreSQL vs Docker Compose Outer Loop vs Node nativo), despliegue remoto en Render + Neon DB, variables de entorno, arquitectura modular canónica (`src/modules/`) y estado productivo actual con 253 tests en Vitest.
- Quality Gates en verde: `tsc --noEmit` (0 errores) y `vitest` (253 tests pasando).

## Decisiones (y por qué)
- Documentación integral en `README.md`:
  1. Se actualizó el árbol de arquitectura reflejando la estructura canónica de `src/modules/<dominio>/` en lugar de las carpetas legacy.
  2. Se detallaron las 3 opciones de despliegue local: Inner Loop (desarrollo rápido con HMR y Postgres en Docker), Outer Loop (Docker Compose con imagen multi-stage) y ejecución nativa en producción (`npm run build && npm start`).
  3. Se documentó la arquitectura remota en Render PaaS + Neon Serverless PostgreSQL, flujo de CI/CD con GitHub Actions y variables de entorno requeridas.
  4. Se incorporaron los principios vigentes de rendimiento volumétrico (Constitución Art. 5.6), flexibilidad multi-presentación (Spec 013) y fidelización 10+1 con bloqueo preventivo de cartera.
- Git PR Workflow: Rama dedicada `docs/actualizar-readme-despliegue-estado`.

## Aprendizajes y errores a evitar
- El README canónico debe ser la fuente de verdad técnica para despliegues tanto de desarrolladores como de infraestructura en la nube.
- Recordar siempre solicitar confirmación antes de abrir PR, antes de fusionarlo y antes de eliminar ramas.

## Próximos pasos
- Comitear cambios, publicar rama al remoto y solicitar autorización al usuario para abrir el Pull Request hacia `develop`.
