# Plan de Implementación — Spec 006: Unificación Canónica de Insumos (`INSUMOS_EXTRA`), Sincronización de Gastos/Compras y Blindaje de Caja

## 1. Resumen técnico y arquitectura
La solución consolida **`INSUMOS_EXTRA`** como la única categoría canónica en todo el stack tecnológico de YogurArte para compras y gastos de insumos y materia prima. Se erradica el alias virtual `COMPRA_INSUMO` del backend y frontend, y se implementa una sincronización bidireccional transaccional entre `Expense` y `Purchase`, impidiendo duplicaciones en el libro de caja y protegiendo la integridad del stock físico.

---

## 2. Archivos afectados y responsabilidades

| Archivo | Capa | Responsabilidad del cambio |
|---|---|---|
| `tests/expenses.test.ts` | Pruebas | Tests de integración (TDD): normalización a `INSUMOS_EXTRA`, sincronización bidireccional de `paymentMethod` y no duplicación en flujo de caja. |
| `src/modules/finance/finance.service.ts` | Backend | Función `normalizeExpenseCategory`, erradicación de `COMPRA_INSUMO`, preservación de `e.category` en `outflows`, sincronización atómica con `Purchase` en `updateExpense` y `deleteExpense`. |
| `frontend/src/stores/finance.store.ts` | Frontend (Store) | Reemplazar dependencias de `COMPRA_INSUMO` por `INSUMOS_EXTRA` en la unificación del flujo de caja. |
| `frontend/src/views/finance/CashView.vue` | Frontend (Vista) | Saneamiento en `openEditExpense` para asignar `INSUMOS_EXTRA` y no propagar etiquetas decorativas. |
| `frontend/src/components/finance/ExpenseFormModal.vue` | Frontend (Modal) | Asegurar que la categoría seleccionada por defecto para insumos sea `INSUMOS_EXTRA`. |

---

## 3. Decisiones de diseño y mitigación de riesgos

1. **Unificación definitiva en torno a `INSUMOS_EXTRA`**:
   - `INSUMOS_EXTRA` ya es la columna vertebral de la base de datos de producción (`prisma/schema.prisma`, `RawMaterial`, `PurchaseStockModal`). Mantenerla y eliminar `COMPRA_INSUMO` previene migraciones invasivas y normaliza el sistema de raíz.
2. **Helper de Sanitización `normalizeExpenseCategory` en Backend**:
   - Centraliza la conversión defensiva. Cualquier entrada como `"COMPRA_INSUMO"`, `"🥛 Compra Insumo"` o strings con prefijo de compra se traduce de inmediato a `INSUMOS_EXTRA`.
3. **Sincronización Bidireccional `Expense` $\leftrightarrow$ `Purchase` desacoplada del proveedor**:
   - Se elimina la condición restrictiva `supplier !== undefined` en `updateExpense`. Si el gasto es `INSUMOS_EXTRA` y se edita su método de pago, el cambio se propaga de inmediato al registro correspondiente en `Purchase` dentro de `prisma.$transaction`.
4. **Preservación de la categoría técnica en la API**:
   - `detailedBreakdowns.cashFlow.outflows` retornará `category: e.category` (`INSUMOS_EXTRA`), reservando la propiedad `categoryLabel` para la interfaz visual (`"🥛 Compra Insumo"` o `"Materia Prima / Insumos"`).

---

## 4. Estrategia de pruebas (Tests primero)
Siguiendo TDD estricto:
1. Escribir tests en `tests/expenses.test.ts` que validen:
   - Que `PUT /api/expenses/:id` con `category: "🥛 Compra Insumo"` responda 200 y persista en BD como `INSUMOS_EXTRA`.
   - Que `PUT /api/expenses/:id` actualizando `paymentMethod: 'NEQUI'` actualice en la misma transacción el `paymentMethod` de la compra en `Purchase`.
   - Que `GET /api/finance/dashboard/summary` retorne `category: 'INSUMOS_EXTRA'` en `outflows` y no duplique registros de compras que ya tienen un gasto asociado.
2. Verificar que los tests fallen antes de los cambios (en rojo).
3. Implementar las correcciones en backend y frontend hasta que todos los tests pasen (en verde).
4. Ejecutar la verificación completa: `npx vitest run tests/expenses.test.ts`, `npx tsc --noEmit` y `npm --prefix frontend run build`.
