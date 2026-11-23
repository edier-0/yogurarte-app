# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Rama actual: `chore/integrate-agent-core`.
- Estructura de arnés `agent-core` organizada limpiamente en `.agent/` con cero basura en raíz.
- Blindado protocolo multiagente nativo en `AGENTS.md` y `coordinator.md`: uso obligatorio de `update_steps`, invocación de subagentes reales con `invoke_subagent` y pausas de confirmación por tarea atómica.
- Corregido desbordamiento de botón "Registrar Lote" en `BatchesView.vue` con `flex-wrap` y etiqueta corta responsive en móvil (`sm:hidden`).
- Integrado el enlace a `Libro de Recetas (SOP)` (`/produccion/recetario`) en el menú drawer móvil `MobileMenuDrawer.vue` bajo *Planta & Producción*.
- Certificación completa por subagente `@reviewer` bajo Chrome DevTools MCP en viewports 375×812 y 320×640 (0 desbordamientos, navegación funcional).
- Verificación técnica: `vue-tsc --noEmit && vite build` (0 errores) y Vitest (37/37 tests en verde contra `yogurarte_test` local).

## Decisiones (y por qué)
- Tabs adaptativas con grid móvil y texto abreviado: en lugar de forzar scroll horizontal en tiras cortas (3 tabs), en pantallas móviles se distribuyen equitativamente ocupando 100% del ancho sin desborde.
- Auditoría profunda por boundingClientRect: la verificación responsive no puede depender únicamente de `document.documentElement.scrollWidth` porque los contenedores con `overflow: hidden` enmascaran desbordes internos; se auditan rects de cada elemento contra `window.innerWidth`.
- Base de datos local de test `yogurarte_test`: provisionada en PostgreSQL local respetando el triple blindaje que prohíbe tocar Neon/AWS.

## Próximos pasos
- Continuar con el siguiente requerimiento, módulo o mejora del sistema según indique el usuario.
