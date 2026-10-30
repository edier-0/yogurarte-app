import { z } from 'zod';

const toNullableNumber = (val: unknown) => {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export const createPresentationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El identificador de la presentación es requerido')
    .max(30, 'El identificador no puede exceder 30 caracteres')
    .transform((val) => val.replace(/\s+/g, '')),
  label: z
    .string()
    .trim()
    .min(1, 'La etiqueta de la presentación es requerida')
    .max(60, 'La etiqueta no puede exceder 60 caracteres')
    .transform((val) => val.replace(/\s+/g, ' ')),
  capacityLiters: z.coerce
    .number()
    .positive('La capacidad en litros debe ser un valor mayor a cero'),
  defaultPrice: z.coerce
    .number()
    .min(0, 'El precio predeterminado no puede ser negativo'),
  rawMaterialId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  isActive: z.boolean().optional().default(true),
});

export const updatePresentationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El identificador no puede estar vacío')
    .max(30, 'El identificador no puede exceder 30 caracteres')
    .transform((val) => val.replace(/\s+/g, ''))
    .optional(),
  label: z
    .string()
    .trim()
    .min(1, 'La etiqueta no puede estar vacía')
    .max(60, 'La etiqueta no puede exceder 60 caracteres')
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  capacityLiters: z.coerce
    .number()
    .positive('La capacidad en litros debe ser un valor mayor a cero')
    .optional(),
  defaultPrice: z.coerce
    .number()
    .min(0, 'El precio predeterminado no puede ser negativo')
    .optional(),
  rawMaterialId: z.preprocess(toNullableNumber, z.number().int().positive().nullable().optional()),
  isActive: z.boolean().optional(),
});

export const presentationsQuerySchema = z.object({
  activeOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const presentationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de presentación inválido'),
});

export type CreatePresentationInput = z.infer<typeof createPresentationSchema>;
export type UpdatePresentationInput = z.infer<typeof updatePresentationSchema>;
export type PresentationsQueryInput = z.infer<typeof presentationsQuerySchema>;
