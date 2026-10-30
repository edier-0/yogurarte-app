# Plan de Arquitectura — Spec 009: Registro de Clientes desde el Chat, Unificación de Hilos y Mensajería WhatsApp por Usuario

## 1. Archivos y Responsabilidades

### Backend
- `src/modules/customers/customers.service.ts`:
  - En `createOrUpdateCustomer`: autovinculación y consolidación inmediata de conversaciones huérfanas que coincidan con el teléfono, 10 dígitos colombianos o `@usuario` del cliente guardado. (RF-5, RF-7)
- `src/services/whatsapp.service.ts`:
  - En `sendMessage`: prevención de bifurcación de chats. Antes de crear un nuevo `ChatConversation`, reutilizar conversaciones existentes asociadas al `matchingCustomer` o JID normalizado. (RF-6, RF-7)
- `src/modules/crm/crm.service.ts`:
  - En `resolveRecipientJid`: resolución exhaustiva de destinatarios cuando se envía a un `@usuario` o se proporciona `customerId`, consultando conversaciones activas y números en base de datos. (RF-9, RF-10)
  - En `linkCustomer`: soporte completo para clientes con `@usuario`, consolidando hilos huérfanos sin depender exclusivamente de dígitos numéricos. (RF-3, RF-7, RF-8)
  - En `mergeChats`: fusión bidireccional y robusta, garantizando migración íntegra de mensajes y normalización canónica sin colisión de restricciones únicas. (RF-8)

### Frontend
- `frontend/src/components/directory/CustomerModal.vue`:
  - Emitir el cliente creado o modificado en el evento `@saved` para que el componente invocador pueda consumir su ID inmediatamente. (RF-2, RF-3)
- `frontend/src/components/operations/crm/ClientChatInfo.vue`:
  - Incorporar botón prominente `[+ Registrar como Cliente]` cuando `!customer`, emitiendo evento `@register-customer` con datos precargados. (RF-1, RF-2)
- `frontend/src/views/operations/CrmView.vue`:
  - Integrar botón `[+ Registrar cliente]` en la barra superior del chat activo no vinculado. (RF-1)
  - Manejar la apertura de `CustomerModal` con datos precargados (`contactName`, `phoneNumber`/`@usuario`) y vincular atómicamente el chat activo al guardar (`/api/crm/conversations/:id/link-customer`). (RF-2, RF-3, RF-4)
- `frontend/src/stores/operations.store.ts`:
  - Pasar `customerId: res.customerId` a `crmStore.openMessagePreview(...)` en `dispatchWhatsApp` para asegurar que el despacho de órdenes resuelva correctamente el canal del cliente. (RF-6, RF-9)
- `frontend/src/stores/crm.store.ts` & `frontend/src/components/operations/crm/WhatsAppMessagePreviewModal.vue`:
  - Enrutamiento inteligente sin bloqueo de ventanas emergentes: si un destinatario es `@usuario` sin chat previo en el servidor, abrir el enlace oficial de WhatsApp directamente en el evento de clic síncrono del usuario o notificar el canal externo. (RF-10, RF-11)
  - Enviar `customerId` al llamar a `/api/crm/send`. (RF-9)

---

## 2. Funciones Puras y Algoritmos en Pseudocódigo

### Algoritmo 1: Autovinculación Preventiva al Crear/Actualizar Cliente (`customers.service.ts`)
```typescript
function autoLinkConversationsForCustomer(customer: Customer, tx: PrismaClient): Promise<void>
// Entrada: customer (id, phone, fullName)
// Cobertura: RF-5, RF-7
1. Extraer identificadores:
   - cleanDigits = customer.phone.replace(/\D/g, '')
   - last10 = cleanDigits.length >= 7 ? cleanDigits.slice(-10) : null
   - username = customer.phone.startsWith('@') ? customer.phone.slice(1).trim() : null
2. Buscar conversaciones huérfanas (customerId == null):
   - OR:
     - si last10: phoneNumber contiene last10 o remoteJid contiene last10
     - si username: contactName insensible contiene username o phoneNumber contiene username
3. Si se encuentran conversaciones huérfanas:
   - Para cada conversación huérfana, invocar o ejecutar la vinculación y consolidación de mensajes hacia el hilo principal del cliente.
   - Actualizar customerId = customer.id.
```

### Algoritmo 2: Prevención de Bifurcación en Mensajes Salientes (`whatsapp.service.ts`)
```typescript
function getOrCreateConversationForSend(cleanJid, cleanNumber, matchingCustomer, text, now): Promise<ChatConversation>
// Entrada: cleanJid, cleanNumber, matchingCustomer (Customer | null), text, now
// Cobertura: RF-6, RF-7
1. conversation = findUnique({ where: { remoteJid: cleanJid } })
2. SI NO conversation Y matchingCustomer:
     // Buscar conversación previa existente del cliente
     conversation = findFirst({
       where: { customerId: matchingCustomer.id },
       orderBy: { updatedAt: 'desc' }
     })
3. SI NO conversation:
     // Buscar por teléfono en chats no vinculados
     conversation = findFirst({
       where: { phoneNumber: { contains: cleanNumber.slice(-10) } }
     })
4. SI conversation:
     // REUTILIZAR y actualizar, NUNCA bifurcar
     update conversation con lastMessageText, lastMessageTimestamp, etc.
   SINO:
     // Crear nueva conversación solo si realmente no existe ninguna
     create conversation con remoteJid, phoneNumber, customerId: matchingCustomer?.id
```

