# Plan de Implementación — Spec 007: Métricas de Fase B, Desglose Multi-Presentación y Estandarización a "Envases / Unidades"

## 1. Archivos y Responsabilidades

| Archivo | Responsabilidad | RFs Cubiertos |
| :--- | :--- | :--- |
| `src/modules/finance/finance.service.ts` | Extender `getDashboardSummary` para consultar fracciones activas de `BatchPackaging`, computar stock libre de Fase B, totalizar envases despachados con chips por presentación, desacoplar `groupByBatchAndFlavor` a `presentationsBreakdown` y enriquecer `recentOrders`. | RF-1, RF-2, RF-3, RF-4, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12 |
| `src/shared/utils/formatters.ts` / `src/utils/volume.utils.ts` | Función pura de formateo volumétrico adaptativo (`formatLitersVolume`) con precisión de hasta 2 decimales para formatos pequeños (80ml, 150ml). | RF-13 |
| `src/modules/batches/batches.schema.ts` & `src/modules/batches/batches.service.ts` | Estandarizar mensajes de validación y errores sustituyendo "botella(s)" por "envase(s)". | RF-15 |
| `src/modules/crm/crm.service.ts` | Estandarizar textos de fidelización y plantillas CRM sustituyendo "botellas" por "envases / unidades". | RF-15, RF-16 |
| `src/modules/orders/orders.service.ts` | Estandarizar comprobantes de WhatsApp para formular `• 20x 80ml` o `• 2x 1L` suprimiendo "Botella". | RF-16 |
| `frontend/src/utils/formatters.ts` | Agregar formateador adaptativo de litros y actualizar detección de unidades discretas ("envases", "unidades"). | RF-13, RF-14 |
| `frontend/src/views/dashboard/DashboardView.vue` | Modificar tarjetas: Lotes Disponibles Fase B (con chips de stock), Ventas Totales (con total envases), Entregas a Clientes, Consumo de Socios, En Preparación (con chips visuales), y Últimos Pedidos (detalle formato). | RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-12, RF-14 |
| `frontend/src/views/production/BatchesView.vue` | Soportar parámetro de consulta `route.query.tab === 'packaging'` para activar por defecto la pestaña de Fase B y actualizar textos a "envases". | RF-6, RF-14 |
| Modales y Vistas Frontend (`PackagingModal.vue`, `BatchSummaryModal.vue`, `LoyaltyTab.vue`, `OrdersView.vue`, etc.) | Reemplazar transversalmente "botella(s)" por "envase(s)" / "unidad(es)" en etiquetas, modales y botones. | RF-14 |
| `tests/dashboard_phase_b.test.ts` | Suite de pruebas de integración para validar el contrato de API del Dashboard con Fase B, multi-presentación (500ml, 80ml) y chips de despacho. | RF-1 a RF-13 |

---

## 2. Funciones Puras e Interfaces de Datos

### 2.1 Función Pura: `formatLitersVolume(liters: number): string`
```typescript
/**
 * Formateo de volumen en litros con precisión adaptativa:
 * - Enteros: "4 L"
 * - 1 decimal exacto (ej. 0.5L): "4.5 L"
 * - 2 decimales para formatos centesimales (ej. 0.08L, 0.15L): "4.08 L", "0.15 L"
 */
export function formatLitersVolume(liters: number): string {
  const num = Number(liters) || 0;
  const rounded2 = Math.round(num * 100) / 100;
  if (Math.abs(rounded2 - Math.round(rounded2)) < 0.001) {
    return `${Math.round(rounded2)} L`;
  }
  if (Math.abs(rounded2 * 10 - Math.round(rounded2 * 10)) < 0.01) {
    return `${rounded2.toFixed(1)} L`;
  }
  return `${rounded2.toFixed(2)} L`;
}
```

### 2.2 Interfaz: `PresentationChip`
```typescript
export interface PresentationChip {
  name: string;        // ej. "1L", "500ml", "80ml"
  quantity: number;    // ej. 12
  capacityLiters: number; // ej. 0.08
  totalLiters: number; // ej. 0.96
}
```

### 2.3 Estructura Extendida de `DashboardData`
```typescript
interface DashboardData {
  kpis: {
    totalSalesAmount: number;
    totalSalesLiters: number;
    totalUnitsSold: number;             // Nuevo RF-10
    availableLiters: number;              // Nuevo RF-1 (Fase B libre)
    availableBatchesCount: number;        // Nuevo RF-2 (Fracciones libres)
    availableStockPresentations: PresentationChip[]; // Nuevo RF-5
    // ... campos monetarios y de tesorería existentes
  };
  dispatchSummary: {
    clientDeliveries: {
      ordersCount: number;
      liters: number;
      totalUnits: number;
      presentationsBreakdown: PresentationChip[]; // Nuevo RF-7
      // montos pagados y pendientes
    };
    partnerConsumptions: {
      dischargesCount: number;
      liters: number;
      totalUnits: number;
      presentationsBreakdown: PresentationChip[]; // Nuevo RF-8
      totalAmount: number;
    };
    inProcessOrders: {
      ordersCount: number;
      liters: number;
      totalUnits: number;
      presentationsBreakdown: PresentationChip[]; // Nuevo RF-9
      // montos
    };
    totalDispatchedLiters: number;
  };
  // ...
}
```

