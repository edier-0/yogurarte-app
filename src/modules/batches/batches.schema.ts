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
  flavor: z.string().min(1, 'El sabor es obligatorio').optional().default('Natural'),
  cultureType: z.string().optional().nullable(),
  fermentationHours: z.coerce.number().min(0).optional().default(8),
  initialSugarGrams: z.coerce.number().min(0).optional().default(0),
  powderedMilkGrams: z.coerce.number().min(0).optional().default(0),
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
  dynamicItems: z.array(z.object({
    rawMaterialId: z.coerce.number().int().positive(),
    quantityUsed: z.coerce.number().positive(),
    unitCost: z.coerce.number().optional(),
  })).optional(),
  price1L: z.coerce.number().optional(),
  price2L: z.coerce.number().optional(),
  status: z.string().optional(),
  linkOrderIds: z.array(z.coerce.number().int().positive()).optional(),
  autoLinkPendingOrders: z.boolean().optional(),
});

export const updateBatchSchema = z.object({
  milkUsedLiters: z.coerce.number().positive().optional(),
  totalLitersProduced: z.coerce.number().optional(),
  bottles1LProduced: z.coerce.number().min(0).optional(),
  bottles2LProduced: z.coerce.number().min(0).optional(),
  flavor: z.string().min(1).optional(),
  cultureType: z.string().optional().nullable(),
  fermentationHours: z.coerce.number().min(0).optional(),
  preparationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
  status: z.string().optional(),
  price1L: z.coerce.number().optional(),
  price2L: z.coerce.number().optional(),
  dynamicItems: z.array(z.object({
    rawMaterialId: z.coerce.number().int().positive(),
    quantityUsed: z.coerce.number().min(0),
    unitCost: z.coerce.number().optional(),
  })).optional(),
});

export const patchBatchStatusSchema = z.object({
  status: z.enum(['EN_FERMENTACION', 'DISPONIBLE']),
});

export const batchPackagingSchema = z.object({
  flavor: z.string().min(1, 'El sabor es obligatorio'),
  bottles1L: z.coerce.number().int().min(0).default(0),
  bottles2L: z.coerce.number().int().min(0).default(0),
  fruitRawMaterialId: z.coerce.number().int().positive().optional().nullable(),
  fruitQuantityUsed: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  packagedBy: z.string().optional().default('Edier'),
  packagedAt: z.string().optional(),
  linkOrderIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const updateBatchPackagingSchema = z.object({
  flavor: z.string().min(1).optional(),
  bottles1L: z.coerce.number().int().min(0).optional(),
  bottles2L: z.coerce.number().int().min(0).optional(),
  fruitRawMaterialId: z.coerce.number().int().positive().optional().nullable(),
  fruitQuantityUsed: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  packagedBy: z.string().optional(),
  packagedAt: z.string().optional(),
});

export const partnerWithdrawalSchema = z.object({
  bottleSize: z.string().optional().default('1L'),
  quantityBottles: z.coerce.number().int().min(1, 'La cantidad de botellas debe ser al menos 1').default(1),
  totalLiters: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().optional(),
  staffMemberId: z.coerce.number().int().positive('Debes seleccionar el socio que realiza el retiro'),
  dischargeDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional().default('Edier'),
});

export const unlinkOrderSchema = z.object({
  orderId: z.coerce.number().int().positive('ID de pedido inválido'),
});

export const linkOrdersToBatchSchema = z.object({
  orderIds: z.array(z.coerce.number().int().positive()).optional(),
  autoMatch: z.boolean().optional(),
  autoAll: z.boolean().optional(),
});

export const deactivateBatchSchema = z.object({
  reason: z.string().optional(),
  restoreStock: z.boolean().optional(),
  unlinkOrders: z.boolean().optional(),
});

export const createBatchDischargeSchema = z.object({
  bottleSize: z.string().optional().default('1L'),
  quantityBottles: z.coerce.number().min(1).optional().default(1),
  totalLiters: z.coerce.number().positive().optional(),
  unitPrice: z.coerce.number().optional(),
  reasonType: z.string().min(1).optional().default('CONSUMO_SOCIO'),
  staffMemberId: z.coerce.number().int().positive().optional().nullable(),
  dischargeDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
});

export const batchesQuerySchema = z.object({
  status: z.string().optional(),
  includeInactive: z.string().optional(),
  lite: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).optional().default(5),
});

export const pendingOrdersQuerySchema = z.object({
  flavor: z.string().optional(),
});

export const nextCodeQuerySchema = z.object({
  date: z.string().optional(),
  batchId: z.coerce.number().int().positive().optional(),
});

export type ExtraItemInput = z.infer<typeof extraItemSchema>;
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type PatchBatchStatusInput = z.infer<typeof patchBatchStatusSchema>;
export type BatchPackagingInput = z.infer<typeof batchPackagingSchema>;
export type UpdateBatchPackagingInput = z.infer<typeof updateBatchPackagingSchema>;
export type PartnerWithdrawalInput = z.infer<typeof partnerWithdrawalSchema>;
export type UnlinkOrderInput = z.infer<typeof unlinkOrderSchema>;
export type LinkOrdersToBatchInput = z.infer<typeof linkOrdersToBatchSchema>;
export type DeactivateBatchInput = z.infer<typeof deactivateBatchSchema>;
export type CreateBatchDischargeInput = z.infer<typeof createBatchDischargeSchema>;
export type BatchesQueryInput = z.infer<typeof batchesQuerySchema>;
export type PendingOrdersQueryInput = z.infer<typeof pendingOrdersQuerySchema>;
export type NextCodeQueryInput = z.infer<typeof nextCodeQuerySchema>;
