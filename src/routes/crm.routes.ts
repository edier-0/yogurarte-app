import { Router } from 'express';
import {
  getStatus,
  logout,
  refreshQR,
  getConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  updateConversationTag,
  linkCustomer,
  getLoyaltyOverview,
  redeemLoyaltyReward,
  getRecurringSchedules,
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  triggerRecurringOrder,
  getQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
} from '../controllers/crm.controller.js';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { requireRole } from '../middlewares/auth.middleware.js';
import { crmSendLimiter } from '../middlewares/rateLimiter.middleware.js';
import { idParamSchema } from '../schemas/common.schema.js';
import {
  sendCrmMessageSchema,
  linkCustomerSchema,
  updateConversationTagSchema,
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
  createQuickReplySchema,
  updateQuickReplySchema,
} from '../schemas/crm.schema.js';

const router = Router();

// 🔒 Restricción de acceso general para el módulo CRM: ADMIN y VENTAS
router.use(requireRole(['ADMIN', 'VENTAS']));

// Estado y Gestión de Sesión WhatsApp
router.get('/status', getStatus);
router.post('/logout', logout);
router.post('/refresh-qr', refreshQR);

// Conversaciones y Mensajería
router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', validateParams(idParamSchema), getConversationMessages);
router.post('/conversations/:id/read', validateParams(idParamSchema), markAsRead);
router.put('/conversations/:id/tag', validateParams(idParamSchema), validateBody(updateConversationTagSchema), updateConversationTag);
router.post('/conversations/:id/link-customer', validateParams(idParamSchema), validateBody(linkCustomerSchema), linkCustomer);
router.post('/send', crmSendLimiter, validateBody(sendCrmMessageSchema), sendMessage);

// 🎁 Programa de Fidelización (10+1)
router.get('/loyalty', getLoyaltyOverview);
router.post('/loyalty/redeem', redeemLoyaltyReward);

// 🔁 Compras Frecuentes y Recordatorios
router.get('/recurring', getRecurringSchedules);
router.post('/recurring', validateBody(createRecurringScheduleSchema), createRecurringSchedule);
router.put('/recurring/:id', validateParams(idParamSchema), validateBody(updateRecurringScheduleSchema), updateRecurringSchedule);
router.delete('/recurring/:id', validateParams(idParamSchema), deleteRecurringSchedule);
router.post('/recurring/:id/create-order', validateParams(idParamSchema), triggerRecurringOrder);

// ⚡ Respuestas Rápidas (Plantillas)
router.get('/quick-replies', getQuickReplies);
router.post('/quick-replies', validateBody(createQuickReplySchema), createQuickReply);
router.put('/quick-replies/:id', validateParams(idParamSchema), validateBody(updateQuickReplySchema), updateQuickReply);
router.delete('/quick-replies/:id', validateParams(idParamSchema), deleteQuickReply);

export default router;