---

## 3. Algoritmo en Pseudocódigo (`getDashboardSummary`)

```text
1. OBTENER activePackagings en paralelo con orders, expenses, etc.:
   prisma.batchPackaging.findMany({
     where: { batch: { isActive: true, status: { not: 'ARCHIVADO' } } },
     include: { orderItems: { include: { order: true } }, discharges: true }
   })

2. CALCULAR Stock Disponible de Fase B:
   availableLiters = 0
   availableBatchesCount = 0
   stockPresentationsMap = new Map<name, { quantity, capacityLiters, totalLiters }>()

   PARA CADA pkg EN activePackagings:
     computed = computePackagingPresentations(pkg)
     SI computed.freeLiters > 0.05:
       availableBatchesCount += 1
       availableLiters += computed.freeLiters
       PARA CADA pres EN computed.presentations:
         SI pres.free > 0:
           acumular pres.free en stockPresentationsMap[pres.containerName]

3. SOPORTE RETROCOMPATIBLE (RF-4):
   PARA CADA batch EN activeFinishedBatches SIN packagings:
     directAvailable = calcularSaldoDirecto(batch)
     SI directAvailable > 0.05:
       availableLiters += directAvailable
       availableBatchesCount += 1

4. CALCULAR Desglose de Despachos (Entregas, Retiros, En Proceso):
   PARA CADA deliveredOrder:
     PARA CADA item EN order.items:
       acumular item.quantity y (item.quantity * item.litersPerUnit) en deliveredBreakdown
   
   PARA CADA discharge EN batchDischarges:
     capacidad = d.totalLiters / d.quantityBottles
     acumular d.quantityBottles y d.totalLiters en partnerBreakdown

   PARA CADA inProcessOrder:
     acumular ítems en inProcessBreakdown

5. RETORNAR kpis enriquecidos, dispatchSummary con presentationsBreakdown y recentOrders con ítems desglosados.
```

---

## 4. Decisiones Justificadas y Alternativas Descartadas

1. **Uso de Chips Visuales (`[12x 1L] [50x 80ml]`) frente a Texto Plano**:
   - *Decisión*: Renderizar cápsulas flexibles con colores sutiles por tarjeta.
   - *Alternativa descartada*: Texto corrido largo. Se descartó porque satura la tarjeta y dificulta la distinción inmediata de formatos al auditar pedidos.
2. **Preservar columnas internas de Base de Datos (`quantityBottles`, etc.)**:
   - *Decisión*: Actualizar solo la capa de visualización (UI), mensajes y respuestas API a "envases / unidades", manteniendo el nombre de las columnas en Prisma.
   - *Alternativa descartada*: Renombrar columnas en PostgreSQL (`ALTER TABLE ... RENAME`). Se descartó porque implica migraciones de alto riesgo en producción Neon, downtime innecesario y posible rotura de consultas existentes.
3. **Precisión Adaptativa de Litros (`formatLitersVolume`)**:
   - *Decisión*: 2 decimales solo cuando hay residuos no nulos (ej. 80 ml $\to$ `0.08 L`, pero 4 L se muestra como `4 L`).
   - *Alternativa descartada*: Forzar `.toFixed(2)` en todo. Se descartó porque ver `4.00 L` o `18.00 L` en volúmenes estándar luce artificial y sobrecargado.

---

## 5. Estrategia de Tests (Vitest)

- Archivo de test: `tests/dashboard_phase_b.test.ts`.
- Pruebas a implementar:
  1. `GET /api/dashboard/summary` debe retornar `availableLiters` y `availableBatchesCount` correspondientes al stock libre de Fase B, ignorando lotes madre en fermentación (Fase A) (RF-1, RF-2, RF-3).
  2. `GET /api/dashboard/summary` debe computar exactamente botellas de 500ml (0.5L) y 80ml (0.08L) en `clientDeliveries` y retornar chips en `presentationsBreakdown` (RF-6, RF-7).
  3. `GET /api/dashboard/summary` debe calcular retiros de socios de 500ml y 80ml con volumen exacto en `partnerConsumptions` (RF-8).
  4. `GET /api/dashboard/summary` debe retornar `totalUnitsSold` en `kpis` y desacoplar `groupByBatchAndFlavor` sin campos rígidos (RF-10, RF-11).
  5. `GET /api/dashboard/summary` debe retornar en `recentOrders` el desglose exacto de presentación y sabor (RF-12).
- Verificación integral: `npx vitest run tests/dashboard_phase_b.test.ts`, `npx tsc --noEmit` y `npm --prefix frontend run build`.
