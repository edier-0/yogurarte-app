# Spec 014 — Plantillas Centralizadas y Disparo Asistido de WhatsApp

Estado: aprobada

## Contexto y objetivo
En YogurArte, la comunicación con los clientes a través de WhatsApp es el canal neurálgico de ventas, confirmación de pedidos, seguimiento de entregas, cobranza de saldos pendientes y fidelización.

Actualmente, los textos de los mensajes enviados en los momentos clave del negocio se encuentran dispersos y fijos dentro de la lógica del código fuente. Esto ocasiona que el administrador no pueda revisar los mensajes predeterminados, no pueda ajustar su redacción o tono según la temporada, desconozca en qué momento exacto se sugiere cada mensaje y no tenga la facultad de activar o pausar los disparos sugeridos. Asimismo, la pestaña de "Plantillas" del CRM está limitada exclusivamente a atajos rápidos de chat (como `/sabores` o `/precios`), sin acceso a los mensajes oficiales del sistema.

El objetivo de esta especificación es:
1. Centralizar y disponibilizar en una interfaz intuitiva todas las plantillas oficiales de mensajes que el sistema utiliza en los diferentes eventos del ciclo comercial y operativo.
2. Permitir al administrador ver con claridad la referencia de en qué momento se dispara cada plantilla, editar su contenido mediante una barra interactiva de variables dinámicas, previsualizar el resultado en tiempo real con apariencia de WhatsApp sobre un conjunto de datos de prueba determinista y restaurar el texto original de fábrica cuando sea necesario.
3. Proporcionar un control individual de activación/desactivación por plantilla para determinar si el sistema debe abrir automáticamente el modal de previsualización tras registrar un evento operativo (disparo asistido), garantizando que el despacho final siempre requiera la confirmación explícita del usuario y permitiendo elegir el medio de envío (canal integrado de la app o WhatsApp personal/externo).
4. Mantener intactas y organizadas las respuestas rápidas existentes mediante una navegación por sub-pestañas dentro de la sección de plantillas.
5. Garantizar el cumplimiento estricto de la Constitución del Software: cálculo dinámico de cartera sin columnas estáticas (Art. 3), respeto al bloqueo de canje de fidelización ante deuda pendiente (Art. 7 y Spec 013) y precisión temporal bajo la hora legal de Colombia (Art. 8).

---

## Usuarios
- **Administrador**: Configura, redacta, personaliza y activa o desactiva las plantillas institucionales del sistema, además de supervisar los datos bancarios y enlaces de contacto incluidos en los mensajes.
- **Operador de Pedidos y Ventas**: Utiliza las plantillas para notificar a los clientes sobre el estado de su orden, recepción de pagos o recordatorios de entrega.
- **Domiciliario / Repartidor**: Despacha avisos breves de ruta hacia la dirección del cliente al iniciar el reparto.
- **Cliente de YogurArte**: Recibe mensajes claros, consistentes, personalizados y con la información exacta de su pedido, pagos y beneficios acumulados.

---

## Historias de usuario
- **HU-1**: Como administrador, quiero acceder a un panel centralizado con todas las plantillas de mensajes del sistema para conocer qué textos se envían a los clientes y en qué momento exacto se utiliza cada uno.
- **HU-2**: Como administrador, quiero poder editar el texto de cualquier plantilla del sistema insertando variables dinámicas compatibles con un solo clic y viendo una previsualización en vivo, para adaptar la comunicación a las necesidades del negocio.
- **HU-3**: Como administrador, quiero poder restaurar cualquier plantilla modificada a su versión original de fábrica con un solo botón, para recuperarme fácilmente de errores accidentales de redacción o formato.
- **HU-4**: Como administrador, quiero poder activar o desactivar individualmente el disparo asistido de cada plantilla basada en eventos, de modo que el sistema solo sugiera automáticamente la apertura del modal en los momentos pertinentes.
- **HU-5**: Como operador o domiciliario, quiero que cuando una plantilla tenga el disparo asistido activado y se complete la acción operativa (ej. despachar comanda, confirmar entrega o liquidar deuda con abono), el sistema abra automáticamente la ventana de confirmación previa con el mensaje redactado para revisar, editar si hace falta y elegir si se despacha por la app o por WhatsApp personal.
- **HU-6**: Como operador o domiciliario, cuando una plantilla tenga el disparo asistido desactivado (o sea de invocación exclusivamente manual), quiero que el sistema no interrumpa mi flujo de trabajo con ventanas emergentes, permitiéndome enviar el mensaje manualmente cuando yo lo decida mediante el botón de WhatsApp correspondiente.
- **HU-7**: Como operador de CRM, quiero mantener accesible la lista de respuestas rápidas de chat (`/sabores`, `/precios`, etc.) en una sub-pestaña dedicada, para responder ágilmente consultas cotidianas sin mezclar los atajos con las plantillas del sistema.

