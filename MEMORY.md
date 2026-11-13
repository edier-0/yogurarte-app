# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Specs 001 a 014 completadas y verificadas al 100%. Quality Gates en verde (`tsc`, build y vitest).
- Spec 014 implementada:
  - Base de datos con modelo `SystemWhatsAppTemplate` y precarga inmutable de 9 plantillas de fábrica.
  - Endpoints REST en CRM protegidos con RBAC (`ADMIN` para modificar/restablecer).
  - Motor de interpolación pura y compilación integrado en `orders.service.ts` (`getWhatsAppLink`).
  - Frontend: sub-pestañas en CRM ("Plantillas del Sistema" vs "Respuestas Rápidas"), tarjetas con switch `autoTrigger` y modal interactivo de 3 capas (`SystemTemplateEditModal.vue`) con variables y previsualización WhatsApp en vivo.
  - Disparo asistido tras eventos operativos en `DeliveryConfirmModal`, `DeliveryView`, `OrdersView` y `PaymentModal`, con guardas para pedidos anulados (`CANCELLED`) y clientes sin teléfono.
  - Fidelización (`LoyaltyTab.vue`) y Directorio de clientes (`CustomersView.vue`) consumiendo plantillas centralizadas.

## Decisiones (y por qué)
- Spec 014 (Plantillas Centralizadas y Disparo Asistido):
  1. Catálogo de 9 plantillas oficiales: 5 con evento operativo y 4 manuales.
  2. Compilación segura de variables y fallback inmutable en memoria ante caídas de BD.
  3. Disparo asistido (`autoTrigger`): apagado por defecto; al activarse, abre el modal de previsualización sin envíos silenciosos.
  4. Doble canal de despacho: Baileys en la app o enlace a la app personal de WhatsApp.
  5. Edición y restablecimiento restringidos a rol `ADMIN`.

## Aprendizajes y errores a evitar
- Sincronizar tanto `public` como `yogurarte_test` al aplicar cambios de esquema con `prisma db push`.
- Nunca enviar mensajes en segundo plano sin la previsualización y confirmación del usuario.
- Recordar siempre solicitar autorización explícita antes de abrir PR, antes de fusionarlo y antes de eliminar ramas.

## Próximos pasos
- Publicar la rama `feat/centralized-whatsapp-templates` al repositorio remoto.
- Solicitar autorización al usuario para abrir el Pull Request hacia `develop`.
