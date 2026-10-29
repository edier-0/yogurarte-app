# Tareas de Implementación — Spec 001: Rendimiento Real en Fraccionamiento y Costeo de Preparaciones

## Lista de Tareas

- [x] **T1. Actualizar esquema Prisma y esquemas Zod con `baseLitersUsed` y `yieldPercentage`.** RF-3, RF-7, RF-12
  - Hecho cuando: `BatchPackaging` en `prisma/schema.prisma` contiene `baseLitersUsed` (`Float @default(0)`) y `yieldPercentage` (`Float? @default(100)`), `npx prisma db push && npx prisma generate` ejecutan exitosamente, y `batches.schema.ts` valida `baseLitersUsed`.

- [x] **T2. Crear pruebas de integración en rojo (TDD) para fraccionamiento con expansión de volumen y reversibilidad.** RF-3, RF-4, RF-7, RF-8, RF-12
  - Hecho cuando: `tests/batches.test.ts` incluye casos de prueba específicos que:
    1. Intentan envasar 6.0 L de base con 1.5 kg de fruta para 15 botellas de 500 ml (7.5 L comerciales) verificando descuento de 6 L de base y rendimiento del 125%.
    2. Intentan solicitar más litros base de los disponibles y verifican el rechazo con 400.
    3. Verifican reversión exacta de los 6 L de base al eliminar la fracción.
    Los tests fallan (rojo) antes de actualizar el servicio.

- [x] **T3. Implementar lógica de fraccionamiento con base láctea y rendimiento en `batches.service.ts`.** RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12
  - Hecho cuando: `createBatchPackaging`, `updateBatchPackaging` y `deleteBatchPackaging` descuentan y restauran `baseLitersUsed` del lote madre, calculan el costo total y el porcentaje de rendimiento, y los tests de T2 pasan en verde.

- [x] **T4. Validar y probar rendimiento y costeo neto en preparaciones de mermelada.** RF-13, RF-14, RF-15, RF-16
  - Hecho cuando: Existe prueba de integración en `tests/preparations.test.ts` que valida el registro de una preparación con cantidad neta real producida (mayor a la fruta cruda) y cálculo de costo promedio unitario exacto, ejecutando en verde.

- [x] **T5. Actualizar tipos e interfaces en store de producción frontend.** RF-3, RF-12
  - Hecho cuando: `frontend/src/stores/production.store.ts` incluye `baseLitersUsed` y `yieldPercentage` en `BatchPackagingPayload` y `BatchPackagingItem`, y `npx vue-tsc --noEmit` compila limpiamente.

- [x] **T6. Actualizar modal de fraccionamiento `PackagingModal.vue`.** RF-3, RF-4, RF-5, RF-6, RF-7, RF-8
  - Hecho cuando: El modal contiene el input de litros de base a tomar del lote madre (`baseLitersUsed`), genera la sugerencia reactiva de botellas estimadas según la fruta/azúcar, permite el ajuste libre de cantidades reales, y valida el tope contra la base disponible sin falso bloqueo por volumen comercial.

- [x] **T7. Actualizar modal de resumen `PackagingSummaryModal.vue`.** RF-10, RF-11, RF-12
  - Hecho cuando: La vista de resumen y auditoría de la fracción muestra: base consumida, volumen comercial envasado, porcentaje de rendimiento y costo unitario real por botella.

- [x] **T8. Verificación integral end-to-end y suite de regresión.** RF-1 al RF-16
  - Hecho cuando: Compilación backend (`npx tsc --noEmit`), compilación frontend (`npm --prefix frontend run build`) y suite completa de pruebas (`npx vitest run`) pasan al 100% sin advertencias ni regresiones.
