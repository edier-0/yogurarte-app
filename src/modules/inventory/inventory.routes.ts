import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  prepareMaterial,
  createPurchase,
  updatePurchase,
  deletePurchase,
  adjustStock,
  getAdjustmentsHistory,
  getInventoryMovements,
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
  prepareCompoundSchema,
  materialsQuerySchema,
  adjustStockSchema,
  adjustmentsQuerySchema,
  inventoryMovementsQuerySchema,
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
router.post('/materials/:id/prepare', validateParams(idParamSchema), validateBody(prepareCompoundSchema), prepareMaterial);
router.put('/materials/:id/adjust', validateParams(idParamSchema), validateBody(adjustStockSchema), adjustStock);

// ==========================================
// 2. AJUSTES DE INVENTARIO Y KARDEX
// ==========================================
router.get('/movements', validateQuery(inventoryMovementsQuerySchema), getInventoryMovements);
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
