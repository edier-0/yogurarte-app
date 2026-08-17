import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createOrUpdateCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customers.controller.js';

const router = Router();

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createOrUpdateCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
