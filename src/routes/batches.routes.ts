import { Router } from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deactivateBatch,
  getPendingOrdersByFlavor,
  linkOrdersToBatch,
} from '../controllers/batches.controller.js';

const router = Router();

router.get('/', getBatches);
router.get('/pending-orders', getPendingOrdersByFlavor);
router.get('/:id', getBatchById);
router.post('/', createBatch);
router.post('/:id/link-orders', linkOrdersToBatch);
router.put('/:id', updateBatch);
router.put('/:id/deactivate', deactivateBatch);

export default router;
