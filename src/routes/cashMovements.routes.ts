import { Router } from 'express';
import {
  getCashMovements,
  createCashMovement,
  updateCashMovement,
  deleteCashMovement,
} from '../controllers/cashMovements.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createCashMovementSchema,
  updateCashMovementSchema,
} from '../schemas/cashMovements.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getCashMovements);
router.post('/', validateBody(createCashMovementSchema), createCashMovement);
router.put('/:id', validateParams(idParamSchema), validateBody(updateCashMovementSchema), updateCashMovement);
router.delete('/:id', validateParams(idParamSchema), deleteCashMovement);

export default router;
