# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.5.0) y AGENTS.md consagran el principio de rendimiento volumétrico en Fase B e insumos compuestos.
- Spec 013 (`specs/013-flexibilidad-integral-presentaciones/`): 100% implementada, probada e integrada.
- PR #32 fusionado en `develop`, sincronizado a `main` y publicado en producción. Rama temática eliminada limpiamente.
- Flexibilidad multi-presentación integral: pedidos, CRM compras frecuentes, fidelización 10+1 y vinculación masiva en Fase B libres de columnas fijas 1L/2L.
- Quality Gates en verde: `tsc --noEmit` (0 errores), `npm --prefix frontend run build` (0 errores) y `vitest` (253/253 tests pasando en 24 suites).
- Rama actual: `develop` limpia y sincronizada con `origin/develop`.

## Decisiones (y por qué)
- Spec 013 — Culminación integral:
  1. T4 (Fidelización 10+1): bloqueo estricto con HTTP 400 si el cliente registra cartera pendiente de pago (`pendingDebt > 0`); canje acotado a 1x 1L o 2x 500ml multi-sabor con control atómico de stock por fracción y descargos a $0 COP (`PREMIO_FIDELIZACION`).
  2. T5 (Vinculación Fase B): `linkOrdersToPackaging` y `getPendingOrdersByFlavor` filtran pedidos pendientes considerando simultáneamente sabor y presentación coincidente (`matchPresentationFormat`), impidiendo vinculaciones erróneas.
  3. T6 (Selector Lotes Pedidos): lotes filtrados dinámicamente según la presentación del ítem (`freeUnits >= 1`), eliminación de pastillas 1L/2L, alerta reactiva y bloqueo ante stock insuficiente.
  4. T7 (Suscripciones CRM): canasta mixta de productos (`items Json`), cotización oficial dinámica y pausa automática con aviso ante ítems descontinuados.
  5. T8 (Modal Fidelización CRM): opciones limitadas a 1x 1L o 2x 500ml con selectores independientes multi-sabor y bloqueo visual si existe deuda pendiente.
  6. T9 (Constitución Art. 5.5): segregación total en `BatchSummaryModal.vue`, auditando solo base láctea a granel en Fase A y presentaciones comerciales en Fase B.
- Ciclo Git PR Workflow completado: PR #32 aprobado y fusionado en `develop`, sincronizado directamente a `main`, y rama eliminada tras autorización.

## Aprendizajes y errores a evitar
- Sincronizar tanto `public` como `yogurarte_test` (`schema=yogurarte_test`) al agregar columnas con `prisma db push`.
- Si `npx prisma generate` arroja EPERM en Windows, verificar y detener procesos de desarrollo que tengan abierta la DLL (`query_engine-windows.dll.node`).
- Git PR Workflow: El agente debe preguntar siempre al usuario antes de abrir el PR, antes de fusionarlo y antes de eliminar ramas.

## Próximos pasos
- El sistema se encuentra en un estado 100% estable, probado y sincronizado en `develop` y `main`. A la espera de nuevas instrucciones o requerimientos del usuario.
