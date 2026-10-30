# Spec 005 — Bloqueo de Entrega de Pedidos sin Lote y Gestión de Preventa

Estado: implementada

## Contexto y objetivo
En YogurArte, los pedidos de clientes pueden registrarse como pre-ventas o encargos anticipados antes de que la producción del lote o fracción (Fase B) haya concluido o haya sido ingresada en el sistema.

Actualmente, el sistema permitía transicionar un pedido con productos en preventa al estado `DELIVERED` (Entregado). Al hacerlo, el backend intentaba auto-vincular ítems huérfanos a cualquier lote disponible, o en caso de no existir lote del sabor (ej. Fresa), permitía la entrega sin lote. Además, en la edición de pedidos (`updateOrder`), si un ítem se marcaba en preventa (`batchId: null`, `packagingId: null`), el backend lo sobreescribía re-asignándole el `batchId` previo de la orden y asignándole una fracción arbitraria de otro sabor mediante un fallback indebido (`matchingPkgs[0]`), provocando que pedidos de Fresa quedaran vinculados a lotes de Natural y reaparecieran como asignados en el modal de pedidos.

El objetivo de esta especificación es:
1. Bloquear de manera rigurosa la entrega (`DELIVERED`) de cualquier pedido que contenga productos sin lote o fracción asignada (en preventa).
2. Blindar la desvinculación a nivel de ítems y orden en `updateOrder`, permitiendo desvincular un ítem a preventa sin que sea re-infectado por el lote anterior de la orden ni por fracciones de otros sabores.
3. Actualizar la interfaz de usuario (`DeliveryConfirmModal.vue`, `OrderFormModal.vue` y `OrdersView.vue`) para deshabilitar o advertir al usuario cuando un pedido tenga ítems en preventa, orientándolo a asignar un lote envasado disponible antes de entregar.

---

## Usuarios
- **Vendedor / Operador de Pedidos**: Registra pedidos en preventa o venta directa y gestiona la vinculación a lotes disponibles.
- **Domiciliario / Repartidor**: Entrega pedidos en ruta; no debe poder cerrar entregas físicas de pedidos huérfanos sin lote asignado.
- **Administrador de Producción**: Supervisa que cada litro entregado provenga de una fracción envasada real en el sistema.

---

## Historias de usuario
- **HU-1**: Como operador o domiciliario, no quiero poder marcar un pedido como entregado si alguno de sus productos está en preventa (sin lote asignado), para garantizar la consistencia entre el stock físico y el sistema.
- **HU-2**: Como vendedor u operador, quiero poder desvincular un ítem de un lote para pasarlo a preventa desde el modal de edición de pedidos, teniendo la certeza de que el sistema respetará la desvinculación y no lo re-vinculará a lotes de otros sabores.
- **HU-3**: Como usuario, quiero que la interfaz me alerte con claridad si un pedido tiene productos en preventa al intentar entregarlo, indicándome qué productos faltan por asignar y cómo resolverlo.

---

## Definiciones
- **Preventa (Encargo sin lote asignado)**: Estado de un ítem de comanda donde `batchId === null` y `packagingId === null`, indicando que el producto aún no ha sido envasado o asignado a un lote comercial de Fase B.
- **Lote Envasado (Fase B)**: Fracción de producto terminado (`BatchPackaging`) con sabor, presentación y unidades comerciales definidas.
- **Entrega (`DELIVERED`)**: Estado terminal del ciclo logístico que confirma que el cliente recibió físicamente el producto y descarga el inventario correspondiente.

---

## Requisitos funcionales (EARS)

