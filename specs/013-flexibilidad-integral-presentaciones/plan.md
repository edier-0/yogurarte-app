# Plan de Arquitectura — Spec 013: Flexibilidad Integral Multi-Presentación

Estado: borrador listo para revisión y desglose de tareas

## 1. Resumen Ejecutivo y Objetivos de Arquitectura
El objetivo de este plan es eliminar cualquier dependencia rígida de "1L" y "2L" en el backend y frontend de YogurArte, dotando al sistema de una arquitectura 100% dinámica basada en el catálogo activo de presentaciones (`ProductPresentation`). 

La arquitectura resuelve 5 frentes fundamentales:
1. **Validación de Lotes en Pedidos (Backend & UI)**: Filtrado estricto por coincidencia exacta de presentación comercial y disponibilidad de unidades físicas ($\text{cantidad} \le \text{freeUnits}$). Salvaguarda HTTP 400 en servidor y preservación de "Asignación Actual" en ediciones históricas.
2. **Suscripciones Recurrentes Mixtas en CRM**: Flexibilización del esquema Zod, persistencia aditiva no destructiva (`items Json?`), cotización dinámica a precios vigentes de catálogo al generar comandas en estado `PENDING`, y pausa automática si algún producto fue descontinuado.
3. **Canje de Fidelización 10+1 Transaccional**: Modalidades cerradas (1x 1L o 2x 500ml), descarga atómica multi-fracción a $0 COP (`PREMIO_FIDELIZACION`), reversión ante déficit de inventario concurrente y bloqueo si el cliente tiene cartera vencida ($\text{pendingAmount} > 0$).
4. **Segregación Constitucional de Producción (Art. 5.5)**: Auditoría del Lote Madre (Fase A) limpia de columnas de botellas comerciales (exclusiva a granel); auditoría comercial concentrada al 100% en Fase B.
5. **Vinculación Masiva de Órdenes a Fase B**: Filtro dual estricto por sabor y presentación comercial idéntica.

---

## 2. Mapeo de Requisitos Funcionales a Componentes

| Requisito Funcional (Spec 013) | Componente Backend / Servicio | Componente Frontend / Vista |
| :--- | :--- | :--- |
| **RF-1, RF-2, RF-3**: Filtrado y rotulado de lotes por presentación en UI | `batches.service.ts` (`computePackagingPresentations`) | `OrderFormModal.vue` (`getFilteredPackagings`, `getItemSelectionKey`) |
| **RF-4, RF-7**: Validación de stock y presentación en servidor (HTTP 400) | `orders.service.ts` (`createOrder`, `updateOrder`) | `OrderFormModal.vue` (validación reactiva pre-submit) |
| **RF-5**: Preservación histórica y control de incremento ($\Delta \le \text{freeUnits}$) | `orders.service.ts` (`updateOrder`) | `OrderFormModal.vue` (`isCustomOptionNeeded`, cálculo de delta) |
| **RF-6, RF-8**: Cambio reactivo de formato, precio y volumen de catálogo | `orders.service.ts` (`resolvePresentationDetails`) | `OrderFormModal.vue` (`onBottleSizeChange`, `productionStore`) |
| **RF-9, RF-10**: Suscripciones recurrentes mixtas y múltiples por cliente | `crm.service.ts` (`createRecurringSchedule`, `updateRecurringSchedule`) | `RecurringEditModal.vue`, `RecurringTab.vue` |
| **RF-11**: Esquema Zod dinámico en CRM | `crm.schema.ts` (`createRecurringScheduleSchema`, `updateRecurringScheduleSchema`) | `RecurringEditModal.vue` |
| **RF-12, RF-13**: Cotización al precio vigente y alerta de productos inactivos | `crm.service.ts` (`triggerRecurringOrder`) | `RecurringTab.vue` (`handleGenerateOrder`) |
| **RF-14, RF-15**: Acumulador proporcional y bloqueo por cartera en mora | `crm.service.ts` (`getLoyaltyOverview`, `redeemLoyaltyReward`) | `RedeemRewardModal.vue`, `LoyaltyTab.vue` |
| **RF-16, RF-17, RF-18, RF-19**: Canje 1x 1L / 2x 500ml atómico a $0 COP | `crm.service.ts` (`redeemLoyaltyReward`), `crm.schema.ts` | `RedeemRewardModal.vue` |
| **RF-20**: Vinculación masiva por sabor y presentación idéntica | `batches.service.ts` (`linkOrdersToPackaging`, `getPendingOrdersByFlavor`) | `PackagingSummaryModal.vue` (`loadUnlinkedOrders`) |
| **RF-21, RF-22**: Segregación constitucional de Fase A y Fase B | `batches.service.ts` (`getBatchSummary`, `getPackagingSummary`) | `BatchSummaryModal.vue`, `PackagingSummaryModal.vue` |
| **RF-23, RF-24**: Bajas y retiros de socios por presentación en Fase B | `batches.service.ts` (`createDischargeFromPackaging`) | `PackagingSummaryModal.vue` |

