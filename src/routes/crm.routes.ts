import { Router } from 'express';
import {
  getStatus,
  logout,
  getConversations,
  getConversationMessages,
  sendMessage,
  markAsRead,
  linkCustomer,
} from '../controllers/crm.controller.js';

const router = Router();

router.get('/status', getStatus);
router.post('/logout', logout);
router.get('/conversations', getConversations);
router.get('/conversations/:id/messages', getConversationMessages);
router.post('/conversations/:id/read', markAsRead);
router.post('/conversations/:id/link-customer', linkCustomer);
router.post('/send', sendMessage);

export default router;
