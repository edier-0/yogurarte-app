import { Router } from 'express';
import {
  getCredits,
  createCredit,
  payCreditInstallment,
  skipCreditInstallment,
  deleteCredit,
} from '../controllers/credits.controller.js';

const router = Router();

router.get('/', getCredits);
router.post('/', createCredit);
router.post('/:id/pay', payCreditInstallment);
router.post('/:id/skip', skipCreditInstallment);
router.delete('/:id', deleteCredit);

export default router;
