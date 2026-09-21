import { Router } from 'express';
import * as customersController from './customers.controller.js';
import { validateBody, validateParams } from '../../shared/middlewares/validate.middleware.js';
import {
  createOrUpdateCustomerSchema,
  updateCustomerSchema,
  applyCustomerPaymentSchema,
  resolveCustomerSchema,
} from './customers.schema.js';
import { idParamSchema } from '../../schemas/common.schema.js';

const router = Router();

router.get('/', customersController.getCustomers);
router.get('/:id/whatsapp', validateParams(idParamSchema), customersController.getCustomerWhatsAppLink);
router.get('/:id', validateParams(idParamSchema), customersController.getCustomerById);
router.post('/', validateBody(createOrUpdateCustomerSchema), customersController.createOrUpdateCustomer);
router.post('/resolve', validateBody(resolveCustomerSchema), customersController.resolveCustomer);
router.post('/:id/payment', validateParams(idParamSchema), validateBody(applyCustomerPaymentSchema), customersController.applyCustomerPayment);
router.put('/:id', validateParams(idParamSchema), validateBody(updateCustomerSchema), customersController.updateCustomer);
router.delete('/:id', validateParams(idParamSchema), customersController.deleteCustomer);

export default router;
