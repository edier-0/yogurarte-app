import { Router } from 'express';
import { z } from 'zod';
import * as recipesController from './recipes.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middlewares/validate.middleware.js';
import { requireRole } from '../../shared/middlewares/auth.middleware.js';
import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeQuerySchema,
  simulatePresentationSchema,
} from './recipes.schema.js';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El ID de la receta debe ser un número entero positivo' }),
});

const simulateParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  presentationId: z.coerce.number().int().positive(),
});

// 1. Lectura general (ADMIN, SOCIO, PRODUCCION)
router.get('/', validateQuery(recipeQuerySchema), recipesController.getRecipes);
router.get('/:id', validateParams(idParamSchema), recipesController.getRecipeById);
router.get('/:id/simulate/:presentationId', validateParams(simulateParamsSchema), recipesController.simulatePresentation);

// 2. Modificaciones (Exclusivo ADMIN y SOCIO)
router.post('/', requireRole(['ADMIN', 'SOCIO']), validateBody(createRecipeSchema), recipesController.createRecipe);
router.put('/:id', requireRole(['ADMIN', 'SOCIO']), validateParams(idParamSchema), validateBody(updateRecipeSchema), recipesController.updateRecipe);
router.patch('/:id/archive', requireRole(['ADMIN', 'SOCIO']), validateParams(idParamSchema), recipesController.toggleArchiveRecipe);
router.delete('/:id', requireRole(['ADMIN', 'SOCIO']), validateParams(idParamSchema), recipesController.deleteRecipe);

export default router;