- **RF-1**: SI un pedido contiene uno o más productos con `batchId === null` y `packagingId === null` (en preventa o sin lote), ENTONCES EL SISTEMA debe rechazar cualquier solicitud de actualizar su estado de entrega a `DELIVERED`, respondiendo con un error HTTP 400 (`BadRequestError`) con el mensaje: *"No es posible marcar el pedido como entregado porque contiene productos en preventa o sin lote asignado. Asigna primero un lote envasado (Fase B) a todos los productos del pedido."*
- **RF-2**: CUANDO se intente confirmar la entrega desde el modal de confirmación de entrega (`DeliveryConfirmModal.vue`), el selector rápido de estado en `OrdersView.vue`, o el formulario de pedidos (`OrderFormModal.vue`), EL SISTEMA debe evaluar previamente si el pedido tiene ítems en preventa; SI los tiene, EL SISTEMA debe impedir la confirmación y mostrar un aviso visual explicativo indicando los sabores que no tienen lote asignado.
- **RF-3**: CUANDO el usuario actualice un pedido en `updateOrder` enviando ítems con `batchId: null` y `packagingId: null`, EL SISTEMA debe persistir explícitamente dichos valores nulos en la base de datos sin sobreescribir el ítem con el `batchId` previo de la orden.
- **RF-4**: CUANDO se actualice un ítem con un `batchId` asignado pero sin `packagingId`, EL SISTEMA solo debe autocompletar `packagingId` SI existe una fracción envasada que coincida exactamente en sabor (`flavor`); SI no existe una fracción del mismo sabor, EL SISTEMA no debe asignar fracciones de otros sabores bajo ninguna circunstancia (eliminación del fallback `matchingPkgs[0]`).
- **RF-5**: SI tras actualizar los ítems de un pedido en `updateOrder` todos los ítems resultan en preventa (`batchId === null && packagingId === null`), ENTONCES EL SISTEMA debe actualizar el campo `batchId` de la orden a `null`.
- **RF-6**: SI un pedido contiene ítems asignados a lotes distintos, EL SISTEMA debe mantener `order.batchId` con el lote del primer ítem asignado o el lote principal, pero si ningún ítem tiene lote, `order.batchId` debe ser `null`.
- **RF-7**: CUANDO se invoque `autoLinkOrderItemsToAvailableBatches` durante la creación o despacho de pedidos, EL SISTEMA solo debe vincular ítems a fracciones o lotes que coincidan estrictamente en sabor y tengan saldo libre suficiente; SI algún ítem no encuentra lote disponible de su sabor y el pedido intenta marcarse como `DELIVERED`, la operación debe abortarse con el error de RF-1.

---

## Requisitos no funcionales
- **RNF-1 (Transaccionalidad e Integridad)**: Todas las validaciones de lote y transiciones de estado deben ejecutarse dentro de transacciones Prisma interactivas (`prisma.$transaction`).
- **RNF-2 (Claridad en UI)**: Los mensajes de bloqueo y alertas en el frontend deben ser comprensibles en español colombiano, especificando los productos pendientes por lote.
- **RNF-3 (Compatibilidad y Regresión)**: No debe afectar pedidos históricos ya entregados ni los pagos/abonos registrados en caja y tesorería.

---

## Casos límite
- **Pedido mixto (1 con lote y 1 en preventa)**: Debe bloquear la entrega hasta que ambos productos tengan lote asignado.
- **Pedido pagado por anticipado (`paymentStatus = 'PAID'`) en preventa**: El abono/pago se mantiene intacto, pero el estado de entrega permanece en `PENDING` o `PREPARING` hasta que se asigne el lote físico.
- **Reversión de entrega o cancelación**: Pasar un pedido entregado a cancelado o pendiente debe seguir funcionando normalmente.
- **Pedido con múltiples fracciones del mismo sabor**: Solo se asigna a fracciones que coincidan en sabor.

---

## Fuera de alcance
- Crear lotes automáticos sin la intervención del yogurtero en el módulo de producción.
- Modificar el sistema de arqueos o canales bimonetarios de caja.

---

## Criterios de finalización
- [x] Pruebas unitarias y de integración en `tests/orders.test.ts` que validen:
  - Error 400 al intentar transicionar a `DELIVERED` un pedido con ítems en preventa.
  - Desvinculación limpia de ítems (`batchId: null`, `packagingId: null`) sin re-infección del lote anterior.
  - `order.batchId` se limpia a `null` cuando todos los ítems están en preventa.
  - No asignación cruzada de sabores en `updateOrder`.
- [x] Validación preventiva en `DeliveryConfirmModal.vue`, `OrderFormModal.vue` y `OrdersView.vue`.
- [x] Suite de pruebas (`vitest`) y verificación de tipos (`npx tsc --noEmit` y build frontend) 100% en verde.
