import { z } from 'zod';

// ==========================================
// 1. MIEMBROS DEL PERSONAL / COLABORADORES
// ==========================================

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

export const staffQuerySchema = z.object({
  includeInactive: z.string().optional(),
  type: z.string().optional(),
});

// ==========================================
// 2. PAGOS DE NÓMINA, RETIROS Y ANTICIPOS
// ==========================================

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

export const updateStaffPaymentSchema = z.object({
  staffId: z.coerce.number().int().positive('ID de integrante inválido').optional(),
  paymentType: z.string().optional(),
  amount: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional(),
  netAmount: z.coerce.number().min(0).optional(),
  periodStart: z.string().optional().nullable(),
  periodEnd: z.string().optional().nullable(),
  paymentDate: z.string().optional(),
  calculationDetails: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const staffPaymentsQuerySchema = z.object({
  staffId: z.string().optional(),
  paymentType: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  period: z.string().optional(),
});

// ==========================================
// TIPOS INFERIDOS DE ENTRADA
// ==========================================

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffQueryInput = z.infer<typeof staffQuerySchema>;

export type CreateStaffPaymentInput = z.infer<typeof createStaffPaymentSchema>;
export type UpdateStaffPaymentInput = z.infer<typeof updateStaffPaymentSchema>;
export type StaffPaymentsQueryInput = z.infer<typeof staffPaymentsQuerySchema>;
