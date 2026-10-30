# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Constitución (v1.3.0) y `AGENTS.md` actualizados con reglas permanentes:
  - Presentaciones dinámicas y sin 1L/2L hardcodeados en Fase B.
  - Entregas, salidas y auditoría de botellas exclusivas de Fase B (`BatchPackaging`).
  - Alerta de fidelización 10+1 en toma de pedidos con acceso directo a CRM.
- Spec 010 completada (T1 a T6):
  - T1: Backend CRM `customerId` en `getLoyaltyOverview` para respuesta en milisegundos.
  - T2: Segregación dinámica de salidas de fidelización (`loyaltyDischarged` a $0 COP) en `batches.service.ts`.
  - T3: Suite automatizada de integración `tests/loyalty_phase_b_audit.test.ts` (4/4 verde).
  - T4: Banner proactivo de fidelización en `OrderFormModal.vue` con botón de redención directa a `RedeemRewardModal.vue`.
  - T5: Auditoría visual dinámica y rotulado badge de `PREMIO_FIDELIZACION` en `PackagingSummaryModal.vue`.
  - T6: Verificación integral exitosa (`npx tsc --noEmit`, `npm run build` y vitest 19/19 verde).
- Rama temática: `feat/auditoria-fase-b-dinamica-y-alerta-fidelizacion`.

## Decisiones (y por qué)
- Segregación estricta de auditoría: Fase A es exclusivamente base láctea a granel; Fase B asume el 100% de la auditoría de botellas dinámicas, ventas y salidas por fidelización ($0 COP).
- Notificación no invasiva en pedidos: aviso destacado en `OrderFormModal.vue` al seleccionar cliente frecuente con acción rápida para abrir `RedeemRewardModal` sin perder los datos del pedido en curso.
- Restricción innegociable de 1.0L: el premio no puede superar 1.0 Litro (1x 1L o 2x 500ml); controlado tanto en validación Zod/servicio backend como en selector reactivo frontend.
- Uso de `findFirst` en queries complejas de Prisma sobre Neon para evitar caídas P1017 por transacciones/prepared statements.

## Aprendizajes y errores a evitar
- No duplicar métricas de botellas en Fase A; distorsiona el balance de tinas que solo fermentan leche líquida.
- Conectar siempre redención desde la comanda sin reiniciar el formulario de pedido.
- No eliminar ramas locales ni remotas sin autorización explícita previa del usuario.

## Próximos pasos
- Presentar la entrega completa de la Spec 010 al usuario y coordinar ciclo Git (commit, push, PR y merge a `develop` y `main`).
