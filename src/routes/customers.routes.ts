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
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createOrUpdateCustomerSchema,
  updateCustomerSchema,
  applyCustomerPaymentSchema,
} from '../schemas/customers.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getCustomers);
router.get('/:id/whatsapp', validateParams(idParamSchema), getCustomerWhatsAppLink);
router.get('/:id', validateParams(idParamSchema), getCustomerById);
router.post('/', validateBody(createOrUpdateCustomerSchema), createOrUpdateCustomer);
router.post('/:id/payment', validateParams(idParamSchema), validateBody(applyCustomerPaymentSchema), applyCustomerPayment);
router.put('/:id', validateParams(idParamSchema), validateBody(updateCustomerSchema), updateCustomer);
router.delete('/:id', validateParams(idParamSchema), deleteCustomer);

export default router;
