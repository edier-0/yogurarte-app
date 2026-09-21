import { Router } from 'express';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffPayments,
  createStaffPayment,
  updateStaffPayment,
  deleteStaffPayment,
  getStaffPaymentWhatsAppLink,
} from './staff.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middlewares/validate.middleware.js';
import {
  createStaffSchema,
  updateStaffSchema,
  staffQuerySchema,
  createStaffPaymentSchema,
  updateStaffPaymentSchema,
  staffPaymentsQuerySchema,
} from './staff.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

// ==========================================
// 1. INTEGRANTES / SOCIOS / COLABORADORES
// ==========================================
router.get('/', validateQuery(staffQuerySchema), getStaff);
router.get('/:id', validateParams(idParamSchema), getStaffById);
router.post('/', validateBody(createStaffSchema), createStaff);
router.put('/:id', validateParams(idParamSchema), validateBody(updateStaffSchema), updateStaff);
router.delete('/:id', validateParams(idParamSchema), deleteStaff);

// ==========================================
// 2. PAGOS DE NÓMINA, RETIROS Y ANTICIPOS
// ==========================================
router.get('/payments/list', validateQuery(staffPaymentsQuerySchema), getStaffPayments);
router.post('/payments', validateBody(createStaffPaymentSchema), createStaffPayment);
router.put('/payments/:id', validateParams(idParamSchema), validateBody(updateStaffPaymentSchema), updateStaffPayment);
router.delete('/payments/:id', validateParams(idParamSchema), deleteStaffPayment);
router.get('/payments/:id/whatsapp', validateParams(idParamSchema), getStaffPaymentWhatsAppLink);

export default router;
