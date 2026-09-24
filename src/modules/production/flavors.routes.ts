import { Router } from 'express';
import {
  getFlavors,
  getFlavorById,
  createFlavor,
  toggleFlavor,
  deleteFlavor,
} from './flavors.controller.js';
import { validateBody, validateParams, validateQuery } from '../../shared/middlewares/validate.middleware.js';
import { requireRole } from '../../shared/middlewares/auth.middleware.js';
import {
  createFlavorSchema,
  flavorsQuerySchema,
  flavorIdParamSchema,
} from './flavors.schema.js';

const router = Router();

// GET /api/production/flavors (Permitido para todos los roles autenticados)
router.get('/', validateQuery(flavorsQuerySchema), getFlavors);

// GET /api/production/flavors/:id
router.get('/:id', validateParams(flavorIdParamSchema), getFlavorById);

// POST /api/production/flavors (Exclusivo ADMIN y PRODUCCION)
router.post(
  '/',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateBody(createFlavorSchema),
  createFlavor
);

// PATCH /api/production/flavors/:id/toggle (Exclusivo ADMIN y PRODUCCION)
router.patch(
  '/:id/toggle',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateParams(flavorIdParamSchema),
  toggleFlavor
);

// DELETE /api/production/flavors/:id (Exclusivo ADMIN y PRODUCCION)
router.delete(
  '/:id',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateParams(flavorIdParamSchema),
  deleteFlavor
);

export default router;
