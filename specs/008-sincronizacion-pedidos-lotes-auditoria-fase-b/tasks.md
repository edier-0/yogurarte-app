# Tareas — Spec 008: Sincronización Integral de Pedidos, Lotes y Auditoría de Fase B

- [x] **T1. Proyección de `packagingId` y relación `packaging` en consultas de pedidos.** RF-1
  - Hecho cuando: `getOrders` y `getOrderById` en `src/modules/orders/orders.service.ts` proyecten `packagingId` y el objeto `packaging` en cada ítem del pedido sin romper contratos existentes.

- [x] **T2. Consolidación de pedidos vinculados en auditoría del Lote Madre (`getBatchSummary`).** RF-4
  - Hecho cuando: `getBatchSummary` en `src/modules/batches/batches.service.ts` consolide en `linkedOrders` todos los pedidos cuyos ítems pertenezcan al lote madre o a sus fracciones envasadas, reflejando el 100% de los litros vendidos en la lista.

- [x] **T3. Suite de pruebas de integración para sincronización de pedidos y lotes.** RF-1, RF-3, RF-4
  - Hecho cuando: Las pruebas en `tests/orders_batch_sync.test.ts` verifiquen la proyección de `packagingId`, la actualización atómica sin pérdida de fracción y la visibilidad de comandas multi-ítem en la auditoría del lote.

- [x] **T4. Preservación de fracción envasada y filtro estricto por sabor en `OrderFormModal.vue`.** RF-2, RF-3
  - Hecho cuando: Al editar una comanda, el formulario conserve `packagingId`, filtre fracciones candidatas por coincidencia estricta de sabor y no degrade el producto a preventa aunque la fracción tenga saldo libre en 0L.

- [x] **T5. Invalidación y refresco reactivo de stock en el cliente (`operations.store.ts` y `DashboardView.vue`).** RF-5, RF-6
  - Hecho cuando: Al crear, editar o eliminar pedidos, `operationsStore` dispare la recarga de fracciones en `productionStore` y `DashboardView.vue` responda al evento `@saved` actualizando los indicadores de stock en tiempo real.

- [x] **T6. Script de reconciliación transaccional de pedidos en base de datos.** RF-7
  - Hecho cuando: El script `scripts/reconcile_orders_phase_b.ts` se ejecute limpiamente, enlazando pedidos de Fresa (y otros sabores) con sus fracciones activas correspondientes y sincronizando el balance de lotes en la base de datos.
