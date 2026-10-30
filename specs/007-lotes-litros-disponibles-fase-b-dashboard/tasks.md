# Tareas — Spec 007: Métricas de Fase B, Desglose Multi-Presentación y Estandarización a "Envases / Unidades"

- [x] **T1. Tests primero: Pruebas de integración para disponibilidad Fase B, multi-presentación (500ml/80ml) y chips en el Dashboard.** RF-1, RF-2, RF-3, RF-7, RF-8, RF-10, RF-11, RF-12
  - Hecho cuando: Se cree `tests/dashboard_phase_b.test.ts` con casos de prueba para stock libre de Fase B, exclusión de fermentación, cómputo volumétrico exacto de 500ml y 80ml, generación de chips y total de envases vendidos; los tests deben fallar inicialmente (en rojo).

- [x] **T2. Backend: Helper `formatLitersVolume` y cálculo de stock disponible de Fase B en `getDashboardSummary`.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-13
  - Hecho cuando: `getDashboardSummary` en `src/modules/finance/finance.service.ts` consulte las fracciones activas de `BatchPackaging`, ignore tanques de fermentación de Fase A, compute `availableLiters`, `availableBatchesCount` y `availableStockPresentations` con el helper de precisión adaptativa `formatLitersVolume`.

- [x] **T3. Backend: Desglose multi-presentación en despachos, desacoplamiento dinámico analítico y detalle en pedidos recientes.** RF-7, RF-8, RF-9, RF-10, RF-11, RF-12
  - Hecho cuando: `dispatchSummary` incluya `totalUnits` y `presentationsBreakdown` para entregas a clientes, retiros de socios y órdenes en proceso; `groupByBatchAndFlavor` sustituya los campos fijos de 1L/2L por `presentationsBreakdown`; y `recentOrders` reporte el formato y sabor exacto. La suite `tests/dashboard_phase_b.test.ts` debe pasar al 100% en verde.

- [x] **T4. Backend: Estandarización de validaciones, mensajes de stock y comprobantes de WhatsApp a "envases / unidades".** RF-15, RF-16
  - Hecho cuando: Se actualicen los mensajes de error y validaciones en `batches.schema.ts`, `batches.service.ts`, `crm.service.ts` y las líneas de comprobante en `orders.service.ts`, sustituyendo la palabra "botella(s)" por "envase(s)" o la presentación directa.

- [x] **T5. Frontend: Actualizar tarjetas del Dashboard (`DashboardView.vue`) y navegación con pestaña activa en `BatchesView.vue`.** RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-12, RF-13, RF-14
  - Hecho cuando: `DashboardView.vue` renderice la tarjeta de Lotes Disponibles (Fase B) con chips de stock, la tarjeta de Ventas con total de envases vendidos, chips visuales en el bloque de despachos, y `BatchesView.vue` active por defecto la pestaña de Fase B al recibir `?tab=packaging`.

- [x] **T6. Frontend: Estandarización terminológica transversal a "envases / unidades", Typecheck y Build de producción.** RF-14, RNF-1, RNF-2, RNF-3
  - Hecho cuando: Se actualicen los textos y modales restantes (`BatchSummaryModal.vue`, `PackagingModal.vue`, `LoyaltyTab.vue`, `OrdersView.vue`, etc.) reemplazando "botellas" por "envases / unidades", y la verificación de tipos (`npx tsc --noEmit`) y empaquetado del cliente (`npm --prefix frontend run build`) se ejecuten al 100% limpios sin advertencias ni errores.

- [x] **T7. Frontend & Utils: Helper `formatPresentationChip` y renderizado de chips limpios (evitar objetos JSON en UI).** RF-17
  - Hecho cuando: Se agregue `formatPresentationChip` en `frontend/src/utils/formatters.ts` (y opcionalmente en backend `volumeUtils.ts`) para limpiar nombres de catálogo ("Botella 1L", "Botella plástica de 500 ML" $\to$ `[5x 1L]`, `[6x 500ml]`) y se aplique en todas las tarjetas de stock y despachos de `DashboardView.vue`.

- [x] **T8. Frontend: Desglose de Ventas Totales con Pagado y Saldo Pendiente con Deuda / Encargos.** RF-18
  - Hecho cuando: `DashboardView.vue` mapee `totalCashCollected` y `totalPendingToCollect` desde `kpis`, y la tarjeta de Ventas Totales muestre el monto total encargado/facturado, y un sub-desglose con lo pagado/cobrado y lo que tiene deuda o está pendiente por cobrar.
