import { z } from 'zod';

/**
 * Esquema para envío de mensajes individuales de WhatsApp
 */
export const sendCrmMessageSchema = z
  .object({
    recipient: z
      .string()
      .min(7, 'El número o ID de WhatsApp debe tener al menos 7 caracteres')
      .max(100, 'El ID de destinatario es demasiado largo'),
    text: z
      .string()
      .max(4000, 'El mensaje no puede superar los 4000 caracteres')
      .optional()
      .nullable(),
    mediaUrl: z.string().optional().nullable(),
    mediaType: z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER']).optional(),
  })
  .refine((data) => (data.text && data.text.trim().length > 0) || data.mediaUrl, {
    message: 'Debes ingresar un texto o adjuntar un archivo multimedia para enviar',
    path: ['text'],
  });

/**
 * Esquema para vincular una conversación de chat con un cliente registrado
 */
export const linkCustomerSchema = z.object({
  customerId: z.coerce.number().int().positive().nullable(),
});

/**
 * Esquema para actualizar la etiqueta de estado de un chat (Embudo)
 */
export const updateConversationTagSchema = z.object({
  tag: z.enum(['NUEVO', 'INTERESADO', 'PEDIDO_ACTIVO', 'CLIENTE_FRECUENTE', 'SEGUIMIENTO']),
});

/**
 * Esquema para crear / actualizar compras frecuentes programadas
 */
export const createRecurringScheduleSchema = z.object({
  customerId: z.coerce
    .number()
    .int('El ID de cliente debe ser un entero')
    .positive('El ID de cliente debe ser positivo'),
  frequencyDays: z.coerce
    .number()
    .int('La frecuencia debe ser en días enteros')
    .min(1, 'La frecuencia mínima es de 1 día')
    .max(365, 'La frecuencia máxima es de 365 días'),
  preferredFlavor: z.string().min(2, 'Ingresa un sabor válido'),
  bottleSize: z.enum(['1L', '2L']),
  quantity: z.coerce
    .number()
    .int('La cantidad debe ser entera')
    .min(1, 'La cantidad mínima es 1'),
  nextDate: z.string().min(4, 'La fecha de recordatorio es obligatoria'),
  notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateRecurringScheduleSchema = z.object({
  frequencyDays: z.coerce.number().int().min(1).max(365).optional(),
  preferredFlavor: z.string().min(2).optional(),
  bottleSize: z.enum(['1L', '2L']).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  nextDate: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * Esquema para crear / actualizar respuestas rápidas (plantillas)
 */
export const createQuickReplySchema = z.object({
  shortcut: z
    .string()
    .min(2, 'El atajo debe tener al menos 2 caracteres')
    .max(50, 'El atajo no puede tener más de 50 caracteres'),
  title: z
    .string()
    .min(2, 'El título debe tener al menos 2 caracteres')
    .max(100, 'El título no puede superar 100 caracteres'),
  content: z
    .string()
    .min(1, 'El contenido no puede estar vacío')
    .max(4000, 'El contenido no puede superar 4000 caracteres'),
  category: z.enum(['VENTAS', 'PAGOS', 'GENERAL', 'INFO']).optional().default('VENTAS'),
  mediaUrl: z.string().optional().nullable(),
});

export const updateQuickReplySchema = z.object({
  shortcut: z.string().min(2).max(50).optional(),
  title: z.string().min(2).max(100).optional(),
  content: z.string().min(1).max(4000).optional(),
  category: z.enum(['VENTAS', 'PAGOS', 'GENERAL', 'INFO']).optional(),
  mediaUrl: z.string().optional().nullable(),
});
