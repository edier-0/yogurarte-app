# Tareas — Spec 005: Bloqueo de Entrega de Pedidos sin Lote y Gestión de Preventa

- [x] **T1. Tests primero: Pruebas de integración para bloqueo de entrega sin lote y desvinculación de preventa.** RF-1, RF-3, RF-4, RF-5
  - Hecho cuando: Se agreguen tests en `tests/orders.test.ts` validando el rechazo HTTP 400 al entregar pedidos con ítems en preventa, la persistencia de `batchId: null` en ítems, la actualización de `order.batchId: null`, y la no asignación de sabores cruzados; los tests deben fallar inicialmente (en rojo).

- [x] **T2. Backend: Implementar helper `hasUnassignedItems` y validación estricta de entrega en `updateDeliveryStatus` y `createOrder`.** RF-1, RF-7
  - Hecho cuando: Cualquier solicitud de cambiar un pedido a `DELIVERED` que tenga ítems sin lote o fracción asignada sea rechazada con `BadRequestError` (400), y `autoLinkOrderItemsToAvailableBatches` solo vincule coincidencias exactas de sabor sin permitir entregas huérfanas.

- [x] **T3. Backend: Corregir desvinculación en `updateOrder`, limpiar `order.batchId` a null y eliminar fallback de sabor cruzado.** RF-3, RF-4, RF-5, RF-6
  - Hecho cuando: Al editar un pedido enviando ítems con `batchId: null` y `packagingId: null` se persistan los valores nulos sin sobreescribir con el lote anterior, se limpie `order.batchId` si todos los ítems están en preventa, se elimine el fallback `matchingPkgs[0]`, y todos los tests de backend en `tests/orders.test.ts` queden en verde.

- [x] **T4. Frontend: Bloqueo reactivo y alerta visual en `DeliveryConfirmModal.vue`.** RF-2
  - Hecho cuando: El modal de confirmación rápida detecte si el pedido tiene ítems en preventa, muestre un banner explicativo detallando los sabores pendientes por lote, deshabilite el botón de confirmación de entrega y provea acceso para editar el pedido.

- [x] **T5. Frontend: Validación preventiva en `OrderFormModal.vue` y fila de `OrdersView.vue`.** RF-2, RF-3
  - Hecho cuando: `OrderFormModal.vue` alerte y rechace guardar como `DELIVERED` si hay ítems en preventa, y el cambio directo de estado en la fila de `OrdersView.vue` bloquee la entrega inmediata con una notificación toast clara.

- [x] **T6. Validación integral, Typecheck y Build de producción.** RNF-1, RNF-2, RNF-3
  - Hecho cuando: La suite completa de pruebas unitarias (`npx vitest run tests/orders.test.ts`), la verificación de tipos (`npx tsc --noEmit`) y el empaquetado del cliente (`npm --prefix frontend run build`) se ejecuten al 100% en verde sin errores.
