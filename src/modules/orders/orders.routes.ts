import { Router } from 'express';
import * as ordersController from './orders.controller.js';
import { validateBody, validateParams } from '../../shared/middlewares/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderSchema,
  assignDriverSchema,
  updateDeliveryStatusSchema,
  addOrderPaymentSchema,
  updateOrderPaymentSchema,
} from './orders.schema.js';
import { idParamSchema, orderPaymentParamsSchema } from '../../schemas/common.schema.js';

const router = Router();

router.get('/', ordersController.getOrders);
router.get('/:id', validateParams(idParamSchema), ordersController.getOrderById);
router.get('/:id/whatsapp', validateParams(idParamSchema), ordersController.getWhatsAppLink);
router.post('/reschedule-overdue', ordersController.rescheduleOverdueOrders);
router.post('/', validateBody(createOrderSchema), ordersController.createOrder);
router.post('/:id/payments', validateParams(idParamSchema), validateBody(addOrderPaymentSchema), ordersController.addOrderPayment);
router.put('/:id/payments/:paymentId', validateParams(orderPaymentParamsSchema), validateBody(updateOrderPaymentSchema), ordersController.updateOrderPayment);
router.delete('/:id/payments/:paymentId', validateParams(orderPaymentParamsSchema), ordersController.deleteOrderPayment);
router.put('/:id', validateParams(idParamSchema), validateBody(updateOrderSchema), ordersController.updateOrder);
router.put('/:id/assign-driver', validateParams(idParamSchema), validateBody(assignDriverSchema), ordersController.assignDriver);
router.put('/:id/delivery-status', validateParams(idParamSchema), validateBody(updateDeliveryStatusSchema), ordersController.updateDeliveryStatus);
router.delete('/:id', validateParams(idParamSchema), ordersController.deleteOrder);

export default router;
