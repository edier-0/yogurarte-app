# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- CRUD de usuarios del sistema operativo en frontend y backend.
- CRM WhatsApp: resuelta desincronización de estado `CONNECTING` en Baileys v7 con auto-reconciliación proactiva y desbloqueo de envío de mensajes en backend y frontend. Eliminado bucle infinito de inicialización y blindada la sesión ante deploys en Render.
- Modales móviles: arquitectura de 3 capas fijas implementada en todos los modales del sistema (header fijo, cuerpo con scroll táctil fluido y footer anclado de acciones). Control de desbordamiento horizontal en inputs fecha y grids.
- Lotes y Descuentos: corregido bug de conversión a pre-venta al aplicar descuentos/precios especiales; blindado auto-vínculo de pedidos entregados a lotes disponibles y balance financiero real con descuentos en resúmenes de lote y fracción.

## Decisiones (y por qué)
- Módulos (`routes` + controller delgado + service + Zod) para aislar dominio y no inflar controladores legacy.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos.
- Caja por canal (efectivo vs Nequi/banco): refleja operación real y arqueos. Tesorería (`cashInHand`, `digitalBank`) no se resetea por filtros de fecha.
- Costeo de producción Fase A/B: desacoplado `packagingCost` de `ProductionBatch.totalCost`/`costPerLiter` base. Rentabilidad comercial calculada por fracción en Fase B.
- KPI "Disponible para Ventas": calcula litros desde stock libre envasado en Fase B (`BatchPackaging.freeLiters`).
- Fallback externo y usernames en CRM WhatsApp: Baileys requiere JID numérico o LID. Se implementó utilidad universal `buildWhatsAppUrl`, acción rápida y toasts interactivos "Abrir en WhatsApp".
- Resiliencia de conexión Baileys: `getStatus()` desacoplado de `init()`. Solo 401 purga credenciales; 440 detiene reconexión sin borrar BD (vital para rolling deploys) y 515 reconecta en 1s.
- Confinamiento estricto de inputs en móviles (`OrderFormModal.vue`): `min-w-0` en celda/grid y `block min-w-0 max-w-full` en input de fecha para evitar desborde horizontal.
- Descuentos y preservación de lotes (`OrderFormModal.vue`): no asumir pre-venta si el lote asignado tiene 0L libres; `isPresale` solo aplica si no hay `batchId` ni `packagingId`. Protegido el precio unitario manual (`isCustomUnitPrice`) al seleccionar fracciones.
- Blindaje auto-vínculo de pedidos (`orders.service.ts`): pedidos en `DELIVERED`/`IN_ROUTE` sin lote asignado se vinculan automáticamente por FIFO a fracciones con stock libre (`freeLiters >= 0.05`), sincronizando bidireccionalmente el estado del lote a `AGOTADO`.
- Balance financiero real de lotes y fracciones: cálculo proporcional de ingresos netos tras descuentos (`actualRevenue`, `financialBalance`), visualizando total facturado, cobrado, pendiente y descuentos otorgados.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: imports no utilizados en `.vue` botan TS6133 y rompen `npm run build` en Render.
- PowerShell bloquea `npx` directo y rompe comillas con paréntesis `(crm)` → usar comillas estándar o `cmd.exe /c`.
- Los saldos de balance/caja (`cashInHand`, `digitalBank`) son acumulados históricos, nunca deben filtrarse por la fecha del período.
- Baileys nunca debe auto-iniciarse en consultas `GET /status` ni dentro de `broadcastStatus()`.
- Código 440 (`connectionReplaced`) nunca debe borrar credenciales de la BD en rolling deploys.
- `Expense` y `StaffPayment` tienen IDs autoincrementales independientes: en egresos de caja, diferenciar siempre `isStaffPayment`.
- Modales en móvil: usar `max-h-[90dvh]` y 3 capas fijas (`header`/`footer` con `shrink-0`, cuerpo con `flex-1 overflow-y-auto`).
- Inputs `type="date"` en grids móviles: siempre aplicar `min-w-0` al contenedor/columna y `min-w-0 max-w-full` al input.
- Nunca evaluar `activePackagings.some(...)` para catalogar un ítem como pre-venta al editar pedidos: si el pedido agotó la fracción, ésta ya no aparece en disponibles y desvinculaba erróneamente el lote al guardar.

## Próximos pasos
- Diseñar e implementar el libro flexible de recetas de yogures y endulzantes/mermeladas para estandarizar sabores y rendimiento.

