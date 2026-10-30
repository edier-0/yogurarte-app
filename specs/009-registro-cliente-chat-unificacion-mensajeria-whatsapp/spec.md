# Spec 009 — Registro de Clientes desde el Chat, Unificación de Hilos y Mensajería WhatsApp por Usuario
Estado: aprobada

## Contexto y objetivo
En el CRM y módulo de mensajería WhatsApp de YogurArte ocurren actualmente tres fricciones críticas:
1. Cuando un cliente está registrado mediante nombre de usuario de WhatsApp (`@usuario`) en lugar de un número telefónico tradicional, el sistema no permite el envío fluido de mensajes desde el aplicativo, bloqueando el despacho interno y disparando bloqueos de ventanas emergentes en el navegador.
2. Cuando una persona no registrada escribe por WhatsApp y el operador posteriormente registra sus datos, al enviar un mensaje predeterminado (plantilla o notificación de pedido) los chats se bifurcan en hilos separados (uno con el mensaje entrante y otro con el saliente), impidiendo su correcta unificación y fragmentando el historial de conversación.
3. El operador no dispone de un botón directo para registrar un cliente nuevo desde la vista del chat activo; se ve obligado a abandonar el CRM, ir al directorio de clientes, transcribir los datos manualmente y luego intentar vincularlo.

El objetivo de esta especificación es permitir el registro inmediato de clientes directamente desde el chat de WhatsApp con un solo clic, prevenir la bifurcación de conversaciones consolidando hilos duplicados, y garantizar que los mensajes dirigidos a clientes con nombre de usuario de WhatsApp se envíen directamente por la sesión interna si existe un chat previo, o se abran fluidamente en la aplicación oficial sin bloqueos del navegador.

## Usuarios
- **Operador de Ventas y CRM:** Gestiona conversaciones, atiende solicitudes de clientes por WhatsApp, envía respuestas predeterminadas y registra nuevos contactos.
- **Administrador:** Supervisa la cartera, pedidos y fidelización de clientes de YogurArte.

## Historias de usuario
- **HU-1:** Como operador de CRM, quiero un botón visible en el chat para registrar a un cliente no guardado, de modo que sus datos se capturen inmediatamente sin salir de la conversación y el chat quede vinculado.
- **HU-2:** Como operador de CRM, quiero que al registrar un cliente sus chats existentes se asocien automáticamente y no se dividan al enviar mensajes predeterminados, para mantener un único hilo cronológico continuo.
- **HU-3:** Como operador de CRM, quiero poder enviar mensajes desde el aplicativo a clientes registrados con nombre de usuario de WhatsApp (`@usuario`), tanto si ya tienen chat en el sistema como si requieren apertura externa, sin bloqueos del navegador ni errores técnicos.
- **HU-4:** Como operador de CRM, quiero poder unificar chats que hayan quedado bifurcados mediante una acción confiable que combine los mensajes en orden de fecha y hora sin perder información.

## Definiciones
- **Chat No Vinculado:** Conversación existente en el CRM cuyo identificador de WhatsApp no está asociado a ningún registro de la base de datos de clientes (`customerId` nulo).
- **Nombre de Usuario de WhatsApp (@usuario):** Identificador alfanumérico que reemplaza o acompaña al número telefónico de un usuario en WhatsApp.
- **JID Canónico:** Identificador único de destino en la red de WhatsApp utilizado para direccionar los mensajes.
- **Mensaje Predeterminado:** Texto predefinido de bienvenida, plantilla comercial o notificación de pedido enviado a un contacto.

## Requisitos funcionales (EARS)

### Registro directo desde el chat
- **RF-1:** MIENTRAS una conversación seleccionada en el CRM no tenga cliente vinculado, EL SISTEMA mostrará un botón visible de "Registrar cliente" tanto en la barra superior del chat como en el panel lateral de información.
- **RF-2:** CUANDO el usuario presione el botón "Registrar cliente", EL SISTEMA abrirá el formulario modal de registro de cliente prellenando el nombre con el nombre de perfil del contacto y el contacto con el teléfono o usuario detectado en la conversación.
- **RF-3:** CUANDO el usuario guarde el formulario de cliente desde el chat, EL SISTEMA creará el registro del cliente y vinculará inmediatamente la conversación activa a este nuevo cliente.
- **RF-4:** CUANDO se complete el registro y vinculación del cliente desde el chat, EL SISTEMA actualizará reactivamente la vista mostrando el estado de vinculación, el contador de fidelización (10+1) y el nombre oficial del cliente.

