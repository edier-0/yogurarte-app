import { z } from 'zod';

export const createCashMovementSchema = z.object({
  type: z
    .enum([
      'BASE_INICIAL',
      'APORTE_SOCIO',
      'RETIRO_BASE',
      'AJUSTE_CAJA',
      'AJUSTE_SOBRANTE',
      'AJUSTE_FALTANTE',
      'TRASLADO_EFECTIVO_A_BANCO',
      'TRASLADO_BANCO_A_EFECTIVO',
    ])
    .default('BASE_INICIAL'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  movementDate: z.string().optional(),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updateCashMovementSchema = z.object({
  type: z
    .enum([
      'BASE_INICIAL',
      'APORTE_SOCIO',
      'RETIRO_BASE',
      'AJUSTE_CAJA',
      'AJUSTE_SOBRANTE',
      'AJUSTE_FALTANTE',
      'TRASLADO_EFECTIVO_A_BANCO',
      'TRASLADO_BANCO_A_EFECTIVO',
    ])
    .optional(),
  amount: z.coerce.number().positive().optional(),
  movementDate: z.string().optional(),
  concept: z.string().min(1).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional().nullable(),
});
