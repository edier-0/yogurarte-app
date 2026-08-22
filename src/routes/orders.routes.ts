import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getWhatsAppLink,
  assignDriver,
  updateDeliveryStatus,
  addOrderPayment,
  updateOrderPayment,
  deleteOrderPayment,
} from '../controllers/orders.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderSchema,
  assignDriverSchema,
  updateDeliveryStatusSchema,
} from '../schemas/orders.schema.js';
import { idParamSchema } from '../schemas/common.schema.js';

const router = Router();

router.get('/', getOrders);
router.get('/:id', validateParams(idParamSchema), getOrderById);
router.get('/:id/whatsapp', validateParams(idParamSchema), getWhatsAppLink);
router.post('/', validateBody(createOrderSchema), createOrder);
router.post('/:id/payments', validateParams(idParamSchema), addOrderPayment);
router.put('/:id/payments/:paymentId', validateParams(idParamSchema), updateOrderPayment);
router.delete('/:id/payments/:paymentId', validateParams(idParamSchema), deleteOrderPayment);
router.put('/:id', validateParams(idParamSchema), validateBody(updateOrderSchema), updateOrder);
router.put('/:id/assign-driver', validateParams(idParamSchema), validateBody(assignDriverSchema), assignDriver);
router.put('/:id/delivery-status', validateParams(idParamSchema), validateBody(updateDeliveryStatusSchema), updateDeliveryStatus);
router.delete('/:id', validateParams(idParamSchema), deleteOrder);

export default router;