---

## Definiciones
- **Plantilla del Sistema**: Mensaje oficial estructurado cuyo contenido se asocia a un evento operativo o hito del ciclo comercial (pedido recibido, despacho en ruta, entrega pagada, saldo pendiente, cobranza, fidelización).
- **Plantilla con Evento Operativo**: Plantilla vinculada a una mutación de estado en el backend (ej. cambio a `IN_ROUTE`, confirmación de entrega o liquidación de saldo adeudado). Admite interruptor de disparo asistido (`autoTrigger`).
- **Plantilla de Invocación Manual**: Plantilla vinculada a acciones a demanda del usuario (ej. botón de cobro en Directorio de Clientes, consulta de pedido o botón de información de fidelización). No tiene mutación de estado automática asociada y su `autoTrigger` se mantiene fijo en `false`.
- **Disparo Asistido (Auto-Trigger)**: Configuración booleana (`autoTrigger`) aplicable a plantillas con evento operativo. Si está activado (`true`), el sistema abre automáticamente el modal de previsualización tras completar con éxito la mutación del evento en el servidor. Si está desactivado (`false`), el modal únicamente se abre mediante interacción voluntaria en el botón de WhatsApp.
- **Variables Dinámicas**: Marcadores de posición insertables en la plantilla (ej. `{{cliente}}`, `{{pedido}}`, `{{total}}`, `{{saldo_pendiente}}`, `{{nequi}}`) que el motor de interpolación sustituye en tiempo de ejecución con los datos reales del cliente, pedido o configuración.
- **Modal de Previsualización y Despacho**: Ventana emergente (`WhatsAppMessagePreviewModal.vue`) que presenta el texto final resuelto, permite su edición libre en caliente y ofrece dos canales de envío: "Confirmar y Enviar" (a través de la sesión activa de WhatsApp en la app) o "Enviar desde mi teléfono" (vía enlace oficial para la aplicación nativa o WhatsApp Web).
- **Restablecimiento a Fábrica**: Acción administrativa que sobrescribe el contenido editado de una plantilla devolviéndola a su redacción estándar original predeterminada por YogurArte.
- **Estados Oficiales de Entrega (`deliveryStatus`)**:
  - `PENDING`: *"🕒 Pendiente por preparar"* — Pedido recibido o creado en preventa sin iniciar preparación en cocina.
  - `PREPARING`: *"🥣 En preparación"* — Yogur en proceso de alistamiento o empaque en planta.
  - `READY_FOR_DISPATCH`: *"📦 Listo para despacho"* — Yogur envasado, etiquetado y refrigerado en cava esperando recolección por el domiciliario.
  - `IN_ROUTE`: *"🛵 En camino"* — Domiciliario en tránsito hacia la dirección del cliente.
  - `DELIVERED`: *"✅ Entregado"* — Pedido entregado físicamente al cliente (de contado, con transferencia o fiado).
  - `CANCELLED`: *"❌ Cancelado"* — Pedido anulado sin descargo de inventario ni afectación de cartera.
- **Estados Oficiales de Pago (`paymentStatus`)**:
  - `PENDING`: Saldo 100% adeudado.
  - `PARTIAL`: Saldo parcialmente abonado con deuda pendiente $> 0$.
  - `PAID`: Pedido 100% cancelado (\$0 de saldo pendiente / Paz y Salvo).

