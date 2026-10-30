# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 008 completada e implementada al 100%: Sincronización integral de pedidos, fracciones Fase B (`packagingId`) y consolidación en auditoría de lotes (`linkedOrders`).
- Script de reconciliación `scripts/reconcile_orders_phase_b.ts` ejecutado en producción (Neon): comanda de Fresa y Natural asociadas a sus fracciones con balance de stock cuadrando a 0 discrepancias.
- Typecheck (`npx tsc --noEmit`), build Vite (`npm --prefix frontend run build`) y tests de integración (`tests/orders_batch_sync.test.ts`, `tests/orders.test.ts`) 100% en verde (32/32 tests pasando).
- Rama actual: `fix/sincronizacion-pedidos-lotes-auditoria-fase-b`.

## Decisiones (y por qué)
- Proyección de `packagingId`: `getOrders` y `getOrderById` ahora proyectan siempre `packagingId` y `packaging: { select: { id, packagingCode, flavor } }` para que la UI nunca pierda la relación con Fase B al editar.
- Consolidación en `getBatchSummary`: los pedidos vinculados al lote no solo se leen de `batch.orders`, sino de `orderItems` directos y de `packagings.orderItems`, sumando el 100% de botellas y litros vendidos.
- Formulario de pedidos (`OrderFormModal`): filtrado de fracción por coincidencia estricta de sabor (`p.flavor.toLowerCase() === item.flavor.toLowerCase()`) y preservación de la fracción asignada aunque `freeLiters` sea 0.
- Refresco reactivo: `operationsStore` llama a `productionStore.fetchAvailablePackagings()` en mutaciones de pedidos, y `DashboardView` escucha `@saved` para refrescar los chips de stock de inmediato.

## Aprendizajes y errores a evitar
- Los pedidos multi-sabor no guardan `batchId` en la cabecera del pedido (es null); viven en los ítems de `OrderItem` y `BatchPackaging`. Cualquier consolidación de auditoría debe consultar ambas vías.
- Al editar un pedido, si el selector de fracciones solo busca por `batchId` sin filtrar por sabor, asigna fracciones incorrectas cuando un lote madre tiene múltiples sabores envasados.

## Próximos pasos
- Ejecutar ciclo Git de integración: commit, push de rama temática, Pull Request a `develop`, sincronización, merge directo a `main` y solicitud de confirmación para borrar la rama.
