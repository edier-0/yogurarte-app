# Tareas de Implementación — Spec 004: Presentaciones Flexibles de Producto, Pedidos Dinámicos y Fidelización Proporcional

## Lista de Tareas

- [x] **T1. Modelo Prisma, Semilla y Módulo Backend de Presentaciones (`ProductPresentation`).** RF-1, RF-2, RF-3, RF-4
  - Hecho cuando: El modelo `ProductPresentation` está definido en `prisma/schema.prisma` con relación opcional a `RawMaterial`; `npx prisma db push && npx prisma generate` se ejecutan sin errores; la semilla inicial en `prisma/seed.ts` incluye 1L (\$12.000), 2L (\$24.000) y 500ml (\$8.000); y se implementa el módulo canónico en `src/modules/production/presentations/` (schema, service, controller, routes) montado en `src/app.ts` (`/api/production/presentations`).

- [x] **T2. Pruebas automatizadas en rojo (TDD) para Catálogo de Presentaciones y Pedidos Dinámicos.** RF-1, RF-3, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10
  - Hecho cuando: Se crea `tests/presentations.test.ts` para validar el CRUD y toggle del catálogo; y se agregan pruebas de integración en `tests/orders.test.ts` que validen la creación de pedidos con botellas de 500ml a \$8.000 COP, cálculo volumétrico exacto (ej. 2x 500ml = 1.0L), totales de ítems y vinculación a lotes envasados. Las pruebas de pedidos fallan (en rojo) antes de refactorizar el servicio de órdenes.

- [x] **T3. Refactorización del motor de pedidos en `orders.service.ts` con soporte dinámico de presentaciones.** RF-6, RF-7, RF-8, RF-9, RF-10, RF-15
  - Hecho cuando: Se erradica en `orders.service.ts` cualquier condicional binario `size === '2L' ? 2.0 : 1.0` y precios fijos; se implementa `resolvePresentationLiters` y lectura del catálogo; se calculan `litersPerUnit`, `totalLiters` y `unitPrice` de forma exacta según la presentación; y las pruebas de T2 pasan al 100% en verde.

- [x] **T4. Fidelización proporcional y canje de recompensa de hasta 1 Litro en `crm.service.ts`.** RF-16, RF-17, RF-18, RF-19
  - Hecho cuando: `getLoyaltyOverview` en `crm.service.ts` calcula el progreso acumulando litros comercializados sobre base 1.0L (haciendo que 500ml sume 0.5 botellas equivalentes); y `redeemLoyaltyReward` valida y permite redimir presentaciones hasta 1.0L total de una fracción envasada con salida a \$0 COP. Pruebas en `tests/crm.test.ts` pasan en verde.

- [x] **T5. Estado reactivo y modal administrativo de presentaciones en Frontend.** RF-3, RF-4
  - Hecho cuando: `frontend/src/stores/production.store.ts` expone `presentations`, `activePresentations`, CRUD y acciones de toggle; y se crea `PresentationsManagementModal.vue` permitiendo a los administradores crear, editar precio/capacidad/envase y activar/pausar presentaciones desde la interfaz de Producción.

- [x] **T6. Dinamizar selector de presentaciones y precios en `OrderFormModal.vue`.** RF-5, RF-6, RF-7, RF-8
  - Hecho cuando: `OrderFormModal.vue` reemplaza el arreglo quemado `BOTTLE_SIZES` por las presentaciones activas del catálogo; al seleccionar una presentación (ej. 500 ml) auto-asigna su precio oficial (\$8.000 COP) y calcula litros exactos (`cantidad * capacidadLiters`), permitiendo edición manual del precio unitario por fila.

- [x] **T7. Actualizar modal de fraccionamiento `PackagingModal.vue` y reconocimiento en Fase B.** RF-11, RF-12, RF-13, RF-14, RF-15
  - Hecho cuando: `PackagingModal.vue` presenta la cuadrícula de presentaciones activas para ingresar unidades producidas de 500ml, 1L, 2L, etc.; pre-selecciona el insumo de envase asociado; desglosa las presentaciones de las pre-ventas pendientes; y `computePackagingPresentations` cruza pedidos y envases con precisión volumétrica.

- [x] **T8. Actualizar vista de Fidelización `LoyaltyTab.vue` en CRM.** RF-16, RF-17, RF-18, RF-19
  - Hecho cuando: `LoyaltyTab.vue` y `ClientChatInfo.vue` muestran el avance de fidelización con decimales si corresponde (ej. 8.5 / 10 botellas) y el diálogo de canje permite elegir la presentación a entregar (1L o 2 de 500ml) del lote seleccionado a \$0 COP.

- [x] **T9. Verificación integral end-to-end, typecheck y suite de regresión.** RF-1 al RF-19
  - Hecho cuando: `npx tsc --noEmit` compila limpio; `npm --prefix frontend run build` genera el empaquetado de producción sin errores de tipos o lint; y la suite completa de pruebas (`npm test`) pasa al 100% en verde sin regresiones.
