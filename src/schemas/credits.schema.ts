import { z } from 'zod';

export const createCreditSchema = z.object({
  title: z.string().min(1, 'El nombre o descripción del bien es obligatorio'),
  category: z.string().optional().default('EQUIPO_MAQUINARIA'),
  creditor: z.string().min(1, 'El nombre del acreedor o entidad es obligatorio'),
  principalAmount: z.coerce.number().positive('El valor base debe ser mayor a 0'),
  interestRate: z.coerce.number().min(0).optional().default(0),
  initialPayment: z.coerce.number().min(0).optional().default(0),
  initialPaymentMethod: z.string().optional().default('EFECTIVO'),
  paymentType: z.enum(['CUOTAS_FIJAS', 'ABONOS_LIBRES']).optional().default('CUOTAS_FIJAS'),
  frequency: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL', 'PERSONALIZADO']).optional().default('MENSUAL'),
  installmentAmount: z.coerce.number().min(0).optional(),
  totalInstallments: z.coerce.number().int().positive().optional().nullable(),
  startDate: z.string().optional(),
  nextDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const payCreditInstallmentSchema = z.object({
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  installmentNumber: z.coerce.number().int().positive().optional(),
  receiptNumber: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const skipCreditInstallmentSchema = z.object({
  justification: z.string().min(1, 'Debes ingresar el motivo o justificación del aplazamiento'),
  newNextDueDate: z.string().min(1, 'Debes seleccionar la nueva fecha reprogramada'),
  registeredBy: z.string().optional(),
});
