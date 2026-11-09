# Tareas de Implementación — Spec 013: Flexibilidad Integral Multi-Presentación

Estado: pendientes de ejecución

> **Metodología Obligatoria**:
> - Cada tarea se ejecuta siguiendo la disciplina de TDD (`test-driven-development`): escribir primero la prueba en rojo (Patrón Prove-It), implementar el código mínimo necesario para ponerla en verde (`vitest`), y refactorizar.
> - Se implementa **una sola tarea a la vez**. Al finalizar cada tarea, se verifica la compilación (`npx tsc --noEmit`), se actualiza `MEMORY.md` y se reporta el progreso antes de continuar.

---

### Lista de Tareas

- [x] **T1. Esquema Prisma y Esquemas Zod Dinámicos en CRM y Pedidos (Backend).** RF-11, RNF-2
  - **Alcance**: 
    1. Agregar el campo opcional `items Json?` en `model RecurringSchedule` en `prisma/schema.prisma` y ejecutar `npx prisma db push` y `npx prisma generate`.
    2. Actualizar `src/modules/crm/crm.schema.ts` eliminando `z.enum(['1L', '2L'])`, creando `recurringItemSchema` y adaptando `createRecurringScheduleSchema` y `updateRecurringScheduleSchema` para aceptar `items: z.array(recurringItemSchema).optional()`.
    3. Adaptar `redeemLoyaltySchema` en `src/modules/crm/crm.schema.ts` para admitir `items: z.array(z.object({ packagingId: z.number().optional().nullable(), bottleSize: z.string(), quantity: z.number(), flavor: z.string().optional() }))`.
  - **Hecho cuando**: Los tests unitarios en `tests/multi_presentation_flexibility.test.ts` verifiquen la validación exitosa de canastas multi-ítem con presentaciones dinámicas (ej. '500ml', '80ml'), rechazando enumeraciones rígidas.

- [x] **T2. Validación Estricta de Lotes y Control de Stock en Pedidos (Backend).** RF-4, RF-5, RF-7, RF-8
  - **Alcance**:
    1. En `src/modules/orders/orders.service.ts` (`createOrder`), validar que para cada ítem con `packagingId` la presentación (`bottleSize`) coincida idénticamente con la de la fracción envasada y que $\text{cantidad} \le \text{freeUnits}$, arrojando HTTP 400 descriptivo si hay discrepancia o sobrecupo.
    2. En `src/modules/orders/orders.service.ts` (`updateOrder`), validar coincidencia de presentación y que el incremento neto $\Delta = \text{nuevaCantidad} - \text{original} \le \text{freeUnits}$. Si no hay stock libre suficiente para el incremento, arrojar HTTP 400.
  - **Hecho cuando**: En `tests/multi_presentation_flexibility.test.ts`, un test de intento de asignación de lote con tamaño discrepante falle con HTTP 400, y un test con cantidad superior al stock libre falle con HTTP 400.

- [x] **T3. Suscripciones Recurrentes Mixtas y Cotización Dinámica (Backend).** RF-9, RF-10, RF-12, RF-13
  - **Alcance**:
    1. En `src/modules/crm/crm.service.ts`, actualizar `createRecurringSchedule` y `updateRecurringSchedule` para persistir la canasta en `items Json?` sincronizando `preferredFlavor`, `bottleSize` y `quantity` con el primer ítem para retrocompatibilidad.
    2. En `src/modules/crm/crm.service.ts` (`triggerRecurringOrder`), validar que ningún sabor ni presentación esté inactivo (`isActive: false`) en el catálogo; resolver precios vigentes desde `ProductPresentation` y generar el pedido comercial en estado `PENDING` con todos los ítems de la canasta en pre-venta.
  - **Hecho cuando**: En `tests/multi_presentation_flexibility.test.ts`, se cree una suscripción recurrente mixta (ej. 1L Fresa + 500ml Melocotón) y al generar comanda comercial se cree con el precio oficial de catálogo; y al desactivar un sabor la generación falle con HTTP 400.

- [x] **T4. Canje Transaccional de Fidelización 10+1 y Control de Cartera (Backend).** RF-14, RF-15, RF-16, RF-17, RF-18, RF-19
  - **Alcance**:
    1. En `src/modules/crm/crm.service.ts` (`redeemLoyaltyReward`), verificar la deuda de pedidos entregados (`pendingDebt`); si es $> 0$, bloquear el canje con HTTP 400 exigiendo estar a paz y salvo en cartera.
    2. Validar que la selección corresponda estrictamente a 1x 1L o 2x 500ml ($\le 1.05$ L).
    3. Dentro de `prisma.$transaction`, verificar stock libre en cada fracción de Fase B seleccionada y registrar descargos a $0 COP (`PREMIO_FIDELIZACION`). Si cualquiera de las fracciones no tiene existencias libres, abortar la transacción atómicamente.
  - **Hecho cuando**: En `tests/multi_presentation_flexibility.test.ts`, un cliente con cartera en mora no pueda redimir premio (HTTP 400), y un cliente al día pueda redimir 2x 500ml de dos fracciones distintas descargando 1 unidad de cada una a $0 COP.

