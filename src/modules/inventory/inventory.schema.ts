import { z } from 'zod';

// ==========================================
// 1. INSUMOS Y MATERIAS PRIMAS (RAW MATERIALS)
// ==========================================

export const createMaterialSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre del insumo es obligatorio'),
  category: z.string().optional().default('INSUMO'),
  unit: z.string().min(1, 'La unidad de medida es obligatoria'),
  minStockAlert: z.coerce.number().min(0).optional().default(10),
  avgCost: z.coerce.number().min(0).optional().default(0),
  currentStock: z.coerce.number().min(0).optional().default(0),
});

export const updateMaterialSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  unit: z.string().min(1).optional(),
  minStockAlert: z.coerce.number().min(0).optional(),
  avgCost: z.coerce.number().min(0).optional(),
  currentStock: z.coerce.number().min(0).optional(),
});

export const materialsQuerySchema = z.object({
  includeInactive: z.string().optional(),
});

// ==========================================
// 2. AJUSTES DE INVENTARIO (KARDEX)
// ==========================================

export const adjustStockSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive().optional(),
  newStock: z.coerce.number().min(0, 'El stock no puede ser negativo'),
  type: z.string().optional(),
  reason: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
  adjustmentDate: z.string().optional(),
});

export const adjustmentsQuerySchema = z.object({
  rawMaterialId: z.string().optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// 3. COMPRAS DE INSUMOS (PURCHASES)
// ==========================================

export const createPurchaseSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive('ID de insumo inválido'),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  unitCost: z.coerce.number().min(0).optional(),
  totalCost: z.coerce.number().min(0).optional(),
  supplier: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  paymentMethod: z.string().optional().default('EFECTIVO'),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const updatePurchaseSchema = z.object({
  supplier: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  quantity: z.coerce.number().positive().optional(),
  unitCost: z.coerce.number().min(0).optional(),
  totalCost: z.coerce.number().min(0).optional(),
  purchaseDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const purchasesQuerySchema = z.object({
  rawMaterialId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ==========================================
// TIPOS INFERIDOS DE ENTRADA
// ==========================================

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MaterialsQueryInput = z.infer<typeof materialsQuerySchema>;

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type AdjustmentsQueryInput = z.infer<typeof adjustmentsQuerySchema>;

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type PurchasesQueryInput = z.infer<typeof purchasesQuerySchema>;