---

## 3. Archivos Afectados y Responsabilidades

### Backend
1. **`prisma/schema.prisma`**:
   - Agregar campo aditivo opcional `items Json?` en `model RecurringSchedule` para almacenar canastas multi-ítem sin alterar registros históricos ni requerir migraciones DDL destructivas.
2. **`src/modules/orders/orders.service.ts`**:
   - En `createOrder`: validar que todo ítem con `packagingId` coincida exactamente en `bottleSize` con la fracción y que $\text{cantidad} \le \text{freeUnits}$.
   - En `updateOrder`: validar coincidencia de `bottleSize` y que el incremento neto $\Delta = \text{nuevaCantidad} - \text{cantidadOriginal} \le \text{freeUnits}$.
3. **`src/modules/orders/orders.schema.ts`**:
   - Asegurar que `bottleSize` acepte cualquier string no vacío validado contra catálogo activo.
4. **`src/modules/crm/crm.schema.ts`**:
   - Eliminar `z.enum(['1L', '2L'])`.
   - Implementar `recurringItemSchema` y habilitar `items: z.array(recurringItemSchema).optional()`.
   - Modificar `redeemLoyaltySchema` para soportar `items: z.array(z.object({ packagingId: z.number().optional(), bottleSize: z.string(), quantity: z.number(), flavor: z.string().optional() }))`.
5. **`src/modules/crm/crm.service.ts`**:
   - `createRecurringSchedule` y `updateRecurringSchedule`: soportar persistencia de canasta mixta en `items Json?` sincronizando `preferredFlavor`, `bottleSize` y `quantity` con el primer ítem para compatibilidad legacy.
   - `triggerRecurringOrder`: validar que ningún sabor ni presentación esté inactivo (`isActive: false`), resolver precios vigentes desde `ProductPresentation` y generar comanda en `PENDING` con todos los ítems de la canasta.
   - `redeemLoyaltyReward`: verificar paz y salvo en cartera ($\text{pendingDebt} = 0$), validar que la selección sea 1x 1L o 2x 500ml ($\le 1.05$ L), validar stock en cada fracción seleccionada dentro de `prisma.$transaction` y registrar descargos a $0 COP (`PREMIO_FIDELIZACION`).
6. **`src/modules/batches/batches.service.ts`**:
   - `getPendingOrdersByFlavor`: aceptar parámetro opcional `presentation?: string` (o `bottleSize?: string`) para filtrar comandas huérfanas por sabor y tamaño simultáneamente.
   - `linkOrdersToPackaging`: filtrar y actualizar ítems que coincidan tanto en `flavor` como en `bottleSize` de la fracción.
   - `getBatchSummary`: garantizar que la respuesta de Fase A no retorne columnas de botellas comerciales, respetando el Art. 5.5.

### Frontend
1. **`frontend/src/components/operations/OrderFormModal.vue`**:
   - Filtrar el selector de lotes por ítem para mostrar solo fracciones de Fase B con la presentación exacta del ítem y `freeUnits >= 1`.
   - Actualizar etiqueta de lote a: `{{ p.flavor }} — {{ p.packagingCode || 'Fracción #' + p.id }} ({{ targetPres.free }} unds disp.)`.
   - Preservar lotes asignados agotados como "Asignación Actual".
   - Al cambiar presentación, desvincular lote, pasar a pre-venta y actualizar precio unitario sugerido.
   - Bloquear y alertar en el modal si `cantidad > freeUnits`.
