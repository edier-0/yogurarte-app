# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- Specs 001 a 014 completadas y sincronizadas en `main` y `develop`.
- Spec 015 (Libro de Recetas y Estandarización de Producción):
  - Fases 1 a 9 completadas al 100%:
    - Modelado Prisma (`Recipe`, `RecipeIngredient`, `RecipeStep`) y seed oficial sembrado.
    - Serializador RBAC y esquemas Zod con expansión volumétrica (`baseYield >= baseLiters`).
    - API canónica `/api/recipes` transaccional con cálculo dinámico y confidencialidad de costos.
    - Insumos editables in situ en preparaciones de inventario (`/api/inventory/materials/:id/prepare`).
    - Frontend: Catálogo `/produccion/recetario` (`RecipesView.vue`), Ficha Técnica (`RecipeDetailModal.vue`), Escalador reactivo (`RecipeScaler.vue`), Procedimiento SOP (`RecipeStepsList.vue`), Simulador de Rentabilidad (`RecipeProfitSimulator.vue`), Vista de Impresión (`RecipePrintView.vue`), Formulario Maestro (`RecipeFormModal.vue`).
    - Integración en planta: `PrepareCompoundModal.vue` con ajuste in situ y carga de recetas, y `PackagingModal.vue` / `BatchModal.vue` con precarga rápida.
    - 29/29 tests unitarios e integración en verde (`vitest`).
    - Compilación TypeScript y build Vite (`npm --prefix frontend run build`) 100% exitosos.
- Rama activa: `feature/recipe-book-sop`.

## Decisiones (y por qué)
- Desacoplamiento de sabor y presentación: evita triplicar recetas por tamaño.
- Insumos editables en preparación de compuestos: elimina la fricción operativa de reconfigurar recetas fijas en almacén cada vez que se cocina una cantidad distinta o con fruta real ajustada.
- Envase con tapa integrada: refleja la operación física real en Fonseca (sin gestión separada de tapas).
- Confidencialidad RBAC en backend: operarios de producción no reciben costos unitarios ni márgenes brutos.

## Próximos pasos
- Fase 10: Solicitar autorización al usuario para proceder con el flujo Git PR (`feature/recipe-book-sop` -> `develop` -> `main`).
