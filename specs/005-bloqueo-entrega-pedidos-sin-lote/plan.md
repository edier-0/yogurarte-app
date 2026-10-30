# Plan de Implementación — Spec 005: Bloqueo de Entrega de Pedidos sin Lote y Gestión de Preventa

## 1. Archivos y Responsabilidades

| Archivo | Responsabilidad | RFs Cubiertos |
| :--- | :--- | :--- |
| `src/modules/orders/orders.service.ts` | Backend: Validación estricta antes de transicionar a `DELIVERED`, corrección de desvinculación a preventa (`batchId: null`), eliminación de fallback de sabor cruzado `matchingPkgs[0]`, y sincronización de `order.batchId`. | RF-1, RF-3, RF-4, RF-5, RF-6, RF-7 |
| `frontend/src/components/operations/DeliveryConfirmModal.vue` | Frontend: Detección reactiva de ítems en preventa, bloqueo del botón de confirmación de entrega y renderizado de banner de advertencia explicativo. | RF-2 |
| `frontend/src/components/operations/OrderFormModal.vue` | Frontend: Validación antes de someter formulario con estado `DELIVERED` si hay ítems en preventa, y advertencia en tiempo real en el selector de estado. | RF-2, RF-3 |
| `frontend/src/views/operations/OrdersView.vue` | Frontend: Bloqueo de transición rápida de estado a `DELIVERED` en filas de pedidos que tengan ítems en preventa. | RF-2 |
| `tests/orders.test.ts` | Pruebas de integración: Cobertura de rechazo HTTP 400 por preventa al entregar, persistencia de desvinculación `batchId: null`, y no mezcla de sabores. | RF-1, RF-3, RF-4, RF-5 |

---

## 2. Helper Puro de Validación

### `hasUnassignedItems(items: Array<{ batchId?: number | null; packagingId?: number | null }>): boolean`
Función pura y reutilizable para determinar si una lista de ítems de comanda contiene productos en preventa o sin lote asignado:
```typescript
export function hasUnassignedItems(items: Array<{ batchId?: number | null; packagingId?: number | null }>): boolean {
  if (!items || items.length === 0) return true; // Un pedido sin ítems no se puede entregar
  return items.some((it) => !it.packagingId && !it.batchId);
}
```

---

## 3. Algoritmos en Pseudocódigo

### A. Validación en `updateDeliveryStatus` (Backend)
```
CUANDO se recibe deliveryStatus === 'DELIVERED':
  1. Consultar pedido existente incluyendo sus items:
     order = tx.order.findUnique(..., include: { items: true })
  2. SI autoLinkOrderItemsToAvailableBatches está activo:
     - Intentar auto-vincular SOLO a fracciones del MISMO sabor con saldo libre.
     - NO asignar fracciones de sabores distintos.
  3. Re-consultar ítems actualizados:
     SI hasUnassignedItems(order.items):
       LANZAR BadRequestError('No es posible marcar el pedido como entregado porque contiene productos en preventa o sin lote asignado. Asigna primero un lote envasado (Fase B) a todos los productos del pedido.')
  4. Proceder con el registro de deliveryDate y confirmación de entrega.
```

