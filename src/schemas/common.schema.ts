import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int('El ID debe ser un número entero').positive('El ID debe ser un número entero positivo'),
}).passthrough();

export const orderPaymentParamsSchema = z.object({
  id: z.coerce.number().int('El ID del pedido debe ser un número entero').positive('El ID del pedido debe ser positivo'),
  paymentId: z.coerce.number().int('El ID del abono debe ser un número entero').positive('El ID del abono debe ser positivo'),
}).passthrough();

