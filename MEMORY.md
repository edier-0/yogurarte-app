# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 015 completadas y sincronizadas en `main` y `develop`.
- Calidad en verde: `tsc` y build de frontend exitosos sin errores.
- Incidente de contaminación en BD de producción (Neon) resuelto al 100%:
  - Diagnóstico forense exacto con snapshot PITR (14:45 UTC).
  - Eliminados: 1 pedido test (`TEST-ORD-1795101756351`), 1 lote test (`LOTE-20261119-01`), 6 insumos test residuales (`TEST_*`, `LECHE_TEST`, `TAPA`).
  - Restaurados valores pre-incidente en 5 insumos reales (`LECHE`, `BOTELLA_1L`, `BOTELLA_2L`, `ETIQUETA`, `ETIQUETA_1L`).
  - 16 insumos reales y 4 recetas maestras canónicas de Spec 015 auditadas y 100% íntegras.
- Triple Blindaje Permanente implementado contra ejecuciones en producción:
  - `vitest.config.ts`, `tests/setup.ts` y `src/prisma.ts` abortan de inmediato cualquier intento de test contra Neon/AWS.
  - Regla canónica registrada en `AGENTS.md` y `.agent/skills/devsecops/SKILL.md`.
- Rama actual: `fix/prevent-prod-db-pollution`.

## Decisiones (y por qué)
- Triple blindaje (Vitest config + setup global + PrismaClient): evita que un test apunte accidentalmente a `NEON_DATABASE_URL` al correr vitest en local.
- Uso de PITR snapshots de Neon: garantiza recuperación quirúrgica pre-incidente sin tocar entidades creadas legítimamente (como las recetas maestras).

## Próximos pasos
- Abrir Pull Request de `fix/prevent-prod-db-pollution` hacia `develop` tras confirmación del usuario.