---

## Requisitos funcionales (EARS)

### Gestión y Catálogo de Plantillas del Sistema
- **RF-1**: EL SISTEMA debe mantener un catálogo centralizado de 9 plantillas oficiales con las siguientes especificaciones operativas:
  1. `ORDER_STATUS_TRACKING`: Seguimiento detallado del pedido desde la vista de Pedidos (`OrdersView`), desglosando productos, dirección y el estado actual mediante la variable editable `{{estado}}`. (Tipo: Invocación manual mediante botón).
  2. `DELIVERY_IN_ROUTE_SHORT`: Aviso breve y directo desde la vista de Domicilios (`DeliveryView`) informando que el repartidor va en camino hacia la dirección del cliente. (Tipo: Evento operativo al pasar a `IN_ROUTE` desde Domicilios).
  3. `DELIVERY_IN_ROUTE_FULL`: Notificación completa de despacho en camino desde la vista de Pedidos (`OrdersView`) con desglose de productos y dirección. (Tipo: Evento operativo al pasar a `IN_ROUTE` desde Pedidos).
  4. `DELIVERED_PAID`: Confirmación de entrega exitosa para pedidos con saldo en cero o pagados en su totalidad (Paz y Salvo) con mensaje de gratitud. (Tipo: Evento operativo al confirmar entrega con saldo $\le 0$ o al abonar saldo restante a $\$0$ en pedido entregado).
  5. `DELIVERED_UNPAID`: Confirmación de entrega para pedidos con saldo pendiente o fiados, recordando el valor adeudado, abonos recibidos y datos de transferencia. (Tipo: Evento operativo al confirmar entrega con saldo $> 0$).
  6. `PAID_NOT_DELIVERED`: Confirmación de pago recibido con éxito para encargos o preventas que aún no han sido entregados. (Tipo: Evento operativo al registrar abono o pago total sobre pedido no entregado).
  7. `PAYMENT_REMINDER`: Recordatorio amable de cobro para clientes que registran deudas pendientes de entregas anteriores. (Tipo: Invocación manual desde Directorio de Clientes).
  8. `LOYALTY_PROGRESS`: Notificación del progreso de acumulación de botellas hacia la meta de fidelización (*"Llevas 7/10 botellas, te faltan 3..."*). (Tipo: Invocación manual desde CRM Fidelización cuando `rewardsAvailable === 0`).
  9. `LOYALTY_REWARD_CLAIM`: Notificación de premio de fidelización listo para reclamar (*"¡Felicidades! Tienes 1 litro gratis listo..."*). (Tipo: Invocación manual desde CRM Fidelización cuando `rewardsAvailable >= 1`).
- **RF-2**: EL SISTEMA debe persistir en base de datos la entidad `SystemWhatsAppTemplate` con los siguientes campos: identificador único (`id`), código único de evento (`code`), título legible (`title`), categoría operativa (`category`: `PEDIDOS`, `DOMICILIOS`, `CARTERA`, `FIDELIZACION`), descripción del momento en que se utiliza (`description`), contenido editable (`content`), contenido estándar de fábrica (`defaultContent`), lista de variables permitidas (`availableVariables`) y estado del interruptor de disparo asistido (`autoTrigger`).
- **RF-3**: CUANDO un usuario con rol de Administrador autenticado consulte o modifique las plantillas, EL SISTEMA debe exponer y proteger los siguientes endpoints REST canónicos bajo el prefijo `/api/crm/system-templates`:
  - `GET /api/crm/system-templates`: Lista todas las plantillas oficiales con sus metadatos y estado de activación.
  - `PUT /api/crm/system-templates/:id`: Actualiza el contenido editable (`content`) y/o el estado de disparo asistido (`autoTrigger`).
  - `POST /api/crm/system-templates/:id/reset`: Restaura el contenido editable al valor exacto de `defaultContent`.
