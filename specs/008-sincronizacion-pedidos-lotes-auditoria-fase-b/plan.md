# Plan de Arquitectura e Implementación — Spec 008

## Archivos y Responsabilidades

1. **`src/modules/orders/orders.service.ts`** (RF-1, RF-3)
   - **`getOrders`**: Agregar `packagingId: true` y la relación `packaging: { select: { id: true, packagingCode: true, flavor: true } }` al `select` de `items`.
   - **`getOrderById`**: Agregar la relación `packaging` dentro del include de `items`.
   - **`updateOrder`**: Garantizar que la resolución bidireccional entre `packagingId` y `batchId` persista atómicamente en `OrderItem.createMany`.

2. **`src/modules/batches/batches.service.ts`** (RF-4)
   - **`getBatchSummary`**: Modificar la consulta y agregación de `linkedOrders` para consolidar pedidos que tengan productos vinculados directamente al lote madre (`it.batchId === batch.id`), a nivel cabecera (`order.batchId === batch.id`), o a través de las fracciones envasadas del lote (`it.packagingId in batch.packagings.id`).

3. **`frontend/src/components/operations/OrderFormModal.vue`** (RF-2)
   - Cargar fielmente `it.packagingId` en `orderToEdit`.
   - En el fallback de resolución por `batchId`, validar coincidencia estricta de sabor (`p.flavor.toLowerCase() === it.flavor.toLowerCase()`).
   - Asegurar que la fracción asignada se mantenga visible y seleccionada en el dropdown aunque su saldo libre sea 0L (`freeLiters = 0`).

4. **`frontend/src/stores/operations.store.ts`** (RF-5)
   - Al completar exitosamente `createOrder`, `updateOrder` o `deleteOrder`, disparar la invalidación/recarga de fracciones envasadas en `useProductionStore().fetchAvailablePackagings()`.

5. **`frontend/src/views/dashboard/DashboardView.vue`** (RF-6)
   - Reemplazar el listener `@order-created="loadDashboard"` por `@saved="loadDashboard"` en el componente `<OrderFormModal>`.

6. **`scripts/reconcile_orders_phase_b.ts`** (RF-7)
   - Script seguro y transaccional con Prisma para re-enlazar pedidos activos de Fresa y otros sabores con sus fracciones de Fase B correspondientes.

7. **`tests/orders_batch_sync.test.ts`** (RF-1, RF-3, RF-4)
   - Suite de pruebas de integración para validar la proyección de `packagingId`, la actualización atómica y la consolidación de pedidos en la auditoría del lote.

---

## Algoritmos y Flujo Lógico

### 1. Consolidación de Pedidos Vinculados en `getBatchSummary` (RF-4)
```text
DADO batchId:
  1. Obtener batch con packagings (y sus packaging.orderItems), orders directas y orderItems directos.
  2. Extraer conjunto de todos los packagingIds del lote: PkgSet = { p.id for p in batch.packagings }.
  3. Crear Mapa linkedOrdersMap = new Map<number, OrderAuditDTO>().
  4. Para cada orden 'o' en batch.orders (donde deliveryStatus != 'CANCELLED'):
       linkedOrdersMap.set(o.id, o).
  5. Para cada orderItem 'it' en batch.orderItems (donde deliveryStatus != 'CANCELLED'):
       Si !linkedOrdersMap.has(it.order.id):
         linkedOrdersMap.set(it.order.id, it.order).
  6. Para cada packaging 'p' en batch.packagings:
       Para cada orderItem 'it' en p.orderItems (donde deliveryStatus != 'CANCELLED'):
         Si !linkedOrdersMap.has(it.order.id):
           linkedOrdersMap.set(it.order.id, it.order).
  7. Retornar linkedOrders = Array.from(linkedOrdersMap.values()) ordenados por orderDate desc.
```

### 2. Preservación de Fracción en Edición de Pedido (RF-2)
```text
DADO orderToEdit.items:
  Para cada ítem 'it':
    1. Si it.packagingId existe:
         pkgId = it.packagingId
    2. Sino, si it.batchId existe:
         Buscar en availablePkgs o packagings una fracción donde:
           p.batchId === it.batchId Y p.flavor.toLowerCase() === it.flavor.toLowerCase()
         Si encontrada -> pkgId = p.id
    3. Construir item con { packagingId: pkgId, batchId: it.batchId, flavor: it.flavor, ... }
```

### 3. Reconciliación Segura de Base de Datos (RF-7)
```text
EN TRANSACCIÓN (tx):
  1. Buscar todas las fracciones activas BatchPackaging agrupadas por batchId y flavor.
  2. Buscar todos los OrderItem activos (order.deliveryStatus != 'CANCELLED') donde packagingId IS NULL.
  3. Para cada ítem:
       Si coincide con el sabor de una fracción activa del mismo lote (o lote correspondiente por fecha):
         Actualizar OrderItem { packagingId: matchedPackaging.id, batchId: matchedPackaging.batchId }
  4. Sincronizar estado de los lotes afectados con syncBatchStatusBidirectional.
```

---

## Decisiones Justificadas

- **Decisión 1: Proyección de `packagingId` en `GET /api/orders`**:
  - *Alternativa descartada*: Hacer un endpoint adicional o subconsulta en el cliente cada vez que se abre el modal de edición.
  - *Justificación*: Causa latencia adicional y condiciones de carrera; el modelo relacional ya posee la clave foránea `packagingId` en `OrderItem` y basta incluirla en el `select` sin impacto en rendimiento.

- **Decisión 2: Consolidación relacional en memoria de `linkedOrders` en `getBatchSummary`**:
  - *Alternativa descartada*: Forzar una clave foránea única `order.batchId` en todas las órdenes.
  - *Justificación*: Una comanda puede contener productos de diferentes lotes (pedido multi-ítem). Modificar la cabecera forzaría inconsistencias; agrupar los pedidos mediante `orderItems` refleja fielmente el consumo de cada lote y fracción.

---

## Estrategia de Pruebas

- **Backend**: Vitest con Supertest (`tests/orders_batch_sync.test.ts`).
  - Prueba de `GET /api/orders` verificando presencia de `packagingId`.
  - Prueba de edición de comanda verificando que `packagingId` no se pierda.
  - Prueba de `GET /api/batches/:id/summary` verificando que pedidos multi-ítem aparezcan en la auditoría del lote.
- **Frontend**: Verificación de compilación TypeScript (`npx tsc --noEmit`) y empaquetado Vite (`npm --prefix frontend run build`).
- **Datos**: Ejecución del script de reconciliación en modo seguro con verificación de registros actualizados.
