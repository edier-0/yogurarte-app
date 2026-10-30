# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 009 en ejecución en rama `feat/registro-cliente-chat-unificacion-whatsapp`.
- Tareas completadas:
  - T1: Autovinculación preventiva de chats huérfanos al crear/actualizar clientes.
  - T2: Prevención de bifurcación de chats en `whatsappService.sendMessage` reutilizando el hilo del cliente.
- Pruebas pasando al 100% en `tests/crm_chat_customer_sync.test.ts`.

## Decisiones (y por qué)
- Botón directo en chat: incorporar botón `[+ Registrar cliente]` en encabezado y barra lateral del chat para precargar modal y vincular atómicamente la conversación.
- Autovinculación preventiva: `createOrUpdateCustomer` y `sendMessage` asociarán automáticamente chats existentes no vinculados por número o @usuario para evitar bifurcación al despachar mensajes predeterminados.
- Reutilización estricta: `resolveOrCreateConversationForOutgoing` reutiliza cualquier conversación existente del cliente o con terminación de 10 dígitos antes de crear un nuevo registro.

## Aprendizajes y errores a evitar
- No intentar `window.open` tras una promesa asíncrona rechazada; el navegador bloquea la ventana emergente por expiración del contexto de usuario.
- En Baileys, los mensajes requieren JIDs válidos (@s.whatsapp.net o @lid); los @usuarios de WhatsApp deben resolverse contra la conversación existente en base de datos.

## Próximos pasos
- Proceder con la Tarea T3: Resolución de JID canónico para `@usuario` y robustecimiento de `mergeChats` en `crm.service.ts`.
