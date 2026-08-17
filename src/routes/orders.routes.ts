import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  getWhatsAppLink,
} from '../controllers/orders.controller.js';

const router = Router();

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.get('/:id/whatsapp', getWhatsAppLink);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
