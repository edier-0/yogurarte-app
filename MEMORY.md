# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.4.0) y `AGENTS.md` actualizados:
  - Directiva Git: aislamiento en ramas dedicadas, cero merges locales a ramas base, integración vía PR.
  - Protocolo de consultas: preguntar antes de abrir PR y antes de fusionarlo (salvo instrucción explícita de ejecutar todo).
  - El agente crea y fusiona el PR; confirmación obligatoria para eliminar ramas (local/remoto).
  - Presentaciones dinámicas en Fase B, salidas exclusivas en Fase B y alerta de fidelización 10+1.
- Spec 010 completada (T1 a T6), fusionada en `develop` y `main`.
- Spec 011 completada (T1 a T5): optimización build Docker. Contenedores en estado `healthy`.
- Rama activa: `fix/docker-build-optimization`.

## Decisiones (y por qué)
- Flujo Git gobernado por PR: nunca fusionar feature branches localmente en `develop` o `main`; el PR remoto garantiza trazabilidad, CI y orden.
- Consultas de PR: el agente crea y fusiona los PRs previa aprobación del usuario en cada paso (abrir y fusionar), evitando ejecuciones no autorizadas salvo mandato expreso.
- Salvaguarda permanente de ramas: jamás borrar ramas sin consentimiento explícito.
- Dockerfile Lean con artefactos locales: empaqueta `dist/`, `public/` y `node_modules` precompilados; `docker compose up --build` pasa de >30 min a ~15s evitando cuelgues de red WSL2.
- Eliminación de `sharp` de overrides: dependencia C++ huérfana de 35MB que congelaba la descarga.
- Entrypoint sin `db push` forzado: evita bloqueos de runtime; migraciones vía host o variable `RUN_MIGRATIONS=true`.

## Aprendizajes y errores a evitar
- No hacer merge manual local de ramas temáticas a develop/main.
- Siempre preguntar antes de abrir PR, antes de fusionar y antes de borrar ramas.
- No ejecutar `npm ci` masivo dentro de WSL2 si hay inestabilidad de red en Hyper-V.
- Asegurar `binaryTargets` en Prisma para `linux-musl-openssl-3.0.x`.

## Próximos pasos
- Solicitar aprobación del usuario para abrir PR de `fix/docker-build-optimization` contra `develop`.