- **RF-4**: CUANDO un usuario con rol de Administrador acceda a la sección de "Plantillas" en el CRM, EL SISTEMA debe presentar dos sub-pestañas principales de navegación: *"Plantillas del Sistema"* y *"Respuestas Rápidas"*.
- **RF-5**: MIENTRAS el usuario consulte la sub-pestaña *"Plantillas del Sistema"*, EL SISTEMA debe mostrar las tarjetas de cada plantilla organizadas por categoría, indicando el título, la descripción de cuándo se envía, una vista previa del texto y el interruptor de activación (para plantillas con evento operativo) o un indicador de "Solo invocación manual" (para plantillas manuales).

### Textos Predeterminados de Fábrica (`defaultContent`)
- **RF-6**: EL SISTEMA debe inicializar en el seed e inmutabilizar como referencia de restablecimiento los siguientes 9 textos de fábrica:
  1. `ORDER_STATUS_TRACKING`:
     ```text
     🥛 *YogurArte | Pedido #{{pedido}}*

     ¡Hola *{{cliente}}*! El estado de tu pedido es: *{{estado}}*
     {{productos}}

     💰 *Total:* {{total}}
     🚨 *Saldo pendiente:* {{saldo_pendiente}}
     📍 *Dirección:* {{direccion}}
     💳 *{{banco}}:* {{nequi}}

     ¡Muchas gracias por elegir nuestro yogur artesanal 100% natural! 🥛🍇🍓

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  2. `DELIVERY_IN_ROUTE_SHORT`:
     ```text
     🛵 ¡Hola *{{cliente}}*! Tu pedido de YogurArte ya va en camino hacia tu dirección (📍 *{{direccion}}*). Por favor atento para recibirlo. ¡Muchas gracias por tu compra! 🥛🍇🍓
     ```
  3. `DELIVERY_IN_ROUTE_FULL`:
     ```text
     🥛 *YogurArte | Pedido en Ruta 🛵💨*

     ¡Hola *{{cliente}}*! Te informamos que tu pedido *#{{pedido}}* ya va en camino:
     {{productos}}

     💰 *Total:* {{total}}
     🚨 *Saldo pendiente:* {{saldo_pendiente}}
     📍 *Entrega:* {{direccion}}
     💳 *{{banco}}:* {{nequi}}

     ¡Atento a recibir a nuestro domiciliario! Muchas gracias por tu confianza. 🥛🍇🍓

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  4. `DELIVERED_PAID`:
     ```text
     🥛 *YogurArte | ¡Pago Recibido y Entregado con Éxito! ✨*

     ¡Hola *{{cliente}}*! Confirmamos la entrega de tu pedido *#{{pedido}}*:
     {{productos}}

     💰 *Total Pagado:* {{total}} (✅ Paz y Salvo)
     📦 *Estado:* ✅ Entregado

     ¡Muchísimas gracias por tu compra y cumplimiento! Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural. 🥛🍇🍓

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  5. `DELIVERED_UNPAID`:
     ```text
     🥛 *YogurArte | Pedido Entregado #{{pedido}}*

     ¡Hola *{{cliente}}*! Tu pedido ha sido *✅ Entregado con éxito*:
     {{productos}}

     🚨 *Saldo pendiente:* {{saldo_pendiente}}
     💵 *Abonado:* {{abono}}
     💳 *{{banco}}:* {{nequi}}

     ¡Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural! Para tu próximo pago estamos a tu entera orden. 🥛🍇🍓

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  6. `PAID_NOT_DELIVERED`:
     ```text
     🥛 *YogurArte | Pago Confirmado ✨*

     ¡Hola *{{cliente}}*! Confirmamos el pago de tu encargo *#{{pedido}}*:
     {{productos}}

     💰 *Total Pagado:* {{total}} (✅ Paz y Salvo)
     📦 *Estado:* {{estado}}
     📍 *Entrega:* {{direccion}}

     🥣 ¡Muchas gracias por tu compra y confianza! Tu yogur 100% natural está siendo preparado y te avisaremos apenas vaya en camino. 🍓🛵💨

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  7. `PAYMENT_REMINDER`:
     ```text
     ¡Hola *{{cliente}}*! 🥛✨ Te saludamos con mucho cariño desde *YogurArte*.

     Esperamos que estés disfrutando tus yogures artesanales. Te recordamos amablemente que presentas un saldo pendiente de *{{saldo_pendiente}}* de tu entrega anterior.

     💳 Puedes transferir a nuestro *{{banco}}* al *{{nequi}}* y compartirnos tu comprobante por este medio. ¡Muchísimas gracias por tu apoyo continuo a nuestro emprendimiento artesanal! 🙌🐄

     📸 *Síguenos en Instagram:*
     {{instagram}}
     ```
  8. `LOYALTY_PROGRESS`:
     ```text
     ¡Hola *{{cliente}}*! 🥛✨ Te saludamos desde *YogurArte*.

     Te recordamos que en tu Tarjeta de Fidelización llevas *{{botellas_acumuladas}}/10 botellas* acumuladas. ¡Te faltan solo *{{botellas_restantes}} botella(s)* para recibir tu próximo litro totalmente GRATIS! 🎁🍓

     ¡Muchas gracias por tu lealtad a nuestro yogur artesanal! 🙌🥛
     ```
  9. `LOYALTY_REWARD_CLAIM`:
     ```text
     🎉 ¡Felicitaciones *{{cliente}}*! 🥛✨

     Te saludamos desde *YogurArte* para informarte que en nuestro Programa de Fidelización cuentas con *{{premios_disponibles}} Litro(s) GRATIS* listo(s) para reclamar en tu próximo pedido. 🎁🍓

     ¡Muchísimas gracias por tu fidelidad y preferencia continua! Contáctanos para apartar tu litro de cortesía. 🥛🍇
     ```

### Matriz de Variables Dinámicas por Plantilla
- **RF-6**: MIENTRAS se edite una plantilla, EL SISTEMA debe restringir la barra de variables interactivas estrictamente a la siguiente matriz de compatibilidad:
  - **Plantillas de Pedidos y Domicilios** (`ORDER_STATUS_TRACKING`, `DELIVERY_IN_ROUTE_SHORT`, `DELIVERY_IN_ROUTE_FULL`, `DELIVERED_PAID`, `DELIVERED_UNPAID`, `PAID_NOT_DELIVERED`):  
    Variables: `{{cliente}}`, `{{pedido}}`, `{{estado}}`, `{{productos}}`, `{{total}}`, `{{saldo_pendiente}}`, `{{abono}}`, `{{direccion}}`, `{{nequi}}`, `{{banco}}`, `{{instagram}}`.
  - **Plantilla de Cartera** (`PAYMENT_REMINDER`):  
    Variables: `{{cliente}}`, `{{saldo_pendiente}}`, `{{nequi}}`, `{{banco}}`, `{{instagram}}`.
  - **Plantilla de Avance de Fidelización** (`LOYALTY_PROGRESS`):  
    Variables: `{{cliente}}`, `{{botellas_acumuladas}}`, `{{botellas_restantes}}`, `{{instagram}}`.
  - **Plantilla de Premio de Fidelización** (`LOYALTY_REWARD_CLAIM`):  
    Variables: `{{cliente}}`, `{{premios_disponibles}}`, `{{instagram}}`.
- **RF-7**: CUANDO el usuario haga clic en cualquier botón de variable dinámica disponible, EL SISTEMA debe insertar la etiqueta correspondiente exactamente en la posición actual del cursor dentro del área de texto.
- **RF-8**: MIENTRAS el usuario edite el texto de la plantilla, EL SISTEMA debe actualizar en tiempo real una caja de previsualización con apariencia de burbuja de WhatsApp, resolviendo las variables con el siguiente conjunto estándar de datos de prueba (mock determinista):
  - `{{cliente}}` $\rightarrow$ `Carlos Mendoza`
  - `{{pedido}}` $\rightarrow$ `#PED-20261113-001`
  - `{{estado}}` $\rightarrow$ `🥣 En preparación`
  - `{{productos}}` $\rightarrow$ `• 2x 1L (Fresa) - $24.000 COP\n• 1x 500ml (Maracuyá) - $8.000 COP`
  - `{{total}}` $\rightarrow$ `$32.000 COP`
  - `{{saldo_pendiente}}` $\rightarrow$ `$10.000 COP`
  - `{{abono}}` $\rightarrow$ `$22.000 COP`
  - `{{direccion}}` $\rightarrow$ `Calle 15 # 12-34, Fonseca`
  - `{{nequi}}` $\rightarrow$ `3024581882`
  - `{{banco}}` $\rightarrow$ `Nequi / Bancolombia`
  - `{{instagram}}` $\rightarrow$ `https://www.instagram.com/yogurartesanalfonseca`
  - `{{botellas_acumuladas}}` $\rightarrow$ `8.5`
  - `{{botellas_restantes}}` $\rightarrow$ `1.5`
  - `{{premios_disponibles}}` $\rightarrow$ `1`