2. **`frontend/src/components/operations/crm/RecurringEditModal.vue`**:
   - Modificar el formulario para permitir agregar, editar y eliminar múltiples ítems en la canasta de la suscripción (sabor, presentación dinámica y cantidad).
3. **`frontend/src/components/operations/crm/RecurringTab.vue`**:
   - Visualizar la canasta mixta en la tarjeta de compra frecuente.
   - Cotizar al precio vigente del catálogo y reflejar advertencia si algún producto fue descontinuado.
4. **`frontend/src/components/operations/crm/RedeemRewardModal.vue`**:
   - Restringir la UI exclusivamente a las dos opciones autorizadas: 1x 1L o 2x 500ml.
   - Para 2x 500ml: permitir elegir 1 o 2 sabores con sus respectivos lotes de Fase B disponibles.
   - Si el cliente tiene cartera vencida, mostrar advertencia de deuda y deshabilitar el botón de canje.
5. **`frontend/src/components/production/BatchSummaryModal.vue`**:
   - Eliminar pastillas fijas `1L: pkg.bottles1L` y `2L: pkg.bottles2L`. Mostrar formato mono-presentación y litros transferidos de la fracción.
6. **`frontend/src/components/production/PackagingSummaryModal.vue`**:
   - En la pestaña de vincular pedidos huérfanos, enviar el filtro de presentación de la fracción para no mostrar pedidos de otros tamaños.

---

## 4. Contratos de Interfaz y Esquemas Zod

### 4.1 Esquemas de Suscripción Recurrente (`crm.schema.ts`)
```typescript
export const recurringItemSchema = z.object({
  flavor: z.string().min(2, 'Ingresa un sabor válido'),
  bottleSize: z.string().min(1, 'La presentación es obligatoria'),
  quantity: z.coerce.number().int().min(1, 'La cantidad mínima es 1'),
});

export const createRecurringScheduleSchema = z.object({
  customerId: z.coerce.number().int().positive('Cliente inválido'),
  frequencyDays: z.coerce.number().int().min(1).max(365).optional().default(15),
  preferredFlavor: z.string().min(2).optional(),
  bottleSize: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  items: z.array(recurringItemSchema).min(1, 'Debe incluir al menos un ítem').optional(),
  nextDate: z.string().min(4, 'La fecha de recordatorio es obligatoria'),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateRecurringScheduleSchema = z.object({
  frequencyDays: z.coerce.number().int().min(1).max(365).optional(),
  preferredFlavor: z.string().min(2).optional(),
  bottleSize: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  items: z.array(recurringItemSchema).min(1).optional(),
  nextDate: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});
```

### 4.2 Esquema de Canje de Fidelización (`crm.schema.ts`)
```typescript
export const redeemLoyaltyItemSchema = z.object({
  packagingId: z.coerce.number().int().positive().optional().nullable(),
  bottleSize: z.string().min(1, 'Presentación requerida'),
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima es 1'),
  flavor: z.string().optional(),
});

export const redeemLoyaltySchema = z.object({
  customerId: z.coerce.number().int().positive('Cliente inválido'),
  packagingId: z.coerce.number().int().positive().optional().nullable(),
  items: z.array(redeemLoyaltyItemSchema).min(1, 'Debe especificar el producto a entregar').optional(),
  registeredBy: z.string().optional(),
});
```

### 4.3 Persistencia Aditiva en Prisma (`prisma/schema.prisma`)
```prisma
model RecurringSchedule {
  id              Int       @id @default(autoincrement())
  customerId      Int
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  frequencyDays   Int       @default(15)
  preferredFlavor String    @default("Fresa")
  bottleSize      String    @default("1L")
  quantity        Int       @default(1)
  items           Json?     // Almacena canasta mixta: Array<{ flavor: string, bottleSize: string, quantity: number }>
  nextDate        DateTime
  lastOrderDate   DateTime?
  notes           String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @default(now()) @updatedAt

  @@index([customerId])
  @@index([nextDate])
  @@index([isActive])
}
```

---

## 5. Funciones Puras y Algoritmos en Pseudocódigo

