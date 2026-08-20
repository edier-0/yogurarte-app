import { z } from 'zod';

export const extraItemSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive(),
  quantityUsed: z.coerce.number().positive('La cantidad de insumo extra debe ser mayor a 0'),
  unit: z.string().optional(),
});

export const createBatchSchema = z.object({
  milkUsedLiters: z.coerce.number().positive('La cantidad de leche debe ser mayor a 0'),
  totalLitersProduced: z.coerce.number().optional(),
  bottles1LProduced: z.coerce.number().min(0).optional().default(0),
  bottles2LProduced: z.coerce.number().min(0).optional().default(0),
  flavor: z.string().min(1, 'El sabor es obligatorio'),
  preparationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
  useSugar: z.boolean().optional().default(true),
  sugarGramsPerLiter: z.coerce.number().optional(),
  usePowderedMilk: z.boolean().optional().default(true),
  powderedMilkGramsPerLiter: z.coerce.number().optional(),
  useLabels: z.boolean().optional(),
  extraItems: z.array(extraItemSchema).optional(),
  price1L: z.coerce.number().optional(),
  price2L: z.coerce.number().optional(),
  status: z.string().optional(),
});

export const updateBatchSchema = z.object({
  milkUsedLiters: z.coerce.number().positive().optional(),
  totalLitersProduced: z.coerce.number().optional(),
  bottles1LProduced: z.coerce.number().min(0).optional(),
  bottles2LProduced: z.coerce.number().min(0).optional(),
  flavor: z.string().min(1).optional(),
  preparationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  price1L: z.coerce.number().optional(),
  price2L: z.coerce.number().optional(),
});

export const linkOrdersToBatchSchema = z.object({
  orderIds: z.array(z.coerce.number().int().positive()).optional(),
  autoMatch: z.boolean().optional(),
});

export const deactivateBatchSchema = z.object({
  reason: z.string().optional(),
  restoreStock: z.boolean().optional(),
  unlinkOrders: z.boolean().optional(),
});