### Prevención de bifurcación y unificación automática
- **RF-5:** CUANDO se registre o actualice un cliente en el sistema (desde el chat o desde el directorio), EL SISTEMA vinculará automáticamente todas las conversaciones existentes no asociadas cuyos números o identificadores coincidan con el contacto registrado.
- **RF-6:** CUANDO se envíe un mensaje a un cliente desde el aplicativo (manual, plantilla o notificación de pedido), EL SISTEMA verificará primero si existe una conversación previa asociada al cliente o a su contacto, reutilizando dicho hilo en lugar de generar una conversación duplicada.
- **RF-7:** SI existen múltiples conversaciones huérfanas pertenecientes al mismo cliente o número al momento de vincular o enviar un mensaje, ENTONCES EL SISTEMA consolidará todos los mensajes en un único hilo canónico ordenado cronológicamente.
- **RF-8:** CUANDO el usuario solicite unificar dos chats mediante la opción de fusión, EL SISTEMA moverá todos los mensajes del chat origen al chat destino, conservará el historial completo y eliminará el registro redundante.

### Envío de mensajes con nombre de usuario de WhatsApp (@usuario)
- **RF-9:** CUANDO se envíe un mensaje desde el aplicativo a un cliente registrado con nombre de usuario de WhatsApp y dicho cliente tenga una conversación activa en el servidor, EL SISTEMA resolverá el identificador técnico de dicha conversación y despachará el mensaje mediante la conexión interna de WhatsApp.
- **RF-10:** SI un cliente está registrado únicamente con nombre de usuario de WhatsApp y no posee conversación previa en el servidor, ENTONCES EL SISTEMA proporcionará una acción directa para abrir el chat en la aplicación oficial de WhatsApp con el enlace oficial de usuario (`https://api.whatsapp.com/send/?username=...`), garantizando que la apertura no sea bloqueada por el navegador.
- **RF-11:** MIENTRAS se previsualice un mensaje dirigido a un cliente con nombre de usuario sin chat previo en el servidor, EL SISTEMA indicará visualmente que el mensaje se iniciará a través de la aplicación oficial de WhatsApp.

## Requisitos no funcionales
- **RNF-1 (Usabilidad):** El formulario de registro directo debe poder completarse y vincular el chat en menos de 3 clics.
- **RNF-2 (Integridad de datos):** Ninguna operación de unificación o consolidación de conversaciones provocará pérdida de mensajes de texto ni de archivos multimedia adjuntos.
- **RNF-3 (Compatibilidad de navegador):** La apertura externa de WhatsApp hacia nombres de usuario debe ejecutarse en sincronía con la acción del usuario para evitar bloqueos por políticas de ventanas emergentes en Chrome, Firefox, Safari y Edge.

## Casos límite
- **CL-1:** El cliente escribe desde un número con prefijo móvil colombiano internacional (`579...`) o formato local (`3...`); el sistema debe normalizarlo al formato canónico (`573...`) para evitar duplicación.
- **CL-2:** El contacto de WhatsApp solo tiene un alias alfanumérico sin número visible; el sistema debe permitir registrarlo con dicho `@usuario` y mantener la vinculación con su identificador interno de sesión.
- **CL-3:** El usuario intenta registrar un cliente cuyo número ya existe en otro registro; el sistema alertará que el cliente ya existe y ofrecerá vincular la conversación al cliente existente.

## Fuera de alcance
- Modificación del protocolo de sincronización de WhatsApp de la librería Baileys.
- Creación de nombres de usuario dentro de WhatsApp oficial.

## Criterios de finalización
- El botón "Registrar cliente" aparece en chats sin vincular y permite crear y asociar al cliente de forma inmediata.
- Enviar mensajes predeterminados a un cliente recién agregado no genera una conversación duplicada.
- Los clientes registrados con `@usuario` que tienen chat en el CRM reciben mensajes despachados internamente sin errores 400.
- Los clientes registrados con `@usuario` sin chat previo pueden abrirse fluidamente en WhatsApp oficial con el mensaje precargado sin bloqueos del navegador.
- Las pruebas automatizadas de integración validan la vinculación, la prevención de bifurcación y la resolución de destinatarios por `@usuario`.

## Dudas abiertas
- Ninguna. Los requisitos y el comportamiento deseado están completamente claros.
