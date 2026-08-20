import { Router } from 'express';
import {
  getCashMovements,
  createCashMovement,
  updateCashMovement,
  deleteCashMovement,
} from '../controllers/cashMovements.controller.js';

const router = Router();

router.get('/', getCashMovements);
router.post('/', createCashMovement);
router.put('/:id', updateCashMovement);
router.delete('/:id', deleteCashMovement);

export default router;
