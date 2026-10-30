# Plan de Arquitectura — Spec 004: Presentaciones Flexibles de Producto, Pedidos Dinámicos y Fidelización Proporcional

## 1. Archivos y Responsabilidades

| Archivo | Responsabilidad | RFs Cubiertos |
|---|---|---|
| `prisma/schema.prisma` | Modelo `ProductPresentation` (`name`, `label`, `capacityLiters`, `defaultPrice`, `rawMaterialId`, `isActive`). Relación opcional con `RawMaterial`. | RF-1, RF-2 |
| `prisma/seed.ts` | Semilla inicial de presentaciones (1L a \$12.000, 2L a \$24.000, 500ml a \$8.000). | RF-2 |
| `src/modules/production/presentations/presentations.schema.ts` | Esquemas Zod para creación, actualización, consulta y toggle de presentaciones. | RF-1, RF-3 |
| `src/modules/production/presentations/presentations.service.ts` | Lógica de negocio y persistencia en Prisma para CRUD de presentaciones y salvaguarda de no eliminación física con dependencias. | RF-1, RF-3, RF-4 |
| `src/modules/production/presentations/presentations.controller.ts` | Controlador delgado para endpoints de presentaciones. | RF-3 |
| `src/modules/production/presentations/presentations.routes.ts` | Rutas Express montadas en `/api/production/presentations`. | RF-3 |
| `src/app.ts` | Montar el enrutador de presentaciones en la API canónica. | RF-3 |
| `src/modules/orders/orders.service.ts` | Erradicar hardcoding `size === '2L' ? 2.0 : 1.0` y precios fijos. Resolver `litersPerUnit`, `totalLiters` y `unitPrice` dinámicamente con base en la presentación. Validar capacidad en fraccionamiento. | RF-7, RF-8, RF-9, RF-10, RF-15 |
| `src/modules/batches/batches.service.ts` | Unificar el reconocimiento de presentaciones en `computePackagingPresentations` por capacidad en litros e identificador de presentación para deducción exacta de stock. | RF-13, RF-14, RF-15 |
| `src/modules/crm/crm.service.ts` | Calcular fidelización de forma proporcional ($\sum \text{totalLiters} / 1.0$) y gestionar redención de recompensa de hasta 1 Litro con salida de inventario a \$0 COP. | RF-16, RF-17, RF-18, RF-19 |
| `frontend/src/stores/production.store.ts` | Estado reactivo y llamadas HTTP para `presentations`, `activePresentations`, CRUD y toggle. | RF-3, RF-5, RF-11 |
| `frontend/src/components/production/PresentationsManagementModal.vue` | Modal administrativo de gestión del catálogo de presentaciones (crear, editar precio/capacidad/envase, pausar/activar). | RF-3, RF-4 |
| `frontend/src/components/operations/OrderFormModal.vue` | Cargar dinámicamente presentaciones activas, auto-asignar `defaultPrice` editable, calcular litros exactos por fila y validar stock. | RF-5, RF-6, RF-7 |
| `frontend/src/components/production/PackagingModal.vue` | Cuadrícula de presentaciones activas para ingresar unidades envasadas en Fase B, asociar envases automáticamente y desglosar pre-ventas. | RF-11, RF-12, RF-13, RF-14 |
| `frontend/src/components/operations/crm/LoyaltyTab.vue` | Visualizar botellas proporcionales (ej. 8.5/10) y modal de canje seleccionando presentaciones hasta 1 Litro. | RF-16, RF-17, RF-18, RF-19 |
| `tests/presentations.test.ts` | Pruebas de integración automatizadas para CRUD del catálogo de presentaciones y validaciones. | RF-1 al RF-4 |
| `tests/orders.test.ts` | Pruebas de integración para órdenes con 500ml, cálculo volumétrico exacto y vinculación con Fase B. | RF-5 al RF-10, RF-15 |
| `tests/crm.test.ts` | Pruebas de integración para acumulación proporcional de fidelización y canje de hasta 1L. | RF-16 al RF-19 |

---

## 2. Funciones Puras de Dominio

### `resolvePresentationLiters(sizeName: string, fallbackCapacity?: number): number`
```typescript
export function resolvePresentationLiters(sizeName: string, fallbackCapacity?: number): number {
  if (fallbackCapacity && fallbackCapacity > 0) return fallbackCapacity;
  const clean = (sizeName || '').trim().toLowerCase();
  if (clean === '2l' || clean.includes('2 litro') || clean.includes('2 l')) return 2.0;
  if (clean === '1l' || clean.includes('1 litro') || clean.includes('1 l')) return 1.0;
  if (clean === '500ml' || clean.includes('500 ml') || clean.includes('0.5l')) return 0.5;
  if (clean === '250ml' || clean.includes('250 ml') || clean.includes('0.25l')) return 0.25;
  if (clean.includes('galon') || clean.includes('galón') || clean.includes('3.8l')) return 3.8;
  
  // Parseo genérico con regex (ej. "350ml" -> 0.35, "1.5L" -> 1.5)
  const mlMatch = clean.match(/(\d+)\s*ml/);
  if (mlMatch) return Number(mlMatch[1]) / 1000;
  const lMatch = clean.match(/(\d+(\.\d+)?)\s*l/);
  if (lMatch) return Number(lMatch[1]);

  return 1.0;
}
```