- **RF-9**: CUANDO el usuario guarde las modificaciones de una plantilla con texto válido, EL SISTEMA debe persistir el nuevo contenido en base de datos y emitir una notificación toast de confirmación.
- **RF-10**: SI el usuario intenta guardar una plantilla con el contenido vacío o formado exclusivamente por espacios en blanco, ENTONCES EL SISTEMA debe impedir el guardado y responder con un error HTTP 400 (`BadRequestError`).

### Restauración a Valores de Fábrica
- **RF-11**: CUANDO el Administrador presione la acción "Restablecer plantilla original", EL SISTEMA debe desplegar un diálogo de confirmación advirtiendo que se descartarán las modificaciones personalizadas.
- **RF-12**: CUANDO el usuario confirme el restablecimiento, EL SISTEMA debe sobrescribir el campo `content` con el valor exacto de `defaultContent` y refrescar inmediatamente la interfaz y la previsualización.

### Comportamiento del Interruptor y Flujo de Despacho
- **RF-13**: EL SISTEMA debe inicializar por defecto el interruptor `autoTrigger` en `false` para todas las plantillas registradas.
- **RF-14**: CUANDO el Administrador alterne el interruptor de activación de una plantilla con evento operativo, EL SISTEMA debe persistir inmediatamente el nuevo valor booleano en el servidor.
- **RF-15**: SI una plantilla tiene `autoTrigger === false` (o es de invocación manual), EL SISTEMA no debe abrir ninguna ventana emergente automática al completarse el evento operativo correspondiente.
- **RF-16**: SI una plantilla tiene `autoTrigger === true` y se completa exitosamente la mutación en el servidor asociada al evento:
  - En Domicilios (`DeliveryView` / `DeliveryConfirmModal`): Al confirmar entrega, tras cerrarse el modal de entrega, EL SISTEMA debe abrir automáticamente el modal de previsualización con `DELIVERED_PAID` (si saldo $\le 0$) o `DELIVERED_UNPAID` (si saldo $> 0$). Al pasar a en ruta desde Domicilios, abre `DELIVERY_IN_ROUTE_SHORT`.
  - En Pedidos (`OrdersView` / `PaymentModal`): Al pasar a en ruta desde Pedidos, abre `DELIVERY_IN_ROUTE_FULL`. Al registrar un abono o pago total en preventa, abre `PAID_NOT_DELIVERED`. Al registrar un abono en un pedido entregado que deje el saldo en \$0 (Paz y Salvo), abre `DELIVERED_PAID`.
