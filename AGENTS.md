# AGENTS.md — YogurArte

ERP/CRM a medida para **YogurArte** (yogur artesanal, Fonseca, La Guajira): digitalizar producción, pedidos, caja, inventario y CRM WhatsApp.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas): resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).

## Stack y estructura
- Backend: Node.js 20+, TypeScript 5.6 (`"type": "module"`, `NodeNext`), Express 4, Prisma 5.19, PostgreSQL 16, Zod 4, JWT, Socket.IO, Baileys.
- Frontend: Vue 3 (`<script setup lang="ts">`), Vite 5, Vue Router 4, Pinia, Tailwind 3.4, Reka UI, Axios. Alias `@` → `frontend/src`.
- Pruebas: Vitest + Supertest (secuencial). CI: `.github/workflows/ci.yml`. No hay script de ESLint/Prettier.
- `src/app.ts` monta la API; `src/modules/<dominio>/` es la capa canónica (routes, controller, service, schema Zod). `src/shared/` = AppError y middlewares. `src/services/` = WhatsApp (no REST). `prisma/schema.prisma` = modelo de datos. `frontend/src/` = SPA. `tests/` = integración. `public/` = build Vite + uploads.
- Restos de migración: `src/controllers/`, `src/routes/`, `src/schemas/` — no agregar features ahí.

## Comandos
```bash
npm install && npm --prefix frontend install
copy .env.example .env
npx prisma generate && npx prisma db push && npx prisma db seed
npm run dev
npm run dev:client
npx tsc --noEmit
npm test
npx vitest run tests/orders.test.ts
npm run build && npm start
docker compose up --build -d
```
API `http://localhost:3000`. Vite `http://localhost:5173` (proxy `/api` y `/socket.io`). Pruebas necesitan Postgres (`DATABASE_URL` o `TEST_DATABASE_URL` local/CI).

## Convenciones
- Comentarios, UI y errores de API en **español**.
- Imports ESM en `.ts` con sufijo `.js` (`./orders.service.js`). Referencia: `src/modules/orders/`.
- Controlador delgado (`next(error)`); servicio con Prisma y `AppError`. Validar con Zod + `validateBody`/`validateQuery`/`validateParams`.
- HTTP del cliente solo vía `frontend/src/api/client.ts`. Rutas/RBAC: `frontend/src/router/routes.ts`. Roles UI: `ADMIN` | `OPERADOR` | `DOMICILIARIO`; `normalizeRole` en `auth.store.ts` mapea `PRODUCCION`/`VENTAS`/`SOCIO`.
- Conservar alias de rutas (`/api/auth` + `/api/users`, clientes, caja).

## Reglas de dominio / trampas conocidas
- Deuda del cliente **no** es columna: pedidos entregados menos `OrderPayment`.
- Caja bimonetaria: no mezclar `EFECTIVO` con `NEQUI`/`BANCOLOMBIA`.
- Fase A = `ProductionBatch`; Fase B = `BatchPackaging` (descuento de inventario y recetas compuestas).
- Entrega: `PREPARING` → `IN_ROUTE` → `DELIVERED` / `CANCELLED`.
- Fidelización 10+1 = botellas 1 L completadas, no un contador arbitrario.
- WhatsApp: no borrar sesión para “arreglar” reconexión (401 vs 440/515).
- El README (árbol `src/controllers`) está desactualizado; fiarse de `app.ts` y `modules/`.
- Transacciones Prisma cuando stock, caja y pagos deban coincidir. No editar el cliente generado.

## Forma de trabajar
- Planificar antes de tocar código si el cambio cruza módulos (caja + pedidos, lote + inventario) o el contrato de datos.
- Cambios pequeños y alineados al patrón del módulo/vista de referencia.
- Al terminar: qué se hizo, cómo se verificó y actualizar `MEMORY.md`.

## Límites
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- ✅ Siempre: seguir `src/modules/` + `app.ts`; typecheck/pruebas del dominio tocado; no commitear `.env` ni secretos.
- ⚠️ Pregunta antes: dependencias nuevas, archivos/módulos nuevos, migraciones Prisma, cambiar formato de datos o romper alias de API.
- 🚫 Nunca: credenciales/tokens en docs o código; features en carpetas legacy; mezclar canales de caja; persistir deuda en `Customer`; lint/format inventados; wipe de auth WhatsApp sin pedirlo.

## Verificación
- Backend: `npx tsc --noEmit` y `npx vitest run tests/<dominio>.test.ts` (o `npm test`). Golden-master de costeo/lotes: `tests/golden_master.test.ts`.
- Frontend: flujo en el navegador (o Vite) en las rutas que comparten el estado; no basta un screenshot.
- UI: desktop y móvil si cambió layout. Corregir regresiones antes de dar por cerrado.