### `calculateOrderItemTotals(quantity: number, capacityLiters: number, unitPrice: number)`
```typescript
export function calculateOrderItemTotals(quantity: number, capacityLiters: number, unitPrice: number) {
  const qty = Math.max(0, quantity);
  const cap = Math.max(0, capacityLiters);
  const price = Math.max(0, unitPrice);
  return {
    quantity: qty,
    litersPerUnit: cap,
    totalLiters: Math.round(qty * cap * 1000) / 1000,
    unitPrice: price,
    totalPrice: Math.round(qty * price),
  };
}
```

### `calculateLoyaltyProgress(totalLitersDelivered: number, redeemedCycles: number)`
```typescript
export function calculateLoyaltyProgress(totalLitersDelivered: number, redeemedCycles: number) {
  const totalEquivalentBottles = Math.max(0, totalLitersDelivered);
  const netBottles = Math.max(0, totalEquivalentBottles - (redeemedCycles * 10));
  const rewardsAvailable = Math.floor(netBottles / 10);
  const currentCycleBottles = Math.round((netBottles % 10) * 10) / 10;
  const bottlesNeeded = Math.max(0, Math.round((10 - currentCycleBottles) * 10) / 10);
  const progressPercent = Math.min(100, Math.round((currentCycleBottles / 10) * 100));

  return {
    totalEquivalentBottles: Math.round(totalEquivalentBottles * 10) / 10,
    redeemedCount: redeemedCycles,
    rewardsAvailable,
    currentCycleBottles,
    bottlesNeeded,
    progressPercent,
  };
}
```

---

## 3. Algoritmos y Flujos en Pseudocódigo

### Algoritmo: Creación y Cálculo Dinámico de Pedido (`createOrder`)
```text
1. ENTRADA: customer info, items: [{ bottleSize, flavor, quantity, unitPrice, packagingId, batchId }]
2. Cargar presentaciones activas desde base de datos (`ProductPresentation.findMany({ where: { isActive: true } })`).
3. Crear un mapa `presentationMap` por `name.toLowerCase()`.
4. PARA CADA item EN items:
   a. Buscar presentación en `presentationMap` por item.bottleSize.
   b. capacity = presentación?.capacityLiters ?? resolvePresentationLiters(item.bottleSize).
   c. defaultPrice = presentación?.defaultPrice ?? (capacity === 2.0 ? 24000 : (capacity === 0.5 ? 8000 : 12000)).
   d. finalUnitPrice = item.unitPrice !== undefined && item.unitPrice >= 0 ? item.unitPrice : defaultPrice.
   e. litersPerUnit = capacity.
   f. totalLiters = quantity * litersPerUnit.
   g. totalPrice = quantity * finalUnitPrice.
5. totalLitersCalculated = SUM(item.totalLiters).
6. totalQuantityBottles = SUM(item.quantity).
7. totalItemsAmount = SUM(item.totalPrice).
8. SI se vincula a BatchPackaging:
   - Validar que la fracción tenga stock libre suficiente para la presentación y litros requeridos.
9. Guardar Order y OrderItems atómicamente en prisma.$transaction.
```

### Algoritmo: Redención de Recompensa de Fidelización (`redeemLoyaltyReward`)
```text
1. ENTRADA: customerId, selectedBatchPackagingId, itemsToRedeem: [{ bottleSize, quantity }]
2. Cargar cliente y validar progreso de fidelización:
   - totalLiters = SUM(pedidos entregados y pagados).
   - rewardsAvailable = FLOOR((totalLiters - redeemedCount * 10) / 10).
   - SI rewardsAvailable < 1 ENTONCES lanzar Error("No tiene recompensas disponibles para canje").
3. totalRedeemedLiters = SUM(item.quantity * resolvePresentationLiters(item.bottleSize)).
4. SI totalRedeemedLiters > 1.05 ENTONCES lanzar Error("El premio de fidelización no puede exceder 1.0 Litro").
5. Cargar BatchPackaging seleccionado:
   - Validar que tenga unidades disponibles de las presentaciones solicitadas.
6. En transacción atómica ($transaction):
   a. Crear comanda/descargo o salida de inventario:
      - customerId, packagingId, bottleSize, quantity, totalLiters, unitPrice: 0, totalAmount: 0.
      - notes: "Premio Fidelización 10+1 (Canje gratuito)".
   b. Incrementar customer.loyaltyRedeemedCount += 1.
7. Retornar éxito con stock actualizado y nuevo saldo de fidelización.
```

---

## 4. Riesgos, Mitigaciones y Compatibilidad

1. **Riesgo**: Pedidos históricos con `bottleSize = '1L'` o `'2L'` creados antes de la migración.
   - **Mitigación**: La semilla inicial crea `'1L'` y `'2L'` en `ProductPresentation` con exactamente las mismas claves y capacidades, y la función `resolvePresentationLiters` provee fallback seguro para datos legacy.
2. **Riesgo**: Discrepancias en nombres de envases entre `OrderItem` y `BatchPackaging.containers`.
   - **Mitigación**: `computePackagingPresentations` cruza por `capacityLiters` con tolerancia $\pm 0.01$ además de la comparación de nombres en minúsculas, garantizando coincidencia aunque el usuario haya escrito "500ml" o "Botella 500ml".
3. **Riesgo**: Eliminación accidental de una presentación en uso.
   - **Mitigación**: El endpoint `DELETE /api/production/presentations/:id` verifica referencias en `OrderItem` o `BatchPackaging`. Si existen registros históricos, realiza un borrado lógico (`isActive = false`) y notifica al usuario.