- **RF-17**: EL SISTEMA nunca debe despachar mensajes de WhatsApp de forma invisible en segundo plano; el disparo asistido consiste estrictamente en la apertura automática del modal de previsualización para revisión humana.
- **RF-18**: DENTRO del modal de previsualización, EL SISTEMA debe permitir al usuario editar libremente el texto final antes de enviar y seleccionar entre:
  a) "Confirmar y Enviar": despacho mediante la sesión activa de WhatsApp de la aplicación (Baileys). SI la sesión de Baileys se encuentra desconectada (`isWhatsAppConnected === false`), EL SISTEMA debe emitir un toast de advertencia invitando a reconectar en CRM o a despachar mediante el botón "Enviar desde mi teléfono".
  b) "Enviar desde mi teléfono": apertura del chat oficial de WhatsApp mediante `buildWhatsAppUrl(contact, text)` utilizando `window.open(url, '_blank')`.
  c) "Cancelar": descartar el envío sin alterar el estado operativo del pedido, cobro o fidelización.

### Resolución e Interpolación de Variables
- **RF-19**: CUANDO se solicite la generación de un mensaje, EL SISTEMA debe compilar la plantilla correspondiente sustituyendo las etiquetas dinámicas mediante reemplazo literal seguro sin evaluación de expresiones regulares arbitrarias.
- **RF-20**: SI en la base de datos no existe la plantilla solicitada o la tabla no está disponible, ENTONCES EL SISTEMA debe utilizar el texto de fábrica registrado en memoria (patrón fallback seguro).
- **RF-21**: EN la variable `{{estado}}`, EL SISTEMA debe traducir estrictamente los valores de entrega bajo el siguiente diccionario canónico:
  - `PENDING` $\rightarrow$ `🕒 Pendiente por preparar`
  - `PREPARING` $\rightarrow$ `🥣 En preparación`
  - `READY_FOR_DISPATCH` $\rightarrow$ `📦 Listo para despacho`
  - `IN_ROUTE` $\rightarrow$ `🛵 En camino`
  - `DELIVERED` $\rightarrow$ `✅ Entregado`
  - `CANCELLED` $\rightarrow$ `❌ Cancelado`
