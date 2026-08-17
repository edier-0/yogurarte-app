import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerWhatsAppLink,
  createOrUpdateCustomer,
  updateCustomer,
  deleteCustomer,
  applyCustomerPayment,
} from '../controllers/customers.controller.js';

const router = Router();

router.get('/', getCustomers);
router.get('/:id/whatsapp', getCustomerWhatsAppLink);
router.get('/:id', getCustomerById);
router.post('/', createOrUpdateCustomer);
router.post('/:id/payment', applyCustomerPayment);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;

