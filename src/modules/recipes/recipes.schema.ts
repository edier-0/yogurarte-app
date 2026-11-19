import { z } from 'zod';

export const RECIPE_CATEGORIES = ['ELABORACION', 'FASE_A', 'FASE_B'] as const;
export const RECIPE_STATUSES = ['ACTIVA', 'ARCHIVADA'] as const;

export const recipeIngredientInputSchema = z.object({
  rawMaterialId: z.number().int().positive({ message: 'El insumo es requerido' }),
  quantity: z.number().positive({ message: 'La cantidad debe ser mayor a 0' }),
  unit: z.string().min(1, { message: 'La unidad de medida es requerida' }),
  notes: z.string().max(255).optional().nullable(),
});

export const recipeStepInputSchema = z.object({
  stepNumber: z.number().int().positive({ message: 'El número de paso debe ser un entero positivo' }),
  title: z.string().min(2, { message: 'El título del paso debe tener al menos 2 caracteres' }).max(100),
  description: z.string().min(5, { message: 'La instrucción debe tener al menos 5 caracteres' }).max(1000),
  estimatedMinutes: z.number().int().nonnegative().optional().nullable(),
  temperatureMin: z.number().optional().nullable(),
  temperatureMax: z.number().optional().nullable(),
  temperatureTarget: z.number().optional().nullable(),
  qualityCheck: z.string().max(300).optional().nullable(),
});

export const createRecipeSchema = z
  .object({
    name: z.string().min(3, { message: 'El nombre de la receta debe tener al menos 3 caracteres' }).max(120),
    code: z
      .string()
      .min(3, { message: 'El código identificador debe tener al menos 3 caracteres' })
      .max(40)
      .transform((c) => c.toUpperCase().trim()),
    category: z.enum(RECIPE_CATEGORIES, {
      message: 'Categoría inválida. Debe ser ELABORACION, FASE_A o FASE_B',
    }),
    flavor: z.string().max(60).optional().nullable(),
    outputMaterialId: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    baseYield: z.number().positive({ message: 'El rendimiento base debe ser mayor a 0' }),
    yieldUnit: z.string().min(1, { message: 'La unidad de medida es requerida' }).default('Litros'),
    baseLiters: z.number().nonnegative().optional().nullable().default(0),
    status: z.enum(RECIPE_STATUSES).default('ACTIVA'),
    ingredients: z.array(recipeIngredientInputSchema).default([]),
    steps: z.array(recipeStepInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // 1. Reglas para ELABORACION
    if (data.category === 'ELABORACION') {
      if (!data.outputMaterialId || data.outputMaterialId <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['outputMaterialId'],
          message: 'Las recetas de elaboración requieren asociar el insumo compuesto de salida (outputMaterialId)',
        });
      }
      if (!data.ingredients || data.ingredients.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ingredients'],
          message: 'Una receta de elaboración debe tener al menos una materia prima o ingrediente',
        });
      }
    }

    // 2. Reglas para FASE_A
    if (data.category === 'FASE_A') {
      if (!data.ingredients || data.ingredients.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ingredients'],
          message: 'Una receta de Fase A debe declarar al menos un insumo (ej. leche cruda, cultivo)',
        });
      }
    }

    // 3. Reglas para FASE_B
    if (data.category === 'FASE_B') {
      if (!data.flavor || data.flavor.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['flavor'],
          message: 'El sabor asociado es obligatorio para recetas de Fase B',
        });
      }
      if (!data.baseLiters || data.baseLiters <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baseLiters'],
          message: 'Las recetas de Fase B exigen declarar los litros de base láctea (baseLiters > 0)',
        });
      }
      // Validación de coherencia física (expansión volumétrica del Art. 5.6)
      if (data.baseLiters && data.baseYield < data.baseLiters) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baseYield'],
          message: 'El rendimiento final del yogur no puede ser menor a los litros de base láctea extraídos',
        });
      }
    }
  });

export const updateRecipeSchema = z
  .object({
    name: z.string().min(3).max(120).optional(),
    code: z
      .string()
      .min(3)
      .max(40)
      .transform((c) => c.toUpperCase().trim())
      .optional(),
    category: z.enum(RECIPE_CATEGORIES).optional(),
    flavor: z.string().max(60).optional().nullable(),
    outputMaterialId: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    baseYield: z.number().positive().optional(),
    yieldUnit: z.string().min(1).optional(),
    baseLiters: z.number().nonnegative().optional().nullable(),
    status: z.enum(RECIPE_STATUSES).optional(),
    ingredients: z.array(recipeIngredientInputSchema).optional(),
    steps: z.array(recipeStepInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.baseLiters !== undefined && data.baseYield !== undefined) {
      if (data.baseLiters !== null && data.baseYield < data.baseLiters) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baseYield'],
          message: 'El rendimiento final del yogur no puede ser menor a los litros de base láctea extraídos',
        });
      }
    }
  });

export const recipeQuerySchema = z.object({
  category: z.enum(RECIPE_CATEGORIES).optional(),
  status: z.enum(RECIPE_STATUSES).optional(),
  flavor: z.string().optional(),
  search: z.string().optional(),
});

export const simulatePresentationSchema = z.object({
  presentationId: z.coerce.number().int().positive({ message: 'El ID de la presentación debe ser un entero positivo' }),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type RecipeQueryInput = z.infer<typeof recipeQuerySchema>;
export type SimulatePresentationInput = z.infer<typeof simulatePresentationSchema>;
