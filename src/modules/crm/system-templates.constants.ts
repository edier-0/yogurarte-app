/**
 * Constantes y Definiciones Canónicas de Plantillas del Sistema de WhatsApp (Spec 014)
 */

export interface SystemTemplateDefinition {
  code: string;
  title: string;
  category: 'PEDIDOS' | 'DOMICILIOS' | 'CARTERA' | 'FIDELIZACION';
  description: string;
  defaultContent: string;
  availableVariables: string[];
  autoTrigger: boolean;
  hasOperationalTrigger: boolean;
}

export const CANONICAL_SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
  {
    code: 'ORDER_STATUS_TRACKING',
    title: 'Seguimiento de Pedido (Detallado)',
    category: 'PEDIDOS',
    description: 'Informa al cliente el estado actual de su orden en preparación, desglosando productos, dirección y saldo.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: false,
    defaultContent: `🥛 *YogurArte | Pedido #{{pedido}}*

¡Hola *{{cliente}}*! El estado de tu pedido es: *{{estado}}*
{{productos}}

💰 *Total:* {{total}}
🚨 *Saldo pendiente:* {{saldo_pendiente}}
📍 *Dirección:* {{direccion}}
💳 *{{banco}}:* {{nequi}}

¡Muchas gracias por elegir nuestro yogur artesanal 100% natural! 🥛🍇🍓

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'DELIVERY_IN_ROUTE_SHORT',
    title: 'Despacho en Ruta (Breve - Domicilios)',
    category: 'DOMICILIOS',
    description: 'Aviso corto enviado desde la vista de Domicilios recordando al cliente que el repartidor va en camino.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: true,
    defaultContent: `🛵 ¡Hola *{{cliente}}*! Tu pedido de YogurArte ya va en camino hacia tu dirección (📍 *{{direccion}}*). Por favor atento para recibirlo. ¡Muchas gracias por tu compra! 🥛🍇🍓`,
  },
  {
    code: 'DELIVERY_IN_ROUTE_FULL',
    title: 'Despacho en Ruta (Completo - Pedidos)',
    category: 'PEDIDOS',
    description: 'Notificación detallada de despacho en camino desde Pedidos con desglose de productos y dirección.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: true,
    defaultContent: `🥛 *YogurArte | Pedido en Ruta 🛵💨*

¡Hola *{{cliente}}*! Te informamos que tu pedido *#{{pedido}}* ya va en camino:
{{productos}}

💰 *Total:* {{total}}
🚨 *Saldo pendiente:* {{saldo_pendiente}}
📍 *Entrega:* {{direccion}}
💳 *{{banco}}:* {{nequi}}

¡Atento a recibir a nuestro domiciliario! Muchas gracias por tu confianza. 🥛🍇🍓

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'DELIVERED_PAID',
    title: 'Pedido Entregado (Paz y Salvo)',
    category: 'PEDIDOS',
    description: 'Confirmación de entrega para pedidos 100% pagados o tras liquidar saldo pendiente a $0 con gratitud.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: true,
    defaultContent: `🥛 *YogurArte | ¡Pago Recibido y Entregado con Éxito! ✨*

¡Hola *{{cliente}}*! Confirmamos la entrega de tu pedido *#{{pedido}}*:
{{productos}}

💰 *Total Pagado:* {{total}} (✅ Paz y Salvo)
📦 *Estado:* ✅ Entregado

¡Muchísimas gracias por tu compra y cumplimiento! Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural. 🥛🍇🍓

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'DELIVERED_UNPAID',
    title: 'Pedido Entregado (Saldo Pendiente / Fiado)',
    category: 'PEDIDOS',
    description: 'Notificación de entrega recordando el saldo adeudado, abonos recibidos y datos bancarios de transferencia.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: true,
    defaultContent: `🥛 *YogurArte | Pedido Entregado #{{pedido}}*

¡Hola *{{cliente}}*! Tu pedido ha sido *✅ Entregado con éxito*:
{{productos}}

🚨 *Saldo pendiente:* {{saldo_pendiente}}
💵 *Abonado:* {{abono}}
💳 *{{banco}}:* {{nequi}}

¡Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural! Para tu próximo pago estamos a tu entera orden. 🥛🍇🍓

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'PAID_NOT_DELIVERED',
    title: 'Pago Confirmado (Preventa / Sin Entregar)',
    category: 'PEDIDOS',
    description: 'Confirmación de pago anticipado recibido para encargos en proceso que aún no salen a reparto.',
    availableVariables: [
      'cliente',
      'pedido',
      'estado',
      'productos',
      'total',
      'saldo_pendiente',
      'abono',
      'direccion',
      'nequi',
      'banco',
      'instagram',
    ],
    autoTrigger: false,
    hasOperationalTrigger: true,
    defaultContent: `🥛 *YogurArte | Pago Confirmado ✨*

¡Hola *{{cliente}}*! Confirmamos el pago de tu encargo *#{{pedido}}*:
{{productos}}

💰 *Total Pagado:* {{total}} (✅ Paz y Salvo)
📦 *Estado:* {{estado}}
📍 *Entrega:* {{direccion}}

🥣 ¡Muchas gracias por tu compra y confianza! Tu yogur 100% natural está siendo preparado y te avisaremos apenas vaya en camino. 🍓🛵💨

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'PAYMENT_REMINDER',
    title: 'Recordatorio de Cartera (Cobro Amable)',
    category: 'CARTERA',
    description: 'Mensaje institucional cordial para clientes que registran saldos pendientes de entregas anteriores.',
    availableVariables: ['cliente', 'saldo_pendiente', 'nequi', 'banco', 'instagram'],
    autoTrigger: false,
    hasOperationalTrigger: false,
    defaultContent: `¡Hola *{{cliente}}*! 🥛✨ Te saludamos con mucho cariño desde *YogurArte*.

Esperamos que estés disfrutando tus yogures artesanales. Te recordamos amablemente que presentas un saldo pendiente de *{{saldo_pendiente}}* de tu entrega anterior.

💳 Puedes transferir a nuestro *{{banco}}* al *{{nequi}}* y compartirnos tu comprobante por este medio. ¡Muchísimas gracias por tu apoyo continuo a nuestro emprendimiento artesanal! 🙌🐄

📸 *Síguenos en Instagram:*
{{instagram}}`,
  },
  {
    code: 'LOYALTY_PROGRESS',
    title: 'Fidelización (Avance de Botellas)',
    category: 'FIDELIZACION',
    description: 'Notificación del progreso acumulado en la tarjeta de fidelización hacia la meta de 10 botellas.',
    availableVariables: ['cliente', 'botellas_acumuladas', 'botellas_restantes', 'instagram'],
    autoTrigger: false,
    hasOperationalTrigger: false,
    defaultContent: `¡Hola *{{cliente}}*! 🥛✨ Te saludamos desde *YogurArte*.

Te recordamos que en tu Tarjeta de Fidelización llevas *{{botellas_acumuladas}}/10 botellas* acumuladas. ¡Te faltan solo *{{botellas_restantes}} botella(s)* para recibir tu próximo litro totalmente GRATIS! 🎁🍓

¡Muchas gracias por tu lealtad a nuestro yogur artesanal! 🙌🥛`,
  },
  {
    code: 'LOYALTY_REWARD_CLAIM',
    title: 'Fidelización (Premio Listo para Reclamar)',
    category: 'FIDELIZACION',
    description: 'Notificación de beneficio alcanzado informando los litros gratis disponibles para redimir en el próximo pedido.',
    availableVariables: ['cliente', 'premios_disponibles', 'instagram'],
    autoTrigger: false,
    hasOperationalTrigger: false,
    defaultContent: `🎉 ¡Felicitaciones *{{cliente}}*! 🥛✨

Te saludamos desde *YogurArte* para informarte que en nuestro Programa de Fidelización cuentas con *{{premios_disponibles}} Litro(s) GRATIS* listo(s) para reclamar en tu próximo pedido. 🎁🍓

¡Muchísimas gracias por tu fidelidad y preferencia continua! Contáctanos para apartar tu litro de cortesía. 🥛🍇`,
  },
];