### Algoritmo 1: Validación de Lote y Stock en Pedidos (RF-4, RF-5, RF-7)
```typescript
// Función pura: Evalúa si un ítem de pedido puede asignarse a un lote
export function validateOrderItemPackaging(
  item: { bottleSize: string; quantity: number },
  pkg: { id: number; packagingCode?: string; flavor: string; presentations: any[] },
  originalQuantityOnThisPkg: number = 0
): { valid: boolean; error?: string } {
  // 1. Normalizar cadenas de presentación
  const itemSizeNorm = item.bottleSize.toLowerCase().replace(/\s+/g, '');
  const targetPres = pkg.presentations.find((p) => {
    const pSizeNorm = (p.containerName || '').toLowerCase().replace(/\s+/g, '');
    return pSizeNorm === itemSizeNorm || pSizeNorm.includes(itemSizeNorm) || itemSizeNorm.includes(pSizeNorm);
  });

  if (!targetPres) {
    return {
      valid: false,
      error: `Discrepancia de presentación: El lote "${pkg.packagingCode || pkg.flavor}" no está envasado en "${item.bottleSize}".`,
    };
  }

  // 2. Evaluar saldo disponible teniendo en cuenta asignación original si es edición
  const deltaQuantity = item.quantity - originalQuantityOnThisPkg;
  if (deltaQuantity > targetPres.free) {
    return {
      valid: false,
      error: `Capacidad insuficiente: El lote solo cuenta con ${targetPres.free} unds libres, no alcanza para cubrir ${item.quantity} unds (déficit de ${deltaQuantity - targetPres.free} unds).`,
    };
  }

  return { valid: true };
}
```

### Algoritmo 2: Generación Periódica de Comandas Recurrentes (RF-12, RF-13)
```typescript
export async function triggerRecurringOrderPure(
  schedule: RecurringScheduleWithCustomer,
  activePresentations: ProductPresentation[],
  activeFlavors: ProductFlavor[],
  todayStr: string // Formato YYYYMMDD para consecutivo
) {
  // 1. Extraer canasta de ítems
  const itemsList = Array.isArray(schedule.items) && schedule.items.length > 0
    ? (schedule.items as Array<{ flavor: string; bottleSize: string; quantity: number }>)
    : [{ flavor: schedule.preferredFlavor, bottleSize: schedule.bottleSize, quantity: schedule.quantity }];

  // 2. Verificar que todos los productos estén activos
  for (const it of itemsList) {
    const isFlavorActive = activeFlavors.some(
      (f) => f.name.toLowerCase() === it.flavor.toLowerCase() && f.isActive
    );
    const isPresActive = activePresentations.some(
      (p) => (p.name.toLowerCase() === it.bottleSize.toLowerCase() || p.label.toLowerCase() === it.bottleSize.toLowerCase()) && p.isActive
    );

    if (!isFlavorActive || !isPresActive) {
      throw new BadRequestError(
        `Generación detenida: El producto "${it.flavor} — ${it.bottleSize}" se encuentra descontinuado en el catálogo. Por favor actualiza la suscripción en CRM.`
      );
    }
  }

  // 3. Resolver precios y volúmenes vigentes
  const orderItemsData = itemsList.map((it) => {
    const pres = activePresentations.find(
      (p) => p.name.toLowerCase() === it.bottleSize.toLowerCase() || p.label.toLowerCase() === it.bottleSize.toLowerCase()
    )!;
    const unitPrice = pres.defaultPrice;
    const litersPerUnit = pres.capacityLiters;
    const totalLiters = Math.round(it.quantity * litersPerUnit * 100) / 100;
    const totalPrice = it.quantity * unitPrice;

    return {
      bottleSize: pres.label || pres.name,
      flavor: it.flavor,
      quantity: it.quantity,
      litersPerUnit,
      totalLiters,
      unitPrice,
      totalPrice,
    };
  });

  const totalAmount = orderItemsData.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalLiters = Math.round(orderItemsData.reduce((sum, i) => sum + i.totalLiters, 0) * 100) / 100;

  return {
    orderPayload: {
      customerId: schedule.customerId,
      bottleSize: orderItemsData[0].bottleSize,
      flavor: orderItemsData[0].flavor,
      quantityBottles: orderItemsData.reduce((s, i) => s + i.quantity, 0),
      totalLiters,
      unitPrice: orderItemsData[0].unitPrice,
      totalAmount,
      paidAmount: 0,
      pendingAmount: totalAmount,
      paymentStatus: 'PENDING',
      deliveryStatus: 'PENDING',
      notes: `Generado automáticamente desde Compra Frecuente (${schedule.frequencyDays} días). ${schedule.notes || ''}`.trim(),
      items: orderItemsData,
    },
  };
}
```