- **RF-22**: SI el cliente no tiene nombre registrado (`customer.fullName` nulo o vacío), la variable `{{cliente}}` debe resolver por defecto a `"Cliente"`.
- **RF-23**: SI el pedido o cliente no registra dirección (`deliveryAddress` y `customer.address` nulos o vacíos), la variable `{{direccion}}` debe resolver a `"Entrega en punto de venta / Sin dirección registrada"`.
- **RF-24**: SI un pedido o cliente registra un abono igual o superior al total (`paidAmount >= totalAmount`), la variable `{{saldo_pendiente}}` debe resolver explícitamente a `$0 COP (Paz y Salvo)`.
- **RF-25**: EN la plantilla `PAYMENT_REMINDER`, el saldo pendiente inyectado debe computarse dinámicamente como la suma de los pedidos entregados menos los abonos registrados (`OrderPayment`), cumpliendo con el Art. 3 de la Constitución.
- **RF-26**: SI un cliente registra cartera pendiente (`pendingDebt > 0`) y se invoca la plantilla `LOYALTY_REWARD_CLAIM`, EL SISTEMA debe advertir al usuario en la previsualización y agregar una nota indicando que para canjear premios de fidelización se requiere estar a paz y salvo (Art. 7 y Spec 013).
- **RF-27**: EN las variables numéricas de fidelización (`{{botellas_acumuladas}}`, `{{botellas_restantes}}`), SI el valor es entero, EL SISTEMA debe formatearlo sin decimales (ej. `0`, `7`, `10`); SI contiene fracciones (ej. presentaciones de 500 ml que aportan 0.5 botellas), EL SISTEMA debe formatearlo con un decimal (ej. `8.5`, `1.5`).
- **RF-28**: SI un cliente no posee número telefónico pero cuenta con identificador de usuario de WhatsApp (`@usuario`), EL SISTEMA debe formatear el enlace de apertura externa utilizando el parámetro `username` de la API de WhatsApp, según lo estipulado en la Spec 009.

---

