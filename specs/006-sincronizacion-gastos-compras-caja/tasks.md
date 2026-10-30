# Tareas — Spec 006: Unificación Canónica de Insumos (`INSUMOS_EXTRA`), Sincronización de Gastos/Compras y Blindaje de Caja

- [x] **T1. Tests primero: Pruebas de integración para normalización canónica, sincronización y no duplicación.** RF-1, RF-2, RF-5, RF-6
  - Hecho cuando: Se agreguen tests en `tests/expenses.test.ts` validando la normalización forzada de `"🥛 Compra Insumo"` a `INSUMOS_EXTRA`, la sincronización de `paymentMethod` hacia `Purchase` y la ausencia de duplicados en `cashFlow.outflows`; los tests deben fallar inicialmente (en rojo).

- [x] **T2. Backend: Implementar helper `normalizeExpenseCategory`, saneamiento en creación/edición y sincronización atómica con `Purchase`.** RF-1, RF-2, RF-5
  - Hecho cuando: `createExpense` y `updateExpense` en `src/modules/finance/finance.service.ts` conviertan cualquier categoría visual a `INSUMOS_EXTRA`, y al editar un gasto de insumos se actualice el `paymentMethod`, `supplier` y `totalCost` de la compra en `Purchase` dentro de `$transaction`.

- [x] **T3. Backend: Preservar categoría canónica en flujo de caja y blindar detector `periodUnexpensedPurchases`.** RF-1, RF-3, RF-6, RF-7
  - Hecho cuando: En `detailedBreakdowns.cashFlow.outflows` se erradique la asignación de `'COMPRA_INSUMO'`, retornando la categoría real de base de datos (`INSUMOS_EXTRA`), y `periodUnexpensedPurchases` nunca clasifique como huérfana una compra que ya posea un gasto asentado.

- [x] **T4. Frontend: Erradicar `COMPRA_INSUMO` en `finance.store.ts` y sanitizar `CashView.vue` y `ExpenseFormModal.vue`.** RF-1, RF-4
  - Hecho cuando: `finance.store.ts` unifique egresos bajo `INSUMOS_EXTRA`, `openEditExpense` en `CashView.vue` asigne de forma limpia la categoría canónica al formulario, y el selector de `ExpenseFormModal.vue` mantenga seleccionada la opción correcta sin propagar textos decorativos.

- [x] **T5. Validación integral, Typecheck y Build de producción.** RNF-1, RNF-2, RNF-3
  - Hecho cuando: La suite completa de pruebas unitarias (`npx vitest run tests/expenses.test.ts`), la verificación de tipos (`npx tsc --noEmit`) y el empaquetado del cliente (`npm --prefix frontend run build`) se ejecuten al 100% en verde sin errores.
