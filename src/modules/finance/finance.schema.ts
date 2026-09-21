import { z } from 'zod';

// ==========================================
// 1. MOVIMIENTOS DE CAJA (CASH MOVEMENTS)
// ==========================================

export const cashMovementTypeEnum = z.enum([
  'BASE_INICIAL',
  'APORTE_SOCIO',
  'RETIRO_BASE',
  'AJUSTE_CAJA',
  'AJUSTE_SOBRANTE',
  'AJUSTE_FALTANTE',
  'TRASLADO_EFECTIVO_A_BANCO',
  'TRASLADO_BANCO_A_EFECTIVO',
]);

export const createCashMovementSchema = z.object({
  type: cashMovementTypeEnum.default('BASE_INICIAL'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  movementDate: z.string().optional(),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updateCashMovementSchema = z.object({
  type: cashMovementTypeEnum.optional(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0').optional(),
  movementDate: z.string().optional(),
  concept: z.string().min(1).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const cashMovementsQuerySchema = z.object({
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// 2. GASTOS GENERALES Y OPERATIVOS (EXPENSES)
// ==========================================

export const createExpenseSchema = z.object({
  category: z.string().optional().default('OTRO'),
  description: z.string().min(1, 'La descripción del gasto es obligatoria'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  expenseDate: z.string().optional(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const expensesQuerySchema = z.object({
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// 3. CRÉDITOS Y COMPRAS A CUOTAS (CREDITS)
// ==========================================

export const createCreditSchema = z.object({
  title: z.string().min(1, 'El nombre o descripción del bien es obligatorio'),
  category: z.string().optional().default('EQUIPO_MAQUINARIA'),
  creditor: z.string().min(1, 'El nombre del acreedor o entidad es obligatorio'),
  principalAmount: z.coerce.number().positive('El valor base debe ser mayor a 0'),
  interestRate: z.coerce.number().min(0).optional().default(0),
  initialPayment: z.coerce.number().min(0).optional().default(0),
  initialPaymentMethod: z.string().optional().default('EFECTIVO'),
  paymentType: z.enum(['CUOTAS_FIJAS', 'ABONOS_LIBRES']).optional().default('CUOTAS_FIJAS'),
  frequency: z.enum(['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL', 'PERSONALIZADO', 'LIBRE']).optional().default('MENSUAL'),
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

// ==========================================
// 4. DASHBOARD Y ANALÍTICA FINANCIERA
// ==========================================

export const dashboardSummaryQuerySchema = z.object({
  period: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.string().optional(),
  includeOrders: z.string().optional(),
});

// ==========================================
// TIPOS INFERIDOS DE ENTRADA
// ==========================================

export type CreateCashMovementInput = z.infer<typeof createCashMovementSchema>;
export type UpdateCashMovementInput = z.infer<typeof updateCashMovementSchema>;
export type CashMovementsQueryInput = z.infer<typeof cashMovementsQuerySchema>;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpensesQueryInput = z.infer<typeof expensesQuerySchema>;

export type CreateCreditInput = z.infer<typeof createCreditSchema>;
export type PayCreditInstallmentInput = z.infer<typeof payCreditInstallmentSchema>;
export type SkipCreditInstallmentInput = z.infer<typeof skipCreditInstallmentSchema>;

export type DashboardSummaryQueryInput = z.infer<typeof dashboardSummaryQuerySchema>;
