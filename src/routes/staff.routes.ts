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

const router = Router();

// Rutas de Integrantes / Socios / Colaboradores
router.get('/', getStaff);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

// Rutas de Pagos de Nómina, Retiros de Socios y Anticipos
router.get('/payments/list', getStaffPayments);
router.post('/payments', createStaffPayment);
router.delete('/payments/:id', deleteStaffPayment);
router.get('/payments/:id/whatsapp', getStaffPaymentWhatsAppLink);

export default router;
