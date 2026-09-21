/**
 * Re-exportación para compatibilidad durante la migración arquitectónica (ADR-001)
 */
export {
  extraItemSchema,
  createBatchSchema,
  updateBatchSchema,
  linkOrdersToBatchSchema,
  deactivateBatchSchema,
  createBatchDischargeSchema,
  batchesQuerySchema,
  pendingOrdersQuerySchema,
  type ExtraItemInput,
  type CreateBatchInput,
  type UpdateBatchInput,
  type LinkOrdersToBatchInput,
  type DeactivateBatchInput,
  type CreateBatchDischargeInput,
  type BatchesQueryInput,
  type PendingOrdersQueryInput,
} from '../modules/batches/batches.schema.js';
