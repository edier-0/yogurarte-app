import { Router } from 'express';
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffPayments,
  createStaffPayment,
  deleteStaffPayment,
  getStaffPaymentWhatsAppLink,
} from '../controllers/staff.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createStaffSchema,
  updateStaffSchema,
  createStaffPaymentSchema,
} from '../schemas/staff.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

// Rutas de Integrantes / Socios / Colaboradores
router.get('/', getStaff);
router.get('/:id', validateParams(idParamSchema), getStaffById);
router.post('/', validateBody(createStaffSchema), createStaff);
router.put('/:id', validateParams(idParamSchema), validateBody(updateStaffSchema), updateStaff);
router.delete('/:id', validateParams(idParamSchema), deleteStaff);

// Rutas de Pagos de Nómina, Retiros de Socios y Anticipos
router.get('/payments/list', getStaffPayments);
router.post('/payments', validateBody(createStaffPaymentSchema), createStaffPayment);
router.delete('/payments/:id', validateParams(idParamSchema), deleteStaffPayment);
router.get('/payments/:id/whatsapp', validateParams(idParamSchema), getStaffPaymentWhatsAppLink);

export default router;
