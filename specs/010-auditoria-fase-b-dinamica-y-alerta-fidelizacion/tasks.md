# Tareas de Implementación — Spec 010: Auditoría Dinámica de Presentaciones en Fase B y Alerta Proactiva de Fidelización

- [x] **T1. Optimización de consulta de fidelización por cliente en backend.** RF-1, RF-2
  - Archivos: `src/modules/crm/crm.schema.ts`, `src/modules/crm/crm.service.ts`
  - Hecho cuando: `getLoyaltyQuerySchema` admite `customerId` y `getLoyaltyOverview` filtra la consulta directamente en PostgreSQL cuando se especifica `customerId`, retornando los datos de fidelización del cliente en milisegundos.

- [x] **T2. Segregación de descargos por fidelización y cálculo dinámico en auditoría de lotes.** RF-4, RF-5, RF-6, RF-7
  - Archivos: `src/modules/batches/batches.service.ts`
  - Hecho cuando: `computePackagingPresentations` desglosa `loyaltyDischarged` (`PREMIO_FIDELIZACION`) y `partnerDischarged` (`CONSUMO_SOCIO`) por presentación y a nivel general de la fracción, y `getBatchSummary` suma dinámicamente los ingresos proyectados sin presuponer columnas 1L/2L fijas.

- [x] **T3. Pruebas automatizadas de integración para fidelización y auditoría de Fase B.** RF-1, RF-4, RF-5
  - Archivos: `tests/loyalty_phase_b_audit.test.ts`
  - Hecho cuando: Vitest ejecuta y pasa en verde una suite de pruebas que valida el filtro individual por cliente, el canje atómico de fidelización y la auditoría dinámica con desgloses de botellas premiadas a $0 COP.

- [x] **T4. Alerta reactiva de fidelización y conexión con canje en `OrderFormModal.vue`.** RF-1, RF-2, RF-3
  - Archivos: `frontend/src/components/operations/OrderFormModal.vue`
  - Hecho cuando: Al seleccionar un cliente con saldo disponible (`rewardsAvailable > 0`) se renderiza un banner informativo verde esmeralda con acción rápida que abre `RedeemRewardModal.vue` con el cliente preseleccionado sin perder los productos digitados en la orden.

- [x] **T5. Auditoría dinámica de presentaciones y rotulado de fidelización en `PackagingSummaryModal.vue`.** RF-4, RF-5
  - Archivos: `frontend/src/components/production/PackagingSummaryModal.vue`
  - Hecho cuando: La tabla de presentaciones muestra las salidas por fidelización diferenciadas, y en la pestaña de bajas se etiquetan con badge `🎁 Premio Fidelización (10+1)` a $0 COP los descargos comerciales.

- [x] **T6. Validación integral del sistema, tipos TypeScript y empaquetado frontend.** RF-1 al RF-7
  - Archivos: Proyecto global
  - Hecho cuando: `npx tsc --noEmit`, `npm --prefix frontend run build` y la suite completa de pruebas en backend pasen al 100% en verde sin errores ni advertencias de tipo.
