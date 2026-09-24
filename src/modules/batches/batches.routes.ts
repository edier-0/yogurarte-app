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
  createBatchPackaging,
  unlinkOrderFromBatch,
  getBatchSummary,
  recordPartnerWithdrawal,
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
  batchPackagingSchema,
  partnerWithdrawalSchema,
} from './batches.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

router.get('/', validateQuery(batchesQuerySchema), getBatches);
router.get('/pending-orders', validateQuery(pendingOrdersQuerySchema), getPendingOrdersByFlavor);
router.get('/:id/summary', validateParams(idParamSchema), getBatchSummary);
router.get('/:id', validateParams(idParamSchema), getBatchById);
router.post('/', validateBody(createBatchSchema), createBatch);
router.post('/:id/packaging', validateParams(idParamSchema), validateBody(batchPackagingSchema), createBatchPackaging);
router.post('/:id/partner-withdrawal', validateParams(idParamSchema), validateBody(partnerWithdrawalSchema), recordPartnerWithdrawal);
router.delete('/:id/orders/:orderId', unlinkOrderFromBatch);
router.post('/:id/link-orders', validateParams(idParamSchema), validateBody(linkOrdersToBatchSchema), linkOrdersToBatch);
router.post('/:id/discharges', validateParams(idParamSchema), validateBody(createBatchDischargeSchema), createBatchDischarge);
router.delete('/discharges/:dischargeId', deleteBatchDischarge);
router.put('/:id', validateParams(idParamSchema), validateBody(updateBatchSchema), updateBatch);
router.put('/:id/deactivate', validateParams(idParamSchema), validateBody(deactivateBatchSchema), deactivateBatch);

export default router;
