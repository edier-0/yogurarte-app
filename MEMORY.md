# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Rama actual: `chore/integrate-agent-core`.
- Estructura de arnés `agent-core` organizada limpiamente en `.agent/` (`agents/`, `workflows/`, `skills/`, `templates/`, `mcp/`, `docs/`) con cero basura en raíz.
- Datos de producción en Neon sincronizados a Postgres local (`localhost:5432/yogurarte_db`, 34 modelos y secuencias íntegras).
- Auditoría exhaustiva y corrección responsive con Chrome DevTools MCP en viewports de 320px a 375px:
  - Eliminado desbordamiento horizontal en tabs de Inventario, Lotes, Personal, Gastos y Recetario con soporte responsive (`sm:hidden` / `sm:inline`) y ajuste perfecto (336px <= 338px).
  - Optimizado el libro de recetas (`RecipesView.vue`), modal de ficha técnica (`RecipeDetailModal.vue`) y modal de formulación (`RecipeFormModal.vue`) para móviles.
  - Mitigado desbordamiento en tarjetas de insumos con `min-w-0`, `flex-wrap` y truncamiento inteligente de código y nombres largos.
  - Verificado con scanner DOM profundo: 0 desbordamientos en todo el aplicativo.
- Verificación técnica: `vue-tsc --noEmit && vite build` (0 errores) y Vitest (37/37 tests en verde contra `yogurarte_test` local).

## Decisiones (y por qué)
- Tabs adaptativas con grid móvil y texto abreviado: en lugar de forzar scroll horizontal en tiras cortas (3 tabs), en pantallas móviles se distribuyen equitativamente ocupando 100% del ancho sin desborde.
- Auditoría profunda por boundingClientRect: la verificación responsive no puede depender únicamente de `document.documentElement.scrollWidth` porque los contenedores con `overflow: hidden` enmascaran desbordes internos; se auditan rects de cada elemento contra `window.innerWidth`.
- Base de datos local de test `yogurarte_test`: provisionada en PostgreSQL local respetando el triple blindaje que prohíbe tocar Neon/AWS.

## Próximos pasos
- Continuar con el siguiente requerimiento, módulo o mejora del sistema según indique el usuario.
