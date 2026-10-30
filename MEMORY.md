# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 009 aprobada por el usuario: Registro de clientes desde el chat, unificación de hilos y mensajería WhatsApp por usuario.
- Rama temática creada: `feat/registro-cliente-chat-unificacion-whatsapp`.
- Plan de arquitectura (`plan.md`) y Desglose de tareas (`tasks.md`) elaborados (6 tareas atómicas ordenadas).

## Decisiones (y por qué)
- Botón directo en chat: incorporar botón `[+ Registrar cliente]` en encabezado y barra lateral del chat para precargar modal y vincular atómicamente la conversación.
- Autovinculación preventiva: `createOrUpdateCustomer` y `sendMessage` asociarán automáticamente chats existentes no vinculados por número o @usuario para evitar bifurcación al despachar mensajes predeterminados.
- Resolución híbrida @usuario: si el cliente con @usuario tiene chat en el CRM, despachar internamente con su JID activo; si es nuevo sin chat previo, abrir WhatsApp oficial sin bloqueo de popups.

## Aprendizajes y errores a evitar
- No intentar `window.open` tras una promesa asíncrona rechazada; el navegador bloquea la ventana emergente por expiración del contexto de usuario.
- En Baileys, los mensajes requieren JIDs válidos (@s.whatsapp.net o @lid); los @usuarios de WhatsApp deben resolverse contra la conversación existente en base de datos.

## Próximos pasos
- Presentar el plan y las tareas al usuario para su aprobación e iniciar la implementación atómica TDD con la Tarea 1.
