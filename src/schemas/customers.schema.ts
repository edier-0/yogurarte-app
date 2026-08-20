import { z } from 'zod';

export const createOrUpdateCustomerSchema = z.object({
  id: z.coerce.number().int().positive().optional().nullable(),
  fullName: z.string().min(1, 'El nombre completo es obligatorio'),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
  address: z.string().optional().default(''),
  neighborhood: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const applyCustomerPaymentSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  orderId: z.union([z.coerce.number().int().positive(), z.literal('AUTO')]).optional(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});
