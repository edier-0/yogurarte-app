import { z } from 'zod';

export const updateSettingsSchema = z.object({
  nequiNumber: z.string().trim().min(7, 'El número de Nequi / celular debe tener al menos 7 dígitos').optional(),
  bankHolder: z.string().trim().min(2, 'El nombre del titular debe tener al menos 2 caracteres').optional(),
  bankName: z.string().trim().min(2, 'El nombre del banco o plataforma debe tener al menos 2 caracteres').optional(),
  paymentInstructions: z.string().trim().optional().nullable(),
  daviplataNumber: z.string().trim().optional().nullable(),
  bancolombiaAccount: z.string().trim().optional().nullable(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
