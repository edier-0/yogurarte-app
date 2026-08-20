import { Router } from 'express';
import {
  getCredits,
  createCredit,
  payCreditInstallment,
  skipCreditInstallment,
  deleteCredit,
} from '../controllers/credits.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createCreditSchema,
  payCreditInstallmentSchema,
  skipCreditInstallmentSchema,
} from '../schemas/credits.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getCredits);
router.post('/', validateBody(createCreditSchema), createCredit);
router.post('/:id/pay', validateParams(idParamSchema), validateBody(payCreditInstallmentSchema), payCreditInstallment);
router.post('/:id/skip', validateParams(idParamSchema), validateBody(skipCreditInstallmentSchema), skipCreditInstallment);
router.delete('/:id', validateParams(idParamSchema), deleteCredit);

export default router;
