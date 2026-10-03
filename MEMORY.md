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
- En compras de inventario (`createPurchase`), el proveedor se persiste en `Expense.supplier` y al editar gastos de insumos se sincroniza con `Purchase.supplier`.
- Flujo de caja en `finance.service`: compras con `registerExpense: true` se consolidan vía `Expense` para evitar doble resta en caja y evitar duplicados con ID cruzado en movimientos.
- Eliminación sincronizada bidireccional: al eliminar un gasto o una compra de insumos, se revierte el stock en `RawMaterial`, se eliminan ambos registros (`Purchase` y `Expense`) atómicamente y se restaura el saldo en caja sin generar 404 por ID cruzado.
- Multimedia WhatsApp en CRM: unwrapping recursivo (`viewOnce`, `ephemeral`), persistencia Base64 en Postgres para imágenes `<= 500 KB` (inmune a Render), fallback a `jpegThumbnail` para imágenes salientes del móvil, proxy `/uploads` en Vite y visor Lightbox en `CrmView.vue`.
- Costeo de producción Fase A/B: desacoplado `packagingCost` de `ProductionBatch.totalCost`/`costPerLiter`. El costo base por litro representa estrictamente la base láctea líquida. Cada fracción envasada (`BatchPackaging`) calcula su costo total sumando `(litros * costPerLiter base) + packagingCost`, evitando duplicación de costos.
- Control de insumos y stock en lotes: en `BatchModal.vue` alerta en tiempo real y bloqueo si la leche requerida supera el stock; en `CompleteFermentationModal.vue` entrada dual (báscula en gramos vs dosis g/L), alertas de insumos ya usados en Fase A y prevención de doble adición de azúcar.
- Rentabilidad comercial en Fase B: `calculatePackagingProfitability` calcula ganancia neta por litro (`precioVenta/L - costoFracción/L`), margen bruto %, utilidad total proyectada y utilidad realizada de unidades vendidas. Expuesto en tarjetas de Fase B (`BatchesView.vue`) y con KPIs destacados y tabla comparativa en auditoría de fracción (`PackagingSummaryModal.vue`).
- KPI de lote "Disponible para Ventas": calcula los litros libres envasados directamente desde las fracciones activas de Fase B (`BatchPackaging.freeLiters`), evitando calcularlos desde el lote madre (que causaba desfase con doble deducción de pedidos e ignoraba el stock real en botellas). Añadido `unpackagedBaseLiters` para reflejar saldo líquido en tanque aún no envasado.

## Aprendizajes y errores a evitar
- `vue-tsc` corre con `noUnusedLocals: true`: imports no utilizados en `.vue` botan TS6133 y rompen `npm run build` en Render.
- `npm audit --omit=dev --audit-level=high` en CI rompe ante nuevos advisories en dependencias de producción (ej. nodemailer).
- PowerShell bloquea `npx` directo → usar siempre `cmd.exe /c "..."`.
- PowerShell no soporta `&&` → usar `cmd.exe /c` para encadenar comandos.
- Baileys falla la descarga de buffer en fotos enviadas desde la app móvil si no sincroniza llaves; usar `jpegThumbnail` en Base64 evita imágenes en blanco.
- Sin proxy `/uploads` en Vite, las imágenes locales del CRM retornan 404 en desarrollo (:5173).
- Nunca acumular el costo de empaque/botellas dentro del lote madre (`ProductionBatch.totalCost`), de lo contrario se infla el costo por litro base y se duplica en los resúmenes de envasado.

## Próximos pasos
- Coordinar con el usuario la fusión de `feat/phase-b-packaging-profit-per-liter-audit` a `develop` y `main` y despliegue.
