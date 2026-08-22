import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createPurchase,
  updatePurchase,
  deletePurchase,
  adjustStock,
  getAdjustmentsHistory,
  deleteAdjustment,
  getPurchasesHistory,
} from '../controllers/inventory.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createMaterialSchema,
  updateMaterialSchema,
  adjustStockSchema,
  createPurchaseSchema,
  updatePurchaseSchema,
} from '../schemas/inventory.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/materials', getMaterials);
router.post('/materials', validateBody(createMaterialSchema), createMaterial);
router.put('/materials/:id', validateParams(idParamSchema), validateBody(updateMaterialSchema), updateMaterial);
router.delete('/materials/:id', validateParams(idParamSchema), deleteMaterial);
router.put('/materials/:id/adjust', validateParams(idParamSchema), validateBody(adjustStockSchema), adjustStock);

router.get('/adjustments', getAdjustmentsHistory);
router.post('/adjustments', validateBody(adjustStockSchema), adjustStock);
router.delete('/adjustments/:id', validateParams(idParamSchema), deleteAdjustment);

router.get('/purchases', getPurchasesHistory);
router.post('/purchases', validateBody(createPurchaseSchema), createPurchase);
router.put('/purchases/:id', validateParams(idParamSchema), validateBody(updatePurchaseSchema), updatePurchase);
router.delete('/purchases/:id', validateParams(idParamSchema), deletePurchase);

export default router;
