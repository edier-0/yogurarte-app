# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Specs 001 a 013 completadas, integradas y verificadas al 100%. Quality Gates en verde (`tsc`, build y 253 tests).
- Aprobada la Spec 014 (`specs/014-plantillas-whatsapp-centralizadas/`).
- Redactados el Plan de Arquitectura (`plan.md`) y el desglose de 9 tareas atómicas (`tasks.md`, T1 a T9).
- Ramas `develop` y `main` sincronizadas y al día.

## Decisiones (y por qué)
- Spec 014 (Plantillas Centralizadas y Disparo Asistido):
  1. Catálogo cerrado de 9 plantillas oficiales: 5 con evento operativo (`DELIVERY_IN_ROUTE_SHORT`, `DELIVERY_IN_ROUTE_FULL`, `DELIVERED_PAID`, `DELIVERED_UNPAID`, `PAID_NOT_DELIVERED`) y 4 manuales (`ORDER_STATUS_TRACKING`, `PAYMENT_REMINDER`, `LOYALTY_PROGRESS`, `LOYALTY_REWARD_CLAIM`).
  2. Compilación pura con `split(key).join(val)` inmune a regex injection; fallback inmutable en memoria ante caídas de BD.
  3. Disparo asistido (`autoTrigger`): apagado por defecto; al activarse, sugiere abriendo el modal de previsualización sin envíos silenciosos.
  4. Doble canal de despacho: Baileys en la app o enlace a la app personal de WhatsApp.
  5. Edición y restablecimiento restringidos a rol `ADMIN`.

## Aprendizajes y errores a evitar
- Sincronizar tanto `public` como `yogurarte_test` al aplicar cambios de esquema con `prisma db push`.
- Nunca enviar mensajes en segundo plano sin la previsualización y aprobación del usuario.
- Conservar el patrón fallback seguro a textos en memoria si la BD no responde o no tiene la plantilla.
- Recordar siempre solicitar confirmación antes de abrir PR, antes de fusionarlo y antes de eliminar ramas.

## Próximos pasos
- Crear la rama temática `feat/centralized-whatsapp-templates` partiendo de `develop`.
- Ejecutar T1: Definir modelo Prisma `SystemWhatsAppTemplate`, sincronizar base de datos y precargar seed.
