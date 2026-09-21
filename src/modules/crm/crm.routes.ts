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
} from './crm.controller.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middlewares/validate.middleware.js';
import { requireRole } from '../../shared/middlewares/auth.middleware.js';
import { crmSendLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { idParamSchema } from '../../schemas/common.schema.js';
import {
  sendCrmMessageSchema,
  linkCustomerSchema,
  updateConversationTagSchema,
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
  createQuickReplySchema,
  updateQuickReplySchema,
  getConversationsQuerySchema,
  getMessagesQuerySchema,
  getLoyaltyQuerySchema,
  redeemLoyaltySchema,
  getRecurringQuerySchema,
} from './crm.schema.js';

const router = Router();

// 🔒 Restricción de acceso general para el módulo CRM: ADMIN y VENTAS
router.use(requireRole(['ADMIN', 'VENTAS']));

// ==========================================
// 1. ESTADO Y GESTIÓN DE SESIÓN WHATSAPP
// ==========================================
router.get('/status', getStatus);
router.post('/logout', logout);
router.post('/refresh-qr', refreshQR);

// ==========================================
// 2. CONVERSACIONES Y MENSAJERÍA
// ==========================================
router.get('/conversations', validateQuery(getConversationsQuerySchema), getConversations);
router.get(
  '/conversations/:id/messages',
  validateParams(idParamSchema),
  validateQuery(getMessagesQuerySchema),
  getConversationMessages
);
router.post('/conversations/:id/read', validateParams(idParamSchema), markAsRead);
router.put(
  '/conversations/:id/tag',
  validateParams(idParamSchema),
  validateBody(updateConversationTagSchema),
  updateConversationTag
);
router.post(
  '/conversations/:id/link-customer',
  validateParams(idParamSchema),
  validateBody(linkCustomerSchema),
  linkCustomer
);
router.post('/send', crmSendLimiter, validateBody(sendCrmMessageSchema), sendMessage);

// ==========================================
// 3. PROGRAMA DE FIDELIZACIÓN (10+1)
// ==========================================
router.get('/loyalty', validateQuery(getLoyaltyQuerySchema), getLoyaltyOverview);
router.post('/loyalty/redeem', validateBody(redeemLoyaltySchema), redeemLoyaltyReward);

// ==========================================
// 4. COMPRAS FRECUENTES Y RECORDATORIOS
// ==========================================
router.get('/recurring', validateQuery(getRecurringQuerySchema), getRecurringSchedules);
router.post('/recurring', validateBody(createRecurringScheduleSchema), createRecurringSchedule);
router.put(
  '/recurring/:id',
  validateParams(idParamSchema),
  validateBody(updateRecurringScheduleSchema),
  updateRecurringSchedule
);
router.delete('/recurring/:id', validateParams(idParamSchema), deleteRecurringSchedule);
router.post('/recurring/:id/create-order', validateParams(idParamSchema), triggerRecurringOrder);

// ==========================================
// 5. RESPUESTAS RÁPIDAS (PLANTILLAS)
// ==========================================
router.get('/quick-replies', getQuickReplies);
router.post('/quick-replies', validateBody(createQuickReplySchema), createQuickReply);
router.put(
  '/quick-replies/:id',
  validateParams(idParamSchema),
  validateBody(updateQuickReplySchema),
  updateQuickReply
);
router.delete('/quick-replies/:id', validateParams(idParamSchema), deleteQuickReply);

export default router;
export { router as crmRouter };
