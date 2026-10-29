# Tareas — Spec 003: Búsqueda Inteligente de Insumos y Gestión de Elaboraciones

- [ ] **T1. Backend: Esquema Zod y Endpoint de Edición `PUT /api/preparations/:id`.** RF-12, RF-13
  - Hecho cuando: `updatePreparationSchema` valide `preparationDate`, `notes` y `registeredBy`, la ruta `PUT /api/preparations/:id` esté expuesta y el servicio actualice los metadatos sin alterar existencias de inventario.

- [ ] **T2. Backend: Salvaguarda de Stock Negativo en Anulación y Tests de Integración.** RF-9, RF-10
  - Hecho cuando: `deletePreparation` valide que el stock actual del producto elaborado sea suficiente para la reversión (lanzando `BadRequestError` si es menor), ejecute la reversión atómica de materias primas y todos los tests de `tests/preparations.test.ts` pasen en verde.

- [ ] **T3. Frontend: Función Pura `filterSelectOptions` y Tests Unitarios.** RF-1, RF-5
  - Hecho cuando: `frontend/src/utils/searchUtils.ts` normalice acentos/mayúsculas y filtre por nombre, código y categoría, con 100% de tests pasando en `tests/searchUtils.test.ts`.

- [ ] **T4. Frontend: Componente Reutilizable `SearchableSelect.vue`.** RF-1, RF-2, RF-3, RF-4, RF-5, RNF-1, RNF-4
  - Hecho cuando: El componente soporte búsqueda predictiva, dropdown flotante, badges de stock disponible, teclado (flechas, Enter, Escape) y botón de limpieza, adaptado a modo claro/oscuro y móvil.

- [ ] **T5. Frontend: Integración de `SearchableSelect` en Modales de Insumos y Producción.** RF-1 a RF-5
  - Hecho cuando: Los modales `PrepareCompoundModal.vue`, `PurchaseStockModal.vue`, `InventoryMovementModal.vue`, `MaterialModal.vue` y `PackagingModal.vue` reemplacen los `<select>` por `SearchableSelect` y permitan buscar insumos escribiendo en tiempo real.

- [ ] **T6. Frontend: Modal de Edición y Pestaña de Historial de Elaboraciones en `InventoryView.vue`.** RF-6, RF-7, RF-8, RF-11, RF-12
  - Hecho cuando: `InventoryView.vue` incluya la pestaña "Elaboraciones" con listado detallado de materias primas consumidas, modal `EditPreparationModal.vue` operativo y botón "Anular / Deshacer" con confirmación y reversión en tiempo real.

- [ ] **T7. Validación Integral, Typecheck y Build Final.** Todos los RFs
  - Hecho cuando: `npx tsc --noEmit` reporte 0 errores, `npm --prefix frontend run build` complete exitosamente y la suite completa de pruebas corra en verde.