- [x] **T5. Vinculación Masiva Filtrada por Presentación y Sabor (Backend).** RF-20
  - **Alcance**:
    1. En `src/modules/batches/batches.service.ts` (`getPendingOrdersByFlavor`), aceptar parámetro opcional `presentation?: string` para filtrar pedidos que coincidan tanto en sabor como en presentación.
    2. En `src/modules/batches/batches.service.ts` (`linkOrdersToPackaging`), vincular exclusivamente los ítems de pedido que coincidan simultáneamente en `flavor` y `bottleSize` con la fracción de Fase B.
  - **Hecho cuando**: En `tests/multi_presentation_flexibility.test.ts`, al enlazar órdenes a una fracción de 1L Fresa, solo se vinculen los ítems de 1L Fresa, ignorando ítems huérfanos de 500ml Fresa.

- [x] **T6. Selector de Lotes Dinámico y Validación de Capacidad en Formulario de Pedidos (Frontend).** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - **Alcance**:
    1. En `frontend/src/components/operations/OrderFormModal.vue`, filtrar las opciones de lote por ítem mostrando solo fracciones de Fase B cuya presentación coincida idénticamente con `item.bottleSize` y tengan $\text{freeUnits} \ge 1$.
    2. Actualizar la etiqueta del option a: `{{ p.flavor }} — {{ p.packagingCode }} ({{ targetPres.free }} unds disp.)`, eliminando conteos fijos de 1L/2L.
    3. Preservar lotes asignados agotados como "Asignación Actual".
    4. En `onBottleSizeChange(item)`, desvincular el lote, pasar a pre-venta y actualizar precio unitario sugerido desde `productionStore.presentations`.
    5. Alertar reactivamente en pantalla e impedir el guardado si $\text{cantidad} > \text{freeUnits}$.
  - **Hecho cuando**: Al abrir el modal de pedidos y seleccionar 500ml, solo se listen fracciones de 500ml con sus existencias reales, y si se excede el stock libre se alerte y bloquee el guardado.

- [x] **T7. Suscripciones Recurrentes Mixtas y Alertas en CRM (Frontend).** RF-9, RF-10, RF-12, RF-13
  - **Alcance**:
    1. Modificar `frontend/src/components/operations/crm/RecurringEditModal.vue` para permitir agregar, editar y eliminar múltiples ítems en la canasta (sabor, presentación dinámica y cantidad).
    2. Modificar `frontend/src/components/operations/crm/RecurringTab.vue` para mostrar el desglose de productos de la canasta, cotizar a precios actualizados del catálogo y advertir si algún ítem contiene productos descontinuados.
  - **Hecho cuando**: En la interfaz de CRM se pueda crear y editar una suscripción recurrente con canasta mixta (ej. 1L Fresa + 500ml Mora) y generar la comanda comercial en pre-venta.

- [x] **T8. Modal de Redención de Fidelización 10+1 y Alerta de Cartera (Frontend).** RF-15, RF-16, RF-17, RF-18
  - **Alcance**:
    1. En `frontend/src/components/operations/crm/RedeemRewardModal.vue`, limitar las opciones exclusivamente a 1x 1L o 2x 500ml.
    2. Para 2x 500ml, permitir seleccionar sabor 1 (con su lote) y sabor 2 (con su lote).
    3. Si el cliente tiene pedidos adeudados (`customer.pendingDebt > 0`), mostrar un banner de advertencia claro y deshabilitar el botón de entrega.
  - **Hecho cuando**: Al abrir el modal para un cliente con saldo pendiente se bloquee la entrega; y para un cliente al día permita seleccionar 2 sabores de 500ml y confirmar el canje.

- [x] **T9. Segregación Constitucional de Fase A y Vinculación en Fase B (Frontend).** RF-20, RF-21, RF-22
  - **Alcance**:
    1. En `frontend/src/components/production/BatchSummaryModal.vue`, eliminar pastillas rígidas `1L: pkg.bottles1L` / `2L: pkg.bottles2L` en Fase A, exhibiendo el formato mono-presentación y litros transferidos de cada fracción.
    2. En `frontend/src/components/production/PackagingSummaryModal.vue`, enviar el parámetro de presentación al consultar pedidos huérfanos para vinculación masiva.
  - **Hecho cuando**: La auditoría de Fase A no contenga columnas fijas de botellas comerciales (Art. 5.5), y la vinculación masiva en Fase B solo muestre órdenes de la presentación exacta de la fracción.

- [x] **T10. Verificación Integral de Calidad, Tipos y Suite Completa de Tests.** RF-1 a RF-24, RNF-1 a RNF-4
  - **Alcance**:
    1. Ejecutar la suite completa de pruebas: `npx vitest run`.
    2. Ejecutar typecheck estricto del backend: `npx tsc --noEmit`.
    3. Ejecutar empaquetado de producción del frontend: `npm --prefix frontend run build`.
  - **Hecho cuando**: 100% de los tests pasen en verde, la compilación de TypeScript no tenga errores y el build de Vite se genere exitosamente sin fallos de tipos.
