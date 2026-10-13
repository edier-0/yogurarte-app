# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- CRUD de usuarios del sistema operativo en frontend y backend.
- CRM WhatsApp: resuelto soporte para contactos registrados con @username o sin número previo, con apertura externa oficial garantizada y notificaciones claras.

## Decisiones (y por qué)
- Módulos (`routes` + controller delgado + service + Zod) para aislar dominio y no inflar controladores legacy.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos.
- Caja por canal (efectivo vs Nequi/banco): refleja operación real y arqueos. Tesorería (`cashInHand`, `digitalBank`) no se resetea por filtros de fecha.
- Costeo de producción Fase A/B: desacoplado `packagingCost` de `ProductionBatch.totalCost`/`costPerLiter` base. Rentabilidad comercial calculada por fracción en Fase B.
- KPI "Disponible para Ventas": calcula litros desde stock libre envasado en Fase B (`BatchPackaging.freeLiters`).
- Fallback externo y usernames en CRM WhatsApp: Baileys requiere JID numérico o LID y no puede iniciar chats con solo @username. Se implementó utilidad universal `buildWhatsAppUrl` (`?username=` y `?phone=`), botón "Abrir WhatsApp" en cabecera y barra de chat de `CrmView.vue`, acción rápida en `ClientChatInfo.vue`, chip identificador `@usuario WA` y toasts interactivos con acción directa "Abrir en WhatsApp" ante cualquier fallo interno.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: imports no utilizados en `.vue` botan TS6133 y rompen `npm run build` en Render.
- PowerShell bloquea `npx` directo y rompe comillas con paréntesis `(crm)` → usar comillas estándar o `cmd.exe /c`.
- Los saldos de balance/caja (`cashInHand`, `digitalBank`) son acumulados históricos, nunca deben filtrarse por la fecha del período.
- Baileys no puede inventar un JID a partir de un username de WhatsApp; la vía oficial garantizada es abrir `https://api.whatsapp.com/send/?username=${user}&text=${msg}`.
- Nunca silenciar errores en Axios con `err.message` genérico; extraer siempre `err?.response?.data?.error || err?.response?.data?.message` para feedback claro al usuario.

## Próximos pasos
- Monitorear el despliegue automático en Render (CI/CD activo en GitHub). Continuar con las siguientes prioridades operativas de YogurArte.
