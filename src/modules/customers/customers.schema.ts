import { z } from 'zod';

export const createOrUpdateCustomerSchema = z
  .object({
    id: z.coerce.number().int().positive().optional().nullable(),
    fullName: z.string().min(1, 'El nombre completo es obligatorio'),
    phone: z.string().optional(),
    whatsappUsername: z.string().optional().nullable(),
    whatsappId: z.string().optional().nullable(),
    jid: z.string().optional().nullable(),
    address: z.string().optional().default(''),
    neighborhood: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.phone && data.phone.trim().length > 0) ||
        (data.whatsappUsername && data.whatsappUsername.trim().length > 0) ||
        data.whatsappId ||
        data.jid
      ),
    {
      message: 'El teléfono o nombre de usuario de WhatsApp es obligatorio',
      path: ['phone'],
    }
  );

export const updateCustomerSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  whatsappUsername: z.string().optional().nullable(),
  whatsappId: z.string().optional().nullable(),
  jid: z.string().optional().nullable(),
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

export const customersQuerySchema = z.object({
  search: z.string().optional(),
  includeInactive: z.string().optional(),
  batchId: z.string().optional(),
  lite: z.string().optional(),
});

export const resolveCustomerSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional().nullable(),
  whatsappUsername: z.string().optional().nullable(),
  whatsappId: z.string().optional().nullable(),
  jid: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateOrUpdateCustomerInput = z.infer<typeof createOrUpdateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ApplyCustomerPaymentInput = z.infer<typeof applyCustomerPaymentSchema>;
export type CustomersQueryInput = z.infer<typeof customersQuerySchema>;
export type ResolveCustomerInput = z.infer<typeof resolveCustomerSchema>;
