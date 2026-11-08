# Desglose de Tareas de Implementación — Spec 011

Estado: borrador (esperando aprobación del usuario para iniciar T1)

> **Regla de Desarrollo TDD & SDD**:
> Cada tarea se aborda de forma atómica (~20-30 min), escribiendo primero la prueba que falle en rojo (Patrón Prove-It), implementando el código mínimo para ponerla en verde (`vitest` / `tsc`), refactorizando, marcando la tarea y deteniéndose para revisión.

---

## Lista de Tareas

- [x] **T1: Suite de pruebas base y validación de esquemas Zod (Backend)**
  - **Alcance**:
    - Crear el archivo de pruebas [`tests/dynamic_packaging_fase_b.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/dynamic_packaging_fase_b.test.ts) con las pruebas de validación de los esquemas Zod.
    - Actualizar [`src/modules/batches/batches.schema.ts`](file:///c:/Users/edier/Documents/YOGURES/src/modules/batches/batches.schema.ts):
      - Soportar opcionalmente `gramsPerBottle: z.coerce.number().min(0).optional()` en `packagingExtraItemSchema`.
      - Permitir precio $\ge 0$ en `batchPackagingSchema` y `updateBatchPackagingSchema`.
      - Validar estructura mono-presentación de `containers` manteniendo compatibilidad pasiva con `bottles1L` y `bottles2L`.
  - **Verificación**: `npx vitest run tests/dynamic_packaging_fase_b.test.ts` (esquemas en verde) y `npx tsc --noEmit`.

- [x] **T2: Servicio Backend de Creación de Envasado Dinámico Mono-Presentación (Fase B)**
  - **Alcance**:
    - Escribir prueba en rojo en [`tests/dynamic_packaging_fase_b.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/dynamic_packaging_fase_b.test.ts) que simule la creación de una fracción de 500 ml con persistencia canónica en `containers`, consumo en kg derivado de `gramsPerBottle`, rendimiento volumétrico $> 100\%$ sin error de sobrecupo y bloqueo estricto por falta de stock.
    - Implementar en `createBatchPackaging` en [`src/modules/batches/batches.service.ts`](file:///c:/Users/edier/Documents/YOGURES/src/modules/batches/batches.service.ts):
      - Extracción y consumo de envase desde `containers` validando existencias.
      - Validación de stock de etiquetas si `useLabels = true` y omisión si `useLabels = false`.
      - Descuento de insumos extras calculados en kg a partir de `gramsPerBottle` o `quantityUsed`, bloqueando si falta stock.
      - Respeto del `baseLitersUsed` ingresado por el operario validándolo contra el saldo del tanque madre (Constitución Art. 5.6).
      - Vinculación atómica de pedidos a nivel de ítem.
  - **Verificación**: `npx vitest run tests/dynamic_packaging_fase_b.test.ts` en verde.

- [x] **T3: Servicio Backend de Edición, Inmutabilidad y Ajuste Diferencial en Kardex (Fase B)**
  - **Alcance**:
    - Escribir prueba en rojo en [`tests/dynamic_packaging_fase_b.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/dynamic_packaging_fase_b.test.ts) que verifique la inmutabilidad de la presentación en fracciones mono-presentación, el ajuste diferencial ($\text{newDelta} - \text{oldDelta}$) en Kardex, el guardado con $\Delta = 0$ sin exigir stock adicional, y el bloqueo si $\text{nuevasBotellas} < \text{botellasEntregadas}$.
    - Implementar en `updateBatchPackaging` en [`src/modules/batches/batches.service.ts`](file:///c:/Users/edier/Documents/YOGURES/src/modules/batches/batches.service.ts):
      - Bloqueo de alteración de presentación en fracciones existentes.
      - Cálculo y aplicación del diferencial neto en Kardex para botellas, etiquetas y fruta.
      - Validación de integridad contra entregas a clientes ($\text{nuevasBotellas} \ge \text{botellasEntregadas}$).
      - Ajuste diferencial de `baseLitersUsed` contra el balance del tanque de fermentación de Fase A.
  - **Verificación**: `npx vitest run tests/dynamic_packaging_fase_b.test.ts` en verde.

- [x] **T4: Frontend - Rediseño del Modal a 3 Capas Fijas y Selector Dinámico de Presentaciones Activas**
  - **Alcance**:
    - Modificar [`frontend/src/components/production/PackagingModal.vue`](file:///c:/Users/edier/Documents/YOGURES/frontend/src/components/production/PackagingModal.vue):
      - Blindar la estructura de 3 capas fijas: `header shrink-0`, cuerpo `flex-1 min-h-0 overflow-y-auto`, `footer shrink-0` (Constitución Art. 10.2).
      - Eliminar el botón manual "Agregar nueva presentación" y la sección legacy de formatos opcionales.
      - Implementar el selector interactivo de pestañas dinámicas con `productionStore.activePresentations`, seleccionando por defecto 1L (o la de menor capacidad determinista conforme a RF-1).
      - Campo único para ingresar botellas a envasar con validación de enteros $\ge 1$ y cálculo volumétrico inmediato redondeado a 2 decimales.
      - Preselección automática del envase vinculado en catálogo con visualización de stock y alerta roja de insuficiencia.
  - **Verificación**: `npm --prefix frontend run build` (validación de `vue-tsc` y empaquetado Vite).

- [x] **T5: Frontend - Base Láctea Reactiva (`isBaseLitersManual`), Rendimiento y Dosificación por Envase**
  - **Alcance**:
    - Actualizar [`frontend/src/components/production/PackagingModal.vue`](file:///c:/Users/edier/Documents/YOGURES/frontend/src/components/production/PackagingModal.vue):
      - Implementar la bandera reactiva `isBaseLitersManual`: sincronizada automáticamente mientras no se edite; fija y respetada al ingresar por teclado (`@input`), sin sobrescribirse al cambiar botellas (Constitución Art. 5.6).
      - Exhibir en tiempo real el porcentaje de rendimiento volumétrico con protección contra división por cero (`0%` si base es 0).
      - Sección de insumos extras:
        - Opcional para sabor 'Natural' o sin adiciones.
        - Campo de dosificación en `gramsPerBottle` para insumos pesables con rotulado contextual (ej. `g / botella (500ml)`).
        - Conversión automática a kilogramos totales en tiempo real con costo proyectado.
        - Limpieza de dosis al alternar entre pestañas de presentación (RF-11).
        - Validación estricta que deshabilite el botón de guardado (`stockOk = false`) si falta stock de envase, etiquetas activas o fruta.
  - **Verificación**: `npm --prefix frontend run build` en verde.

- [x] **T6: Frontend - Pre-ventas con Saldo Remanente Dinámico y Modo Edición Seguro**
  - **Alcance**:
    - Actualizar [`frontend/src/components/production/PackagingModal.vue`](file:///c:/Users/edier/Documents/YOGURES/frontend/src/components/production/PackagingModal.vue):
      - Filtrar pedidos pendientes por sabor y presentación activa, mostrando únicamente las botellas y subtotal correspondientes al ítem de la medida envasada en pedidos mixtos.
      - Control reactivo de saldo remanente libre: deshabilitar checkboxes de pedidos que excedan las botellas disponibles del lote para impedir sobreventas.
      - Reiniciar la selección de pedidos (`selectedOrderIds = []`) al alternar pestañas.
      - Modo edición:
        - Fracciones históricas mixtas: banner de auditoría/solo lectura con bloqueo de guardado de mezclas.
        - Fracciones mono-presentación: bloqueo de pestañas, rehidratación exacta de `gramsPerBottle` a partir de kg consumidos, y validación visual con advertencia si $\text{nuevasBotellas} < \text{entregadas}$.
  - **Verificación**: `npm --prefix frontend run build` en verde.

- [x] **T7: Pruebas de Integración End-to-End, Verificación de Regresión y Cierre de Calidad**
  - **Alcance**:
    - Ejecutar suite completa de pruebas [`tests/dynamic_packaging_fase_b.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/dynamic_packaging_fase_b.test.ts) cubriendo todos los RF y casos límite.
    - Ejecutar verificación de regresión en pruebas existentes de lotes [`tests/batches.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/batches.test.ts) y fidelización [`tests/loyalty_phase_b_audit.test.ts`](file:///c:/Users/edier/Documents/YOGURES/tests/loyalty_phase_b_audit.test.ts).
    - Verificar compilación global: `npx tsc --noEmit` y `npm --prefix frontend run build`.
    - Actualizar [`MEMORY.md`](file:///c:/Users/edier/Documents/YOGURES/MEMORY.md).
  - **Verificación**: 100% de pruebas en verde y builds limpios.