## Requisitos no funcionales
- **RNF-1 (Seguridad y Permisos)**: La modificación de plantillas del sistema, su activación/desactivación y su restauración a fábrica debe estar restringida exclusivamente a usuarios autenticados con rol `ADMIN`.
- **RNF-2 (Rendimiento)**: La interpolación y resolución de variables de una plantilla en el servidor debe ejecutarse en menos de 30 milisegundos.
- **RNF-3 (Disponibilidad y Tolerancia a Fallos)**: Si la conexión a WhatsApp está desconectada o falla el socket de Baileys, el sistema debe mantener siempre disponible y funcional la opción de "Enviar desde mi teléfono".
- **RNF-4 (Compatibilidad Responsive y Modales)**: La interfaz de gestión de plantillas y el modal de edición deben cumplir la estructura de 3 capas fijas (cabecera fija, cuerpo scrollable, pie de acción fijo) según el Art. 10 de la Constitución.
- **RNF-5 (Precisión Temporal)**: Toda fecha u hora formateada dentro de los mensajes debe generarse bajo la zona horaria legal de Colombia (`America/Bogota` / UTC-5), según el Art. 8 de la Constitución.
- **RNF-6 (Concurrencia Administrativa)**: La persistencia de modificaciones sobre las plantillas opera bajo la estrategia de última escritura gana (*last-write-wins*), actualizando automáticamente la marca de tiempo `updatedAt`.

---

## Casos límite
1. **Cliente sin número de teléfono ni `@usuario`**: El modal de previsualización debe mostrar una advertencia visual ("Cliente sin teléfono registrado") y deshabilitar los botones de envío directo, permitiendo únicamente copiar el texto al portapapeles.
2. **Pedido con múltiples sabores y presentaciones**: La etiqueta `{{productos}}` debe formatear cada ítem con la estructura: `• <cantidad>x <presentación> (<sabor>) - $<subtotal> COP` separados por salto de línea (`\n`).
3. **Caracteres especiales en el texto personalizado**: Si el usuario introduce caracteres como `$`, `\`, `*`, `_`, `{}`, el motor de interpolación debe tratarlos como texto literal sin alterar la sintaxis de escape.
4. **Configuración de Nequi o Instagram vacía**: Si los campos en la configuración general no están definidos, el sistema debe utilizar los valores de respaldo estándar de YogurArte: Nequi `3024581882`, Banco `Nequi / Bancolombia`, Instagram `https://www.instagram.com/yogurartesanalfonseca`.
5. **Pedidos cancelados (`CANCELLED`)**: En pedidos con estado cancelado, el botón de WhatsApp debe estar deshabilitado con un tooltip indicando que el pedido está anulado para evitar envíos de confirmación erróneos.

---

## Fuera de alcance
- Envío masivo automatizado de mensajes de marketing o listas de difusión a toda la base de clientes.
- Creación de eventos nuevos arbitrarios no previstos en el ciclo operativo de YogurArte (el catálogo de eventos soportados está delimitado a los 9 oficiales).
- Reemplazo de la plataforma de mensajería (el canal sigue siendo exclusivamente WhatsApp).

---

## Criterios de finalización
- La base de datos cuenta con la estructura persistente para plantillas del sistema, precargada con las 9 plantillas oficiales de YogurArte mediante migración/seed.
- Los endpoints de consulta, actualización y restauración de plantillas operan bajo control de acceso de rol `ADMIN` con sus respectivas pruebas unitarias y de integración en `tests/crm.test.ts`.
- La pestaña "Plantillas" del CRM presenta limpiamente la navegación entre "Plantillas del Sistema" y "Respuestas Rápidas".
- El modal de edición restringe las variables a la matriz de compatibilidad según la plantilla, muestra la previsualización en vivo estilo WhatsApp con el set mock determinista y guarda los cambios correctamente.
- La acción de restablecer restaura fielmente el texto original de fábrica.
- Los generadores de mensajes en Pedidos, Domicilios, Clientes y Fidelización consumen dinámicamente las plantillas centralizadas.
- El interruptor de disparo asistido controla si el modal de previsualización se abre automáticamente tras el evento o si permanece a la espera de clic manual.
- Las suites de pruebas de backend (`vitest`), el chequeo de tipos (`tsc --noEmit`) y el empaquetado del frontend (`vite build`) superan el 100% de verificaciones sin errores.
