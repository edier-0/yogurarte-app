import { z } from 'zod';

export const preparationIngredientSchema = z.object({
  rawMaterialId: z.coerce.number().int().positive(),
  quantityUsed: z.coerce.number().positive('La cantidad utilizada debe ser mayor a 0'),
  unitUsed: z.string().optional(),
});

export const createPreparationSchema = z.object({
  outputMaterialId: z.coerce.number().int().positive().optional().nullable(),
  newMaterialName: z.string().optional().nullable(),
  quantityProduced: z.coerce.number().positive('La cantidad producida debe ser mayor a 0'),
  unit: z.string().optional().default('Kilogramos'),
  preparationDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  registeredBy: z.string().optional(),
  ingredients: z.array(preparationIngredientSchema).min(1, 'Debe incluir al menos un ingrediente'),
});
