# AGENTS.md — YogurArte

ERP/CRM a medida para **YogurArte** (yogur artesanal, Fonseca, La Guajira): digitalizar producción, pedidos, caja, inventario y CRM WhatsApp.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una fase o tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
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
API `http://localhost:3000`. Vite `http://localhost:5173` (proxy `/api` y `/socket.io`). Pruebas necesitan Postgres (`DATABASE_URL` o `TEST_DATABASE_URL` local/CI). En Windows PowerShell: usar `cmd.exe /c "..."` si `npx` está restringido o para encadenar comandos con `&&`.

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
- `User` ≠ `StaffMember`: `User` = cuentas de acceso/login al sistema (sin dependencias FK). `StaffMember` = nómina, colaboradores y liquidaciones de jornales/socios.

## Metodología y Forma de trabajar (Skill SDD)
- Para cualquier cambio, nueva funcionalidad o refactorización en el aplicativo, usar obligatoriamente la skill `sdd` (`.agent/skills/sdd/SKILL.md`).
- Flujo canónico: **Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio**.
- Reglas mandatorias del flujo SDD:
  - **Aprobación de fases**: Nunca pasar a la siguiente fase sin la aprobación explícita del usuario.
  - **La spec manda**: Si algo no está en la spec, no se implementa. Si falta una decisión o requisito, parar y preguntar.
  - **Orden de requisitos**: Cualquier cambio de requisitos se hace primero en la spec (`spec.md`), luego en el plan (`plan.md`) y tareas (`tasks.md`), y por último en el código.
  - **Ubicación de specs**: Cada spec vive en su carpeta: `specs/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md`.
  - **Requisitos en EARS (en español)**: `CUANDO... EL SISTEMA...`, `SI... ENTONCES EL SISTEMA...`, `MIENTRAS... EL SISTEMA...`, `EL SISTEMA...`. Cada RF debe ser medible y verificable.
  - **Implementación atómica**: Una sola tarea a la vez (~20-30 min): tests primero en rojo, código, verificar en verde (`vitest` / pruebas del módulo), marcar la tarea y parar para feedback.
  - **Actualización continua**: Al terminar cada fase o tarea, actualizar `MEMORY.md`.

## Flujo Git, Fusión y Limpieza de Ramas
- **Ramas permanentes**: Únicamente existen dos ramas permanentes: `develop` (integración y desarrollo) y `main` (producción).
- **Creación de ramas**: Para cualquier tarea o cambio, se crea una rama temática (`feat/<kebab-case>`, `fix/<kebab-case>`, `refactor/<kebab-case>`) partiendo siempre de `develop`. No commitear directo en `develop` ni `main`.
- **Mensajes de commit**: Conventional Commits (`fix(scope): ...`, `feat(scope): ...`, `docs: ...`) con descripción en español.
- **Ciclo de fusión**:
  1. Verificar compilación y tipos (`npx tsc --noEmit` y build frontend).
  2. Fusionar la rama temática en `develop`.
  3. Fusionar posteriormente en `main`.
- **Eliminación de ramas**:
  - Tras fusionar con éxito en `develop` y `main`, la rama temática se elimina en local y en remoto.
  - **REGLA ESTRICTA**: Antes de proceder con el borrado de cualquier rama (local o remota), **se debe solicitar siempre autorización explícita al usuario**.

## Límites
- ✅ Siempre: seguir la skill `sdd` para realizar cambios en el aplicativo (especificar y validar antes de codificar).
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea o fase de SDD.
- ✅ Siempre: seguir `src/modules/` + `app.ts`; typecheck/pruebas del dominio tocado; no commitear `.env` ni secretos.
- ✅ Siempre: crear rama desde `develop`, fusionar en `develop` luego en `main`, y pedir confirmación antes de borrar la rama.
- ⚠️ Pregunta antes: dependencias nuevas, archivos/módulos nuevos, migraciones Prisma, cambiar formato de datos, romper alias de API o **eliminar cualquier rama local o remota**.
- 🚫 Nunca: eliminar ramas locales o remotas sin previa confirmación del usuario.
- 🚫 Nunca: implementar código sin spec, plan y tareas aprobados por el usuario según la metodología de la skill `sdd`.
- 🚫 Nunca: pasar a la siguiente fase de SDD sin aprobación explícita del usuario.
- 🚫 Nunca: credenciales/tokens en docs o código; features en carpetas legacy; mezclar canales de caja; persistir deuda en `Customer`; lint/format inventados; wipe de auth WhatsApp sin pedirlo; commitear directo a `main` o `develop`.

## Verificación
- Backend: `npx tsc --noEmit` y `npx vitest run tests/<dominio>.test.ts` (o `npm test`). Golden-master de costeo/lotes: `tests/golden_master.test.ts`.
- Frontend: `npm --prefix frontend run build` (valida `vue-tsc` con `noUnusedLocals` y empaquetado Vite). Probar flujo en el navegador en las rutas que comparten estado.
- UI: desktop y móvil si cambió layout. Corregir regresiones antes de dar por cerrado.
