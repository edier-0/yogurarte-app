# MEMORY.md — Diario del proyecto
Memoria entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- ERP/CRM en producción: Fase A/B, pedidos/domicilio, caja bimonetaria, créditos y WhatsApp.
- Spec 009 completada e implementada en rama `feat/registro-cliente-chat-unificacion-whatsapp`.
- Tareas completadas:
  - T1: Autovinculación preventiva de chats huérfanos al crear/actualizar clientes.
  - T2: Prevención de bifurcación de chats en `whatsappService.sendMessage`.
  - T3: Resolución de JID canónico para `@usuario` y robustecimiento de `mergeChats` y `linkCustomer`.
  - T4: Propagación de cliente guardado en `CustomerModal.vue` y `customerId` en despachos.
  - T5: Botón `[+ Registrar cliente]` en barra de chat y panel lateral con vinculación atómica inmediata.
  - T6: Enrutamiento inteligente de `@usuario` y prevención síncrona de bloqueo de popups en WhatsApp oficial.
- Pruebas y compilación en verde: backend (`crm_chat_customer_sync.test.ts`, `crm.test.ts`) y frontend (`vue-tsc` + Vite build) 100% operativos.

## Decisiones (y por qué)
- Botón directo en chat: incorporar botón `[+ Registrar cliente]` en encabezado y barra lateral del chat para precargar modal y vincular atómicamente la conversación.
- Autovinculación preventiva: `createOrUpdateCustomer` y `sendMessage` asocian automáticamente chats huérfanos para evitar bifurcación al despachar mensajes predeterminados.
- Reutilización estricta: `resolveOrCreateConversationForOutgoing` reutiliza cualquier conversación existente del cliente o terminación de 10 dígitos antes de crear un nuevo registro.
- Prevención síncrona de popup blocker: para destinatarios `@usuario` sin chat previo o con sesión desconectada, `window.open` se dispara de forma síncrona en el contexto del clic del usuario antes de cualquier resolución de promesas asíncronas.

## Aprendizajes y errores a evitar
- No intentar `window.open` tras una promesa asíncrona de red; el navegador bloquea la ventana emergente por expiración del contexto de usuario transitorio.
- En Baileys, los mensajes requieren JIDs válidos (@s.whatsapp.net o @lid); los @usuarios de WhatsApp deben resolverse contra la conversación existente en base de datos o abrirse en WhatsApp oficial.

## Próximos pasos
- Realizar commit de las tareas finalizadas y proceder con el ciclo Git (push, PR a `develop`, merge a `main`).
