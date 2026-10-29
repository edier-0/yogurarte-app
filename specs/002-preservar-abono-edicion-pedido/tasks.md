# Tareas de Implementación — Spec 002: Preservación de Abono en Edición de Pedidos

- [x] **T1. Crear función pura `resolveOrderPaidAmount` y sus pruebas unitarias.** RF-1, RF-4
  - Hecho cuando: la función extraiga correctamente el abono acumulado desde `paidAmount`, `totalPaid` o `payments`, responda `0` ante valores vacíos/nulos, y sus pruebas unitarias pasen en verde.

- [x] **T2. Integrar la inicialización del abono en `OrderFormModal.vue`.** RF-1, RF-2, RF-3, RF-4
  - Hecho cuando: al editar un pedido existente (`orderToEdit`), el campo "Abono Inicial" muestre el valor real del abono, el saldo pendiente se calcule de inmediato y al guardar no se reinicie a cero.

- [x] **T3. Blindar pruebas de integración en `tests/orders.test.ts` para preservación de abono.** RF-2, RF-5
  - Hecho cuando: se ejecute `npx vitest run tests/orders.test.ts` con una aserción que compruebe que al editar notas u otros campos de un pedido con abono, `paidAmount` y `pendingAmount` se preserven intactos.

- [x] **T4. Validación global de tipos y empaquetado frontend.** RF-1, RF-2, RF-3, RF-4, RF-5
  - Hecho cuando: `npx tsc --noEmit` y `npm --prefix frontend run build` compilen con código de salida 0 sin errores de TypeScript ni variables sin usar.
