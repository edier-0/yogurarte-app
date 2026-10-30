import { Router } from 'express';
import {
  getPresentations,
  getPresentationById,
  createPresentation,
  updatePresentation,
  togglePresentation,
  deletePresentation,
} from './presentations.controller.js';
import { validateBody, validateParams, validateQuery } from '../../shared/middlewares/validate.middleware.js';
import { requireRole } from '../../shared/middlewares/auth.middleware.js';
import {
  createPresentationSchema,
  updatePresentationSchema,
  presentationsQuerySchema,
  presentationIdParamSchema,
} from './presentations.schema.js';

const router = Router();

// GET /api/production/presentations (Permitido para todos los roles autenticados)
router.get('/', validateQuery(presentationsQuerySchema), getPresentations);

// GET /api/production/presentations/:id
router.get('/:id', validateParams(presentationIdParamSchema), getPresentationById);

// POST /api/production/presentations (Exclusivo ADMIN y PRODUCCION)
router.post(
  '/',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateBody(createPresentationSchema),
  createPresentation
);

// PUT /api/production/presentations/:id (Exclusivo ADMIN y PRODUCCION)
router.put(
  '/:id',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateParams(presentationIdParamSchema),
  validateBody(updatePresentationSchema),
  updatePresentation
);

// PATCH /api/production/presentations/:id/toggle (Exclusivo ADMIN y PRODUCCION)
router.patch(
  '/:id/toggle',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateParams(presentationIdParamSchema),
  togglePresentation
);

// DELETE /api/production/presentations/:id (Exclusivo ADMIN y PRODUCCION)
router.delete(
  '/:id',
  requireRole(['ADMIN', 'PRODUCCION']),
  validateParams(presentationIdParamSchema),
  deletePresentation
);

export default router;
