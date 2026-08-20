import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.string().optional().default('OTRO'),
  description: z.string().min(1, 'La descripción del gasto es obligatoria'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});