### Algoritmo 3: Canje Atómico de Fidelización 10+1 (RF-14, RF-15, RF-17, RF-19)
```typescript
export async function processLoyaltyRedemptionPure(
  customer: CustomerWithOrders,
  items: Array<{ packagingId?: number | null; bottleSize: string; quantity: number; flavor?: string }>,
  tx: PrismaTransaction
) {
  // 1. Validar paz y salvo en cartera (Constitución Art. 3)
  const deliveredOrders = (customer.orders || []).filter((o) => o.deliveryStatus !== 'CANCELLED');
  const pendingDebt = deliveredOrders.reduce((sum, o) => {
    const p = o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0));
    return sum + p;
  }, 0);

  if (pendingDebt > 0) {
    throw new BadRequestError(
      `El cliente registra un saldo pendiente de cartera por $${pendingDebt.toLocaleString('es-CO')} COP. Debe estar a paz y salvo para redimir premios.`
    );
  }

  // 2. Validar litros acumulados
  const totalLitersDelivered = deliveredOrders
    .filter((o) => o.paymentStatus === 'PAID' || o.paidAmount >= o.totalAmount)
    .reduce((sum, o) => sum + (Number(o.totalLiters) || o.quantityBottles || 1), 0);
  const redeemedCount = customer.loyaltyRedeemedCount || 0;
  const netLiters = Math.max(0, totalLitersDelivered - redeemedCount * 10);

  if (netLiters < 10) {
    throw new BadRequestError(
      `El cliente solo tiene ${netLiters.toFixed(1)} unidades de 1L equivalentes acumuladas. Requiere 10 para canjear su premio.`
    );
  }

  // 3. Validar modalidad cerrada (1x 1L o 2x 500ml)
  const totalRedeemLiters = items.reduce((sum, it) => {
    const liters = resolvePresentationLiters(it.bottleSize);
    return sum + liters * it.quantity;
  }, 0);

  if (totalRedeemLiters > 1.05) {
    throw new BadRequestError(`El premio no puede superar 1.0 Litro. Volumen solicitado: ${totalRedeemLiters.toFixed(2)}L.`);
  }

  // 4. Descargo atómico por cada fracción de Fase B
  for (const it of items) {
    if (it.packagingId) {
      const pkg = await tx.batchPackaging.findUnique({
        where: { id: it.packagingId },
        include: { orderItems: { where: { order: { deliveryStatus: { not: 'CANCELLED' } } } }, discharges: true },
      });
      if (!pkg) throw new NotFoundError(`Fracción de lote envasado #${it.packagingId} no encontrada.`);

      const computed = computePackagingPresentations(pkg);
      const targetPres = computed.presentations.find((p) =>
        p.containerName.toLowerCase().includes(it.bottleSize.toLowerCase()) ||
        it.bottleSize.toLowerCase().includes(p.containerName.toLowerCase())
      );

      if (!targetPres || targetPres.free < it.quantity) {
        throw new BadRequestError(
          `Stock insuficiente en fracción ${pkg.packagingCode || pkg.flavor}: Disponibles ${targetPres?.free || 0} unds de ${it.bottleSize}, solicitadas ${it.quantity}.`
        );
      }

      await tx.batchDischarge.create({
        data: {
          batchId: pkg.batchId,
          packagingId: pkg.id,
          bottleSize: it.bottleSize,
          quantityBottles: it.quantity,
          totalLiters: Math.round(it.quantity * targetPres.capacityLiters * 100) / 100,
          unitPrice: 0,
          totalAmount: 0,
          reasonType: 'PREMIO_FIDELIZACION',
          notes: `Premio fidelización 10+1 para ${customer.fullName}`,
        },
      });
      await syncBatchStatusBidirectional(tx, pkg.batchId);
    }
  }

  // 5. Incrementar contador de canjes
  await tx.customer.update({
    where: { id: customer.id },
    data: { loyaltyRedeemedCount: { increment: 1 } },
  });
}
```

---

## 6. Decisiones Técnicas Justificadas y Alternativas Descartadas

1. **Campo `items Json?` en `RecurringSchedule`**:
   - *Alternativa descartada*: Crear tabla relacional `RecurringScheduleItem`. Se descartó porque añadiría sobrecarga de claves foráneas y uniones para colecciones que típicamente tienen 1 a 3 ítems, requiriendo migraciones DDL más pesadas. `items Json?` mantiene paridad conceptual con `BatchPackaging.containers` y garantiza 100% de compatibilidad hacia atrás manteniendo sincronizados los campos legacy `preferredFlavor`, `bottleSize` y `quantity`.
2. **Validación Dual de Stock (UI reactiva + Backend HTTP 400)**:
   - *Alternativa descartada*: Validar únicamente en la interfaz de usuario. Se descartó porque dejaría la API vulnerable a solicitudes concurrentes o manipulaciones por red que generarían inventario negativo y violarían la regla de bloqueo de entrega con pre-ventas (Spec 005).
3. **Cálculo de Deuda Dinámico para Habilitar Fidelización**:
   - *Alternativa descartada*: Consultar una columna estática de deuda en `Customer`. Descartada en estricto cumplimiento del Artículo 3.1 de la Constitución, que prohíbe persistir columnas estáticas de cartera.
4. **Filtro Combinado en Vinculación Masiva (`batches.service.ts`)**:
   - *Alternativa descartada*: Seguir vinculando pedidos únicamente por coincidencia de sabor (`flavor.contains`). Descartada porque permitía que órdenes de 500 ml se descontaran de fracciones de 1 L o 2 L distorsionando los inventarios unitarios de Fase B.

---

## 7. Estrategia de Pruebas Automatizadas (TDD con Vitest)

Se creará una suite de pruebas de integración dedicada: `tests/multi_presentation_flexibility.test.ts`, complementando los tests existentes en `tests/orders.test.ts`, `tests/crm.test.ts` y `tests/batches.test.ts`.

### Casos de Prueba Clave a Implementar (Red-Green-Refactor):
1. **Pedidos y Lotes Mono-Presentación**:
   - Rechazo HTTP 400 al intentar asignar un lote de 1L a un ítem configurado en 500ml (RF-7).
   - Rechazo HTTP 400 si la cantidad solicitada supera `freeUnits` del lote en una nueva orden (RF-4, RF-7).
   - En edición histórica, aceptación si la cantidad no cambia o si el incremento neto $\Delta \le \text{freeUnits}$ (RF-5).
   - Rechazo en edición histórica si el incremento supera las unidades libres remanentes (RF-5).
2. **Suscripciones Recurrentes Mixtas en CRM**:
   - Creación exitosa de suscripción con canasta multi-ítem conteniendo 500ml, 1L y 2L sin error de validación (RF-9, RF-11).
   - Generación de pedido comercial en estado `PENDING` adoptando los precios oficiales actuales del catálogo para cada presentación (RF-12, RF-13).
   - Detención y error HTTP 400 descriptivo al generar comanda si un sabor o presentación de la canasta está inactivo (RF-13, CL-10).
3. **Fidelización 10+1**:
   - Cálculo exacto de progreso proporcional ($\sum \text{totalLiters} / 1.0$) soportando 500ml (0.5) y 2L (2.0) (RF-14).
   - Bloqueo de canje con HTTP 400 si el cliente tiene saldo pendiente de cartera en pedidos entregados (RF-15, CL-8).
   - Canje exitoso de 2x 500ml con dos fracciones de Fase B distintas, descargando atómicamente 1 unidad de cada una a $0 COP (`PREMIO_FIDELIZACION`) (RF-16, RF-17, RF-19).
   - Aborto atómico si una de las dos fracciones de 500ml no tiene stock disponible (CL-3).
4. **Vinculación y Auditoría Constitucional**:
   - `getPendingOrdersByFlavor` y `linkOrdersToPackaging` filtran y vinculan estrictamente pedidos que coincidan tanto en sabor como en presentación (RF-20).
   - `BatchSummaryModal` y servicio de Fase A no retornan conteos fijos de botellas terminadas, respetando el Artículo 5.5 de la Constitución (RF-21).
