import { z } from 'zod';

export const createStaffSchema = z.object({
  fullName: z.string().min(1, 'El nombre completo es obligatorio'),
  phone: z.string().optional().nullable(),
  role: z.string().optional(),
  type: z.enum(['SOCIO', 'EMPLEADO']).optional().default('EMPLEADO'),
  paymentScheme: z.string().optional().default('LIBRE'),
  defaultRate: z.coerce.number().min(0).optional().default(0),
  bankInfo: z.string().optional().nullable(),
});

export const updateStaffSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.string().optional(),
  type: z.enum(['SOCIO', 'EMPLEADO']).optional(),
  paymentScheme: z.string().optional(),
  defaultRate: z.coerce.number().min(0).optional(),
  bankInfo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createStaffPaymentSchema = z.object({
  staffId: z.coerce.number().int().positive('ID de integrante inválido'),
  paymentType: z.string().optional(),
  amount: z.coerce.number().min(0),
  deductions: z.coerce.number().min(0).optional().default(0),
  netAmount: z.coerce.number().min(0).optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  paymentDate: z.string().optional(),
  calculationDetails: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});
