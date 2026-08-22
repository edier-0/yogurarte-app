import { z } from 'zod';

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

export const adjustStockSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive().optional(),
  newStock: z.coerce.number().min(0, 'El stock no puede ser negativo'),
  type: z.string().optional(),
  reason: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
  adjustmentDate: z.string().optional(),
});

export const createPurchaseSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive(),
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
