import { Router } from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deactivateBatch,
} from '../controllers/batches.controller.js';

const router = Router();

router.get('/', getBatches);
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.put('/:id/deactivate', deactivateBatch);

export default router;
