# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- Trabajo en curso (sin commit al init): auth (`auth.controller|schema|service`), `staff.service`, `auth.store`, `StaffModal.vue`, `UserModal.vue` nuevo (usuarios de acceso vs nómina).

## Decisiones (y por qué)
- Módulos (`routes` + controller delgado + service + Zod) para aislar dominio y no inflar controladores legacy.
- Alias de rutas (`/api/auth` y `/api/users`, clientes, caja) para no romper el frontend ni clientes viejos.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos.
- Caja por canal (efectivo vs Nequi/banco): refleja operación real y arqueos.
- Roles UI normalizados (`OPERADOR`/`ADMIN`/`DOMICILIARIO`) aunque la BD tenga `PRODUCCION`/`VENTAS`/`SOCIO`.
- Vitest secuencial contra Postgres: las suites se pisan el schema si corren en paralelo.
- Frontend HTTP único (`api/client.ts`): JWT, 401 y toasts consistentes.

## Aprendizajes y errores a evitar
- No fiarse del árbol del README (`src/controllers` como capa principal).
- No inventar ESLint: no hay script en `package.json`.
- No pegar secretos, JWT ni URLs de BD remota en docs (tampoco en `MEMORY.md`).

## Próximos pasos
- Cerrar y verificar el flujo de usuarios de sistema (`UserModal`) vs personal/nómina (`StaffModal`).
- Tras cambios de API, actualizar el `tests/<dominio>.test.ts` correspondiente.
