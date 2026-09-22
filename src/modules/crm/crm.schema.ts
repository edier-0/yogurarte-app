import { z } from 'zod';

/**
 * Esquema para envío de mensajes individuales de WhatsApp
 */
export const sendCrmMessageSchema = z
  .object({
    recipient: z
      .string()
      .min(2, 'El identificador o número de WhatsApp debe tener al menos 2 caracteres')
      .max(100, 'El ID de destinatario es demasiado largo')
      .optional(),
    remoteJid: z.string().optional(),
    to: z.string().optional(),
    text: z
      .string()
      .max(4000, 'El mensaje no puede superar los 4000 caracteres')
      .optional()
      .nullable(),
    mediaUrl: z.string().optional().nullable(),
    mediaType: z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER']).optional(),
    contactName: z.string().optional().nullable(),
    customerId: z.coerce.number().int().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      const target = data.recipient || data.remoteJid || data.to;
      const hasContent = (data.text && data.text.trim().length > 0) || Boolean(data.mediaUrl);
      return Boolean(target && hasContent);
    },
    {
      message: 'Se requiere destinatario y mensaje de texto o archivo multimedia para enviar',
      path: ['text'],
    }
  );

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
 * Esquema para crear compras frecuentes programadas
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
    .max(365, 'La frecuencia máxima es de 365 días')
    .optional()
    .default(15),
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

/**
 * Esquema para actualizar compras frecuentes programadas
 */
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
 * Esquemas para respuestas rápidas (plantillas)
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

/**
 * Esquemas de consulta (Query Params)
 */
export const getConversationsQuerySchema = z.object({
  search: z.string().optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
  tag: z.string().optional(),
});

export const getMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  beforeId: z.string().optional(),
});

export const getLoyaltyQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const redeemLoyaltySchema = z.object({
  customerId: z.coerce.number().int().positive('ID de cliente inválido'),
});

export const getRecurringQuerySchema = z.object({
  filter: z.enum(['ALL', 'TODAY', 'UPCOMING']).optional(),
  search: z.string().optional(),
});

export type SendCrmMessageInput = z.infer<typeof sendCrmMessageSchema>;
export type LinkCustomerInput = z.infer<typeof linkCustomerSchema>;
export type UpdateConversationTagInput = z.infer<typeof updateConversationTagSchema>;
export type CreateRecurringScheduleInput = z.infer<typeof createRecurringScheduleSchema>;
export type UpdateRecurringScheduleInput = z.infer<typeof updateRecurringScheduleSchema>;
export type CreateQuickReplyInput = z.infer<typeof createQuickReplySchema>;
export type UpdateQuickReplyInput = z.infer<typeof updateQuickReplySchema>;
export type GetConversationsQuery = z.infer<typeof getConversationsQuerySchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type GetLoyaltyQuery = z.infer<typeof getLoyaltyQuerySchema>;
export type RedeemLoyaltyInput = z.infer<typeof redeemLoyaltySchema>;
export type GetRecurringQuery = z.infer<typeof getRecurringQuerySchema>;
