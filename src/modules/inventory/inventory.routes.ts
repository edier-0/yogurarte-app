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
} from './inventory.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middlewares/validate.middleware.js';
import {
  createMaterialSchema,
  updateMaterialSchema,
  materialsQuerySchema,
  adjustStockSchema,
  adjustmentsQuerySchema,
  createPurchaseSchema,
  updatePurchaseSchema,
  purchasesQuerySchema,
} from './inventory.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

// ==========================================
// 1. INSUMOS Y MATERIAS PRIMAS
// ==========================================
router.get('/materials', validateQuery(materialsQuerySchema), getMaterials);
router.post('/materials', validateBody(createMaterialSchema), createMaterial);
router.put('/materials/:id', validateParams(idParamSchema), validateBody(updateMaterialSchema), updateMaterial);
router.delete('/materials/:id', validateParams(idParamSchema), deleteMaterial);
router.put('/materials/:id/adjust', validateParams(idParamSchema), validateBody(adjustStockSchema), adjustStock);

// ==========================================
// 2. AJUSTES DE INVENTARIO (KARDEX)
// ==========================================
router.get('/adjustments', validateQuery(adjustmentsQuerySchema), getAdjustmentsHistory);
router.post('/adjustments', validateBody(adjustStockSchema), adjustStock);
router.delete('/adjustments/:id', validateParams(idParamSchema), deleteAdjustment);

// ==========================================
// 3. COMPRAS DE INSUMOS
// ==========================================
router.get('/purchases', validateQuery(purchasesQuerySchema), getPurchasesHistory);
router.post('/purchases', validateBody(createPurchaseSchema), createPurchase);
router.put('/purchases/:id', validateParams(idParamSchema), validateBody(updatePurchaseSchema), updatePurchase);
router.delete('/purchases/:id', validateParams(idParamSchema), deletePurchase);

export default router;
