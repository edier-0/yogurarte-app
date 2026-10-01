# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App ERP/CRM en uso: producción (Fase A/B), inventario, pedidos/domicilio, caja bimonetaria, créditos, personal y CRM WhatsApp (Baileys + Socket.IO).
- API canónica en `src/modules/` montada desde `src/app.ts`. Carpetas `src/controllers|routes|schemas` son restos; no son la fuente de verdad.
- Contexto de agentes listo: `AGENTS.md`, `MEMORY.md`, `.cursor/rules/` (español).
- CRUD de usuarios del sistema operativo en frontend y backend.
- Reparado CI y Render: corregido TS6133 en `StaffView.vue` y actualizado `nodemailer@10.0.13` por advisory de seguridad high.

## Decisiones (y por qué)
- Módulos (`routes` + controller delgado + service + Zod) para aislar dominio y no inflar controladores legacy.
- Alias de rutas (`/api/auth` y `/api/users`, clientes, caja) para no romper el frontend ni clientes viejos.
- Deuda calculada, no columna: evita saldos desfasados respecto a pagos.
- Caja por canal (efectivo vs Nequi/banco): refleja operación real y arqueos.
- Roles UI normalizados (`OPERADOR`/`ADMIN`/`DOMICILIARIO`) aunque la BD tenga `PRODUCCION`/`VENTAS`/`SOCIO`.
- Vitest secuencial contra Postgres: las suites se pisan el schema si corren en paralelo.
- Frontend HTTP único (`api/client.ts`): JWT, 401 y toasts consistentes.
- `build:frontend` usa `npm --prefix frontend ci` para evitar mutación de package.json y build reproducible.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: imports no utilizados en `.vue` botan TS6133 y rompen `npm run build` en Render.
- `npm audit --omit=dev --audit-level=high` en CI rompe ante nuevos advisories en dependencias de producción (ej. nodemailer).
- PowerShell bloquea `npx` directo → usar siempre `cmd.exe /c "..."`.
- PowerShell no soporta `&&` → usar `cmd.exe /c` para encadenar comandos.

## Próximos pasos
- Monitorear GitHub Actions y despliegue automático en Render tras push a `develop` y `main`.
