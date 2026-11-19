# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 015 completadas y sincronizadas en `main` y `develop`.
- Triple Blindaje Permanente activo contra ejecuciones de tests sobre Neon/AWS en `vitest.config.ts`, `tests/setup.ts` y `src/prisma.ts`.
- Base de datos de producción (Neon) limpia y auditada: 11 insumos reales legítimos y 4 recetas maestras canónicas.
- Resuelto bug de selects vacíos en `RecipeFormModal.vue`:
  - `http.get` ya desenrolla `res.data`; se corrigió la asignación de `materials.value` para soportar arreglo directo o estructuras envueltas.
  - Migrados todos los selectores de insumo compuesto y materias primas al componente predictivo `SearchableSelect.vue`.
  - Establecido en `AGENTS.md` el estándar obligatorio de usar `SearchableSelect.vue` para selectores de catálogo.
- PR #40 fusionado exitosamente en `develop` y sincronizado a `main`.
- Rama actual: `develop`.

## Decisiones (y por qué)
- `SearchableSelect.vue` estándar obligatorio: optimiza la UX al escribir con sugerencias en tiempo real y badges de stock en lugar de selects nativos rígidos.
- Triple blindaje (Vitest config + setup global + PrismaClient): previene que tests apunten a `NEON_DATABASE_URL`.
- Desenrollado seguro en `fetchMaterials`: maneja tanto arrays planos devueltos por `http.get` como payloads con paginación (`data` / `items`).

## Próximos pasos
- Continuar con el siguiente requerimiento o especificación según indique el usuario.
