# Desglose de Tareas — Spec 009: Registro de Clientes desde el Chat, Unificación de Hilos y Mensajería WhatsApp por Usuario

- [x] **T1. Backend: Autovinculación preventiva de chats huérfanos al registrar o actualizar clientes.** RF-5, RF-7
  - Hecho cuando: pruebas automatizadas en `tests/crm_chat_customer_sync.test.ts` verifiquen que al ejecutar `createOrUpdateCustomer` en `customers.service.ts`, cualquier conversación previa con `customerId: null` cuyo número, terminación de 10 dígitos o `@usuario` coincida con el cliente quede vinculada automáticamente sin bifurcarse.

- [x] **T2. Backend: Prevención de bifurcación de chats en `whatsappService.sendMessage`.** RF-6, RF-7
  - Hecho cuando: prueba automatizada verifique que al enviar un mensaje saliente (notificación o plantilla) a un destinatario cuyo cliente ya cuenta con un hilo en el CRM, el sistema reutilice dicha conversación en lugar de crear un segundo registro duplicado.

- [ ] **T3. Backend: Resolución de JID canónico para `@usuario` y robustecimiento de `mergeChats`.** RF-8, RF-9, RF-10
  - Hecho cuando: pruebas automatizadas verifiquen que `resolveRecipientJid` resuelva el JID canónico de WhatsApp para clientes registrados con `@usuario` que posean conversación previa, y que `mergeChats` traslade los mensajes y consolide hilos sin fallos por restricción única en `remoteJid`.

- [ ] **T4. Frontend: Propagación del cliente guardado en `CustomerModal.vue` y `customerId` en `operations.store.ts`.** RF-2, RF-6, RF-9
  - Hecho cuando: `CustomerModal.vue` emita el cliente resultante en el evento `@saved`, y `dispatchWhatsApp` en `operations.store.ts` envíe `customerId` a `openMessagePreview` para asegurar la correcta resolución del canal.

- [ ] **T5. Frontend: Botón `[+ Registrar cliente]` directo en el chat y panel lateral con vinculación atómica.** RF-1, RF-2, RF-3, RF-4
  - Hecho cuando: en `CrmView.vue` y `ClientChatInfo.vue`, cualquier conversación no vinculada muestre el botón `[+ Registrar cliente]`, precargue los datos de WhatsApp en `CustomerModal`, y al guardar vincule inmediatamente el chat refrescando la vista, fidelización y estado.

- [ ] **T6. Frontend: Enrutamiento inteligente de `@usuario` y prevención de bloqueo de ventanas emergentes.** RF-10, RF-11
  - Hecho cuando: en `crm.store.ts` y `WhatsAppMessagePreviewModal.vue`, los mensajes a `@usuario` con chat existente se despachen internamente, mientras que para contactos externos sin chat se abra WhatsApp oficial de forma síncrona en el clic sin ser bloqueado por el navegador; build de frontend `npm --prefix frontend run build` pase exitosamente en verde.
