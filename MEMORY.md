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
- Integrada puerta obligatoria de verificación de CI en GitHub Actions antes de solicitar o abrir PR:
  - `.github/workflows/ci.yml` configurado para ejecutar CI en push sobre todas las ramas (`feature/**`, `fix/**`, `chore/**`, `refactor/**`, `docs/**`).
  - Documentado en `AGENTS.md` y `.agent/skills/git-pr-workflow/SKILL.md` el paso obligatorio de esperar 100% de checks en verde antes de solicitar apertura de PR, con bucle de notificación, plan de causa raíz, corrección TDD y re-monitoreo ante cualquier fallo.
- PR #41 fusionado exitosamente en `develop` y sincronizado a `main`.
- Rama actual: `develop`.

## Decisiones (y por qué)
- Puerta obligatoria de CI Pre-PR: garantiza que ningún PR se proponga o abra con tests o builds rotos en GitHub Actions; el agente corrige y reintenta sucesivamente en la rama temática hasta tener 100% verde.
- `SearchableSelect.vue` estándar obligatorio: optimiza la UX al escribir con sugerencias en tiempo real y badges de stock en lugar de selects nativos rígidos.
- Triple blindaje (Vitest config + setup global + PrismaClient): previene que tests apunten a `NEON_DATABASE_URL`.
- Desenrollado seguro en `fetchMaterials`: maneja tanto arrays planos devueltos por `http.get` como payloads con paginación (`data` / `items`).

## Próximos pasos
- Continuar con el siguiente requerimiento, módulo o mejora del sistema según indique el usuario.
