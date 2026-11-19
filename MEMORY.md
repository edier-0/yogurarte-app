# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 015 completadas y sincronizadas en `main` y `develop`.
- Calidad en verde: `tsc` y build de frontend exitosos sin errores.
- Incidente de contaminación en BD de producción (Neon) resuelto al 100%:
  - Eliminados: 1 pedido test, 1 lote test y 11 insumos de prueba/demo residuales (`TEST_*`, `LECHE_TEST`, `TAPA`, `AZUCAR`, `CULTIVO`, `TAPA_1L`, `ETIQUETA_1L`, `FRESA_FRUTA`).
  - Restaurados valores pre-incidente en insumos reales (`LECHE`, `BOTELLA_1L`, `BOTELLA_2L`, `ETIQUETA`).
  - Receta de Mermelada vinculada con insumos reales (`AZUCAR_DE_KILO_RIO_P` y `FRESA`).
  - Catálogo de producción auditado: exactamente los 11 insumos reales legítimos y 4 recetas maestras canónicas.
  - `prisma/seed.ts` alineado con los insumos reales para nunca recrear entidades ficticias.
- Triple Blindaje Permanente implementado contra ejecuciones en producción:
  - `vitest.config.ts`, `tests/setup.ts` y `src/prisma.ts` abortan de inmediato cualquier intento de test contra Neon/AWS.
  - Regla canónica registrada en `AGENTS.md` y `.agent/skills/devsecops/SKILL.md`.
- Rama actual: `fix/prevent-prod-db-pollution`.

## Decisiones (y por qué)
- Triple blindaje (Vitest config + setup global + PrismaClient): evita que un test apunte accidentalmente a `NEON_DATABASE_URL` al correr vitest en local.
- Uso de PITR snapshots de Neon: garantiza recuperación quirúrgica pre-incidente sin tocar entidades creadas legítimamente (como las recetas maestras).

## Próximos pasos
- Abrir Pull Request de `fix/prevent-prod-db-pollution` hacia `develop` tras confirmación del usuario.
