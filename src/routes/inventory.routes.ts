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
  getPurchasesHistory,
} from '../controllers/inventory.controller.js';

const router = Router();

router.get('/materials', getMaterials);
router.post('/materials', createMaterial);
router.put('/materials/:id', updateMaterial);
router.delete('/materials/:id', deleteMaterial);
router.put('/materials/:id/adjust', adjustStock);
router.get('/purchases', getPurchasesHistory);
router.post('/purchases', createPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

export default router;
