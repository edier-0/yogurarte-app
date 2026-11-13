# Tareas — Spec 014: Plantillas Centralizadas y Disparo Asistido de WhatsApp

- [x] **T1. Base de datos y Seed: Modelo Prisma `SystemWhatsAppTemplate` y precarga inmutable.** RF-1, RF-2, RF-5, RF-12
  - Hecho cuando: Se defina `SystemWhatsAppTemplate` en `prisma/schema.prisma`, se sincronice con `prisma db push` (tanto en `public` como en `yogurarte_test`), y `prisma/seed.ts` precargue fielmente las 9 plantillas de fábrica con sus categorías, variables y textos predeterminados sin errores.

- [x] **T2. Tests primero (TDD Rojo): Pruebas de integración de API, seguridad RBAC y compilación.** RF-2, RF-3, RF-9, RF-10, RF-11, RF-12, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-25, RF-27, RNF-1
  - Hecho cuando: Exista `tests/system_templates.test.ts` con aserciones para autenticación (401), RBAC (403 para no admin), validación de contenido vacío (400), actualización (200), restablecimiento a fábrica (200) e interpolación con fallback; las pruebas deben fallar inicialmente (en rojo).

- [x] **T3. Backend: Endpoints REST, controlador y servicio CRUD en CRM.** RF-2, RF-3, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RNF-1, RNF-6
  - Hecho cuando: Se implementen las rutas protegidas `/api/crm/system-templates` (`GET`, `PUT /:id`, `POST /:id/reset`), el esquema Zod y el controlador/servicio en `src/modules/crm/`, pasando en verde las pruebas CRUD de `tests/system_templates.test.ts`.

- [x] **T4. Backend: Motor de compilación, interpolación pura e integración en `orders.service.ts`.** RF-1, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-27, RNF-2
  - Hecho cuando: La función pura `interpolateTemplate` resuelva todas las variables con fallback seguro en memoria, `getWhatsAppLink` en `orders.service.ts` consuma las plantillas centralizadas en lugar de strings fijos, y todas las pruebas de backend en `tests/system_templates.test.ts` y `tests/orders.test.ts` queden en verde.

- [x] **T5. Frontend: Sub-pestañas en CRM y Tarjetas de Plantillas del Sistema (`TemplatesTab.vue`).** RF-3, RF-4, RF-13, RF-14
  - Hecho cuando: La pestaña "Plantillas" del CRM divida la navegación entre "Plantillas del Sistema" y "Respuestas Rápidas", renderice las tarjetas organizadas por categoría con badges, textos, switches reactivos de `autoTrigger` y botones de acción.

- [x] **T6. Frontend: Modal interactivo de edición con variables y previsualización WhatsApp (`SystemTemplateEditModal.vue`).** RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RNF-4, RNF-5
  - Hecho cuando: El modal cumpla con la estructura de 3 capas fijas (Art. 10 Constitución), inserte variables compatibles en la posición del cursor mediante chips, actualice la previsualización estilo WhatsApp con el mock determinista de RF-8, guarde cambios y permita restablecer a fábrica con confirmación.

- [x] **T7. Frontend: Orquestación de Disparo Asistido en Pedidos y Domicilios.** RF-15, RF-16, RF-17, RF-28, Casos Límite 1 y 5
  - Hecho cuando: Al confirmar entrega en `DeliveryConfirmModal.vue`, liquidar deuda en `PaymentModal.vue`, o pasar a en ruta en `DeliveryView.vue` y `OrdersView.vue`, el sistema abra automáticamente `WhatsAppMessagePreviewModal.vue` si `autoTrigger === true`, emita advertencia si Baileys está desconectado y mantenga deshabilitado el botón en pedidos cancelados (`CANCELLED`).

- [ ] **T8. Frontend: Integración de fidelización y cobranza (`LoyaltyTab.vue` y `CustomersView.vue`).** RF-1 (7, 8, 9), RF-23, RF-24, RF-26
  - Hecho cuando: `LoyaltyTab.vue` consuma `LOYALTY_PROGRESS` o `LOYALTY_REWARD_CLAIM` advirtiendo morosidad de cartera (Art. 7), y `CustomersView.vue` consuma `PAYMENT_REMINDER` con el cálculo dinámico de cartera (Art. 3).

- [ ] **T9. Verificación integral, Typecheck y Build de producción.** RNF-1, RNF-2, RNF-3, RNF-4, RNF-5, RNF-6
  - Hecho cuando: `npx tsc --noEmit` pase con 0 errores, `npm --prefix frontend run build` empaquete exitosamente sin errores de tipos, y la suite completa de pruebas en `vitest` se ejecute 100% en verde.
