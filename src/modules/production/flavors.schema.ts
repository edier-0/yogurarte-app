import { z } from 'zod';

export const createFlavorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre del sabor es requerido')
    .max(60, 'El nombre del sabor no puede exceder 60 caracteres')
    .transform((val) => val.replace(/\s+/g, ' ')),
});

export const updateFlavorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre del sabor no puede estar vacío')
    .max(60, 'El nombre del sabor no puede exceder 60 caracteres')
    .transform((val) => val.replace(/\s+/g, ' '))
    .optional(),
  isActive: z.boolean().optional(),
});

export const flavorsQuerySchema = z.object({
  activeOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export const flavorIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID de sabor inválido'),
});

export type CreateFlavorInput = z.infer<typeof createFlavorSchema>;
export type UpdateFlavorInput = z.infer<typeof updateFlavorSchema>;
export type FlavorsQueryInput = z.infer<typeof flavorsQuerySchema>;
