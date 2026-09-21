import { Router } from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deactivateBatch,
  getPendingOrdersByFlavor,
  linkOrdersToBatch,
  createBatchDischarge,
  deleteBatchDischarge,
} from './batches.controller.js';
import { validateBody, validateParams, validateQuery } from '../../shared/middlewares/validate.middleware.js';
import {
  createBatchSchema,
  updateBatchSchema,
  linkOrdersToBatchSchema,
  deactivateBatchSchema,
  createBatchDischargeSchema,
  batchesQuerySchema,
  pendingOrdersQuerySchema,
} from './batches.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

router.get('/', validateQuery(batchesQuerySchema), getBatches);
router.get('/pending-orders', validateQuery(pendingOrdersQuerySchema), getPendingOrdersByFlavor);
router.get('/:id', validateParams(idParamSchema), getBatchById);
router.post('/', validateBody(createBatchSchema), createBatch);
router.post('/:id/link-orders', validateParams(idParamSchema), validateBody(linkOrdersToBatchSchema), linkOrdersToBatch);
router.post('/:id/discharges', validateParams(idParamSchema), validateBody(createBatchDischargeSchema), createBatchDischarge);
router.delete('/discharges/:dischargeId', deleteBatchDischarge);
router.put('/:id', validateParams(idParamSchema), validateBody(updateBatchSchema), updateBatch);
router.put('/:id/deactivate', validateParams(idParamSchema), validateBody(deactivateBatchSchema), deactivateBatch);

export default router;