### B. Corrección de Desvinculación en `updateOrder` (Backend)
```
CUANDO se procesan los items en updateOrder:
  Para cada item en rawParsed:
    - SI item.batchId === null:
        itemBatchId = null
      SINO SI item.batchId está definido y no es nulo:
        itemBatchId = Number(item.batchId)
      SINO:
        itemBatchId = null // No heredar arbitrariamente el batchId de la orden si el ítem no lo tiene
        
    - SI item.packagingId === null:
        itemPackagingId = null
      SINO SI item.packagingId está definido y no es nulo:
        itemPackagingId = Number(item.packagingId)
        
    - Búsqueda de fracción si hay batchId pero no packagingId:
        matchingPkgs = pkgsForBatches.filter(p => p.batchId === itemBatchId)
        exactFlavorPkg = matchingPkgs.find(p => p.flavor.toLowerCase() === item.flavor.toLowerCase())
        SI exactFlavorPkg existe:
          item.packagingId = exactFlavorPkg.id
        SINO:
          item.packagingId = null // ELIMINADO || matchingPkgs[0] que mezclaba sabores
          
  Determinar nuevo order.batchId:
    itemsWithBatch = rawParsed.filter(it => it.batchId !== null)
    SI itemsWithBatch.length === 0:
      finalOrderBatchId = null // Todos los ítems están en preventa
    SINO:
      finalOrderBatchId = itemsWithBatch[0].batchId
      
  SI deliveryStatus === 'DELIVERED':
    SI hasUnassignedItems(rawParsed):
      LANZAR BadRequestError(...)
```

### C. Validación Preventiva en `DeliveryConfirmModal.vue` (Frontend)
```
hasPresaleItems = computed(() => {
  return (order.items || []).some(it => !it.packagingId && !it.batchId)
})

presaleFlavors = computed(() => {
  return (order.items || []).filter(it => !it.packagingId && !it.batchId).map(it => `${it.quantity}x ${it.flavor} (${it.bottleSize})`)
})

SI hasPresaleItems:
  - Mostrar Alert Box: "⚠️ Pedido con productos en preventa sin lote: [presaleFlavors]. No es posible entregar hasta asignar el lote."
  - Deshabilitar botón "Confirmar Entrega": disabled="hasPresaleItems || isSubmitting"
  - Mostrar botón alternativo "Editar Pedido" para abrir OrderFormModal y asignar lote.
```

---

## 4. Decisiones Justificadas y Alternativas Descartadas

1. **Bloqueo duro en backend (HTTP 400) vs. Advertencia permisiva (Warning)**:
   - *Decisión*: Bloqueo estricto con error HTTP 400.
   - *Por qué*: Si se permite la entrega sin lote, el kardex de producto terminado queda desfasado, los litros vendidos no restan de ningún envasado y las botellas físicas desaparecen del almacén sin rastro.
   - *Alternativa descartada*: Advertencia pasiva sin bloqueo; permitía inconsistencias graves y entregas de productos no envasados en el sistema.

2. **Eliminación del fallback `matchingPkgs[0]`**:
   - *Decisión*: Requerir coincidencia estricta de sabor (`flavor`). Si no coincide, el ítem queda sin fracción (`packagingId = null`).
   - *Por qué*: El fallback `|| matchingPkgs[0]` forzaba yogures de Fresa o Melocotón a asociarse a fracciones de Natural, distorsionando las auditorías de sabor y las ventas por fracción.
   - *Alternativa descartada*: Mantener el fallback con un log; generaba datos erróneos en auditorías de lotes.

3. **`order.batchId = null` cuando todos los ítems están en preventa**:
   - *Decisión*: Si no hay ningún ítem con lote, la cabecera `order.batchId` se limpia a `null`.
   - *Por qué*: Evita que el pedido mantenga un enlace fantasma a un lote del que ya no forma parte.
   - *Alternativa descartada*: Conservar el lote anterior en la cabecera; causaba que al editar el pedido el backend volviera a infectar los ítems con ese lote.

---

## 5. Estrategia de Pruebas

Se añadirán tests en `tests/orders.test.ts`:
1. `it('debe rechazar con error 400 la entrega de un pedido que contiene ítems en preventa sin lote')`
2. `it('debe permitir la entrega satisfactoria cuando todos los ítems tienen lote asignado')`
3. `it('debe persistir batchId y packagingId nulos al desvincular un ítem a preventa en updateOrder')`
4. `it('debe actualizar order.batchId a null cuando todos los ítems pasan a preventa')`
5. `it('no debe asociar una fracción de sabor distinto cuando un ítem tiene batchId pero sabor no coincidente')`
