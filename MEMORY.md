# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en producción: Fase A/B, inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp.
- Specs 001 a 005 completadas e implementadas al 100%.
- Neon DB Producción: Pedido #PED-20261029-001 (Daila Pérez) corregido; ítems y orden en preventa (`batchId: null`, `deliveryStatus: 'PENDING'`), pago de $20.000 Nequi intacto y Lote 2 de Fase B liberado de asignaciones fantasma.
- Spec 005 finalizada: Bloqueo de entrega de pedidos sin lote en backend (HTTP 400) y frontend (modales y tabla). Blindaje de desvinculación a preventa en `updateOrder` sin fallback de sabor cruzado. Rama `feat/block-delivery-without-batch` lista para PR.

## Decisiones (y por qué)
- Bloqueo estricto HTTP 400 al entregar (`DELIVERED`) pedidos con ítems en preventa: protege la consistencia del kardex de producto terminado y evita salidas físicas sin descargo de lote.
- Eliminación del fallback `matchingPkgs[0]`: impide que ítems de Fresa se vinculen a lotes de Natural cuando no hay fracción coincidente de sabor.
- `order.batchId = null` al desvincular todos los ítems a preventa: evita que la cabecera retenga lotes fantasma que re-infecten los ítems al guardar.
- Preservación de pagos anticipados en preventa: el recaudo registrado (ej. Nequi) se mantiene sin cambios mientras el pedido espera asignación de lote físico.

## Aprendizajes y errores a evitar
- Prisma DataLoader con `findUnique` en transacciones contra Neon: usar `select` puntual para evitar timeouts y conexión rota.
- En `updateOrder`, evaluar explícitamente `item.batchId === null` para no forzar el `batchId` previo de la orden sobre ítems desvinculados a preventa.
- `vue-tsc` corre con `noUnusedLocals: true`: variables o imports no utilizados botan error y rompen el build.

## Próximos pasos
- Ejecutar ciclo Git de integración: push de `feat/block-delivery-without-batch`, PR a `develop`, fusión a `main`, y solicitar autorización al usuario para borrar la rama temática.
