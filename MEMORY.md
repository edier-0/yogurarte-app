# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- CRUD de usuarios del sistema operativo en frontend y backend.
- CRM WhatsApp: resuelta desincronización de estado `CONNECTING` en Baileys v7 con auto-reconciliación proactiva y desbloqueo de envío de mensajes en backend y frontend.

## Decisiones (y por qué)
- Módulos (`routes` + controller delgado + service + Zod) para aislar dominio y no inflar controladores legacy.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos.
- Caja por canal (efectivo vs Nequi/banco): refleja operación real y arqueos. Tesorería (`cashInHand`, `digitalBank`) no se resetea por filtros de fecha.
- Costeo de producción Fase A/B: desacoplado `packagingCost` de `ProductionBatch.totalCost`/`costPerLiter` base. Rentabilidad comercial calculada por fracción en Fase B.
- KPI "Disponible para Ventas": calcula litros desde stock libre envasado en Fase B (`BatchPackaging.freeLiters`).
- Fallback externo y usernames en CRM WhatsApp: Baileys requiere JID numérico o LID. Se implementó utilidad universal `buildWhatsAppUrl`, acción rápida y toasts interactivos "Abrir en WhatsApp".
- Auto-reconciliación de sesión Baileys: en Baileys v7 tras reconnect en Neon, `sock.user` se autentica y procesa `messages.upsert` sin requerir evento estricto `connection: open`. Se reconcilia a `CONNECTED` en `getStatus()`, `creds.update`, `messages.upsert` y `sendMessage()`. En frontend, `isWhatsAppConnected` valida `connectedPhoneNumber` y efectúa reconciliación ligera si está en `CONNECTING` sin QR.
- Categorización visual de gastos: selector de 6 categorías oficiales en cuadrícula interactiva con iconos en `ExpenseModal.vue` e `initialCategory` sincronizada con los chips de `ExpensesView.vue`. Backend agrupa sinónimos con `{ in: [...] }` para retrocompatibilidad con BD.
- Edición de nómina en egresos y personal: `StaffPayment` en egresos de caja enruta a `PUT /api/staff/payments/:id` y `DELETE /api/staff/payments/:id` para evitar error 404 'Gasto no encontrado'. `updateExpense` y `deleteExpense` integran fallback a `StaffPayment`. `StaffView.vue` cuenta con edición y eliminación directa en el historial de liquidaciones vía `StaffPaymentModal.vue`.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: imports no utilizados en `.vue` botan TS6133 y rompen `npm run build` en Render.
- PowerShell bloquea `npx` directo y rompe comillas con paréntesis `(crm)` → usar comillas estándar o `cmd.exe /c`.
- Los saldos de balance/caja (`cashInHand`, `digitalBank`) son acumulados históricos, nunca deben filtrarse por la fecha del período.
- Baileys puede recibir y sincronizar `messages.upsert` mientras la variable en memoria quedó en `CONNECTING`; nunca bloquear `sendMessage()` si `sock.user` existe.
- `Expense` y `StaffPayment` tienen IDs autoincrementales independientes: en egresos de caja, diferenciar siempre `isStaffPayment` para no colisionar con la tabla `Expense`.

## Próximos pasos
- Validar en producción Render y continuar con las siguientes prioridades operativas de YogurArte.
