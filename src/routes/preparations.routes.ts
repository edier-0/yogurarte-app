import { Router } from 'express';
import {
  getPreparations,
  getPreparationById,
  createPreparation,
  deletePreparation,
} from '../controllers/preparations.controller.js';

const router = Router();

router.get('/', getPreparations);
router.get('/:id', getPreparationById);
router.post('/', createPreparation);
router.delete('/:id', deletePreparation);

export default router;