### Algoritmo 3: Resolución de Destinatarios para `@usuario` (`crm.service.ts`)
```typescript
function resolveRecipientJid(recipient: string, customerId?: number | null): Promise<string>
// Cobertura: RF-9, RF-10
1. Si recipient termina en @s.whatsapp.net o @lid -> retornar normalizeColombianJid(recipient)
2. Si recipient contiene >= 7 dígitos numéricos -> retornar `${cleanPhone}@s.whatsapp.net`
3. Si customerId:
   - Buscar chatConversation con customerId. Si existe remoteJid válido (@s.whatsapp.net o @lid) -> retornar remoteJid
4. Si recipient es @usuario o alias alfanumérico:
   - cleanUsername = recipient.replace(/^@/, '').trim()
   - Buscar cliente en BD con phone == @cleanUsername o fullName == cleanUsername
   - Si se encuentra cliente y tiene chatConversation vinculado -> retornar conversation.remoteJid
5. Si no se puede resolver un JID técnico en el servidor:
   - Arrojar error semántico tipado indicando que requiere canal externo oficial.
```

---

## 3. Interfaces y Contratos de Datos

### Eventos en Componentes Frontend
```typescript
// CustomerModal.vue
emit('saved', savedCustomer: CustomerItem);

// ClientChatInfo.vue
emit('register-customer', prefillData: { fullName: string; phone: string });

// CrmView.vue
interface RegisterPrefill {
  fullName: string;
  phone: string;
  conversationId: number;
}
```

### Contrato API `/crm/send` (Zod Schema ampliado)
```typescript
export const sendCrmMessageSchema = z.object({
  recipient: z.string().min(2).max(100).optional(),
  remoteJid: z.string().optional(),
  to: z.string().optional(),
  text: z.string().max(4000).optional().nullable(),
  customerId: z.coerce.number().int().positive().optional().nullable(),
  contactName: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  mediaType: z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER']).optional(),
});
```

---

## 4. Decisiones Justificadas

1. **Reutilizar `CustomerModal.vue` existente:**
   - *Alternativa descartada:* Crear un formulario inline dentro de `ClientChatInfo.vue`.
   - *Justificación:* `CustomerModal` ya implementa validaciones de nombre, formato de teléfono/usuario de WhatsApp, dirección predeterminada ("Fonseca"), manejo de errores y conexión con `directoryStore`. Reutilizarlo garantiza coherencia y menor duplicación de código.

2. **Autovinculación preventiva en `createOrUpdateCustomer`:**
   - *Alternativa descartada:* Dejar que el usuario siempre vincule manualmente los chats.
   - *Justificación:* Si el cliente ya escribió por WhatsApp, el sistema conoce su número o usuario. Al guardar el cliente, es 100% predecible que ese chat le pertenece; vincularlo automáticamente erradica de raíz el olvido humano y la posterior bifurcación de hilos.

3. **Apertura externa síncrona en `@usuario` sin chat:**
   - *Alternativa descartada:* Seguir intentando enviar por Baileys mediante socket y esperar que falle para abrir un fallback con `window.open`.
   - *Justificación:* Las políticas de seguridad de los navegadores (Chrome/Firefox/Safari) bloquean cualquier ventana emergente llamada después de una promesa asíncrona de red (`await http.post`). Si el destinatario no tiene JID en el servidor, el canal debe ser WhatsApp oficial y abrirse de inmediato con el clic del usuario.

---

## 5. Estrategia de Tests

Pruebas automatizadas en `tests/crm_chat_customer_sync.test.ts` con Vitest + Supertest y Prisma:
- **Test 1:** `createOrUpdateCustomer` autovincula conversaciones huérfanas con el mismo número telefónico. (RF-5)
- **Test 2:** `createOrUpdateCustomer` autovincula conversaciones huérfanas con nombre de usuario `@usuario`. (RF-5)
- **Test 3:** `whatsappService.sendMessage` reutiliza la conversación existente de un cliente en lugar de bifurcar una nueva. (RF-6, RF-7)
- **Test 4:** `resolveRecipientJid` resuelve el JID canónico de un cliente con `@usuario` si tiene conversación previa asociada. (RF-9)
- **Test 5:** `mergeChats` unifica correctamente dos hilos bifurcados consolidando los mensajes en orden cronológico. (RF-8)
- **Verificación frontend:** `npm --prefix frontend run build` (typecheck con `vue-tsc` y empaquetado Vite).
