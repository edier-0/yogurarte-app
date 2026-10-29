import { Router } from 'express';
import {
  getPreparations,
  getPreparationById,
  createPreparation,
  updatePreparation,
  deletePreparation,
} from './preparations.controller.js';
import { validateBody, validateParams } from '../../shared/middlewares/validate.middleware.js';
import { createPreparationSchema, updatePreparationSchema } from './preparations.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

router.get('/', getPreparations);
router.get('/:id', validateParams(idParamSchema), getPreparationById);
router.post('/', validateBody(createPreparationSchema), createPreparation);
router.put('/:id', validateParams(idParamSchema), validateBody(updatePreparationSchema), updatePreparation);
router.delete('/:id', validateParams(idParamSchema), deletePreparation);

export default router;
export { router as preparationsRouter };
