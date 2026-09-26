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
  getNextBatchCode,
  patchBatchStatus,
  patchBatchVolume,
  updateBatchPackaging,
  getBatchPackagings,
  getPackagingSummary,
  deleteBatchPackaging,
  recordPackagingDischarge,
  unlinkOrderFromPackaging,
  deleteBatch,
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
  nextCodeQuerySchema,
  patchBatchStatusSchema,
  patchBatchVolumeSchema,
  updateBatchPackagingSchema,
  packagingsQuerySchema,
  packagingDischargeSchema,
} from './batches.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

// ==========================================
// 📦 FASE B: LOTES ENVASADOS / FRACCIONADOS
// (Ubicadas antes de /:id para evitar colisiones)
// ==========================================
router.get('/packagings', validateQuery(packagingsQuerySchema), getBatchPackagings);
router.get('/packagings/:packagingId', getPackagingSummary);
router.put('/packagings/:packagingId', validateBody(updateBatchPackagingSchema), updateBatchPackaging);
router.delete('/packagings/:packagingId', deleteBatchPackaging);
router.post('/packagings/:packagingId/discharges', validateBody(packagingDischargeSchema), recordPackagingDischarge);
router.delete('/packagings/:packagingId/orders/:orderId', unlinkOrderFromPackaging);

// ==========================================
// 🥛 FASE A: LOTES BASE / FERMENTACIÓN
// ==========================================
router.get('/', validateQuery(batchesQuerySchema), getBatches);
router.get('/next-code', validateQuery(nextCodeQuerySchema), getNextBatchCode);
router.get('/pending-orders', validateQuery(pendingOrdersQuerySchema), getPendingOrdersByFlavor);
router.get('/:id/summary', validateParams(idParamSchema), getBatchSummary);
router.get('/:id', validateParams(idParamSchema), getBatchById);
router.post('/', validateBody(createBatchSchema), createBatch);
router.patch('/:id/status', validateParams(idParamSchema), validateBody(patchBatchStatusSchema), patchBatchStatus);
router.patch('/:id/volume', validateParams(idParamSchema), validateBody(patchBatchVolumeSchema), patchBatchVolume);
router.post('/:id/packaging', validateParams(idParamSchema), validateBody(batchPackagingSchema), createBatchPackaging);
router.post('/:id/partner-withdrawal', validateParams(idParamSchema), validateBody(partnerWithdrawalSchema), recordPartnerWithdrawal);
router.delete('/:id/orders/:orderId', unlinkOrderFromBatch);
router.post('/:id/link-orders', validateParams(idParamSchema), validateBody(linkOrdersToBatchSchema), linkOrdersToBatch);
router.post('/:id/discharges', validateParams(idParamSchema), validateBody(createBatchDischargeSchema), createBatchDischarge);
router.delete('/discharges/:dischargeId', deleteBatchDischarge);
router.put('/:id', validateParams(idParamSchema), validateBody(updateBatchSchema), updateBatch);
router.put('/:id/deactivate', validateParams(idParamSchema), validateBody(deactivateBatchSchema), deactivateBatch);
router.delete('/:id', validateParams(idParamSchema), deleteBatch);

export default router;
