import { Request, Response, NextFunction } from 'express';
import * as crmService from './crm.service.js';

// ==========================================
// 1. ESTADO Y GESTIÓN DE SESIÓN WHATSAPP
// ==========================================

export const getStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusData = await crmService.getStatus();
    res.json(statusData);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.logout();
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const refreshQR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusData = await crmService.refreshQR();
    res.json(statusData);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CONVERSACIONES Y MENSAJERÍA
// ==========================================

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await crmService.getConversations(req.query as any);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await crmService.getConversationMessages(
      Number(req.params.id),
      req.query as any
    );
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.sendMessage(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.markAsRead(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateConversationTag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await crmService.updateConversationTag(Number(req.params.id), req.body.tag);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const linkCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await crmService.linkCustomer(Number(req.params.id), req.body.customerId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. PROGRAMA DE FIDELIZACIÓN "10 + 1 GRATIS"
// ==========================================

export const getLoyaltyOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.getLoyaltyOverview(req.query as any);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const redeemLoyaltyReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.redeemLoyaltyReward(req.body.customerId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. COMPRAS FRECUENTES Y RECORDATORIOS
// ==========================================

export const getRecurringSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedules = await crmService.getRecurringSchedules(req.query as any);
    res.json(schedules);
  } catch (error) {
    next(error);
  }
};

export const createRecurringSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await crmService.createRecurringSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

export const updateRecurringSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await crmService.updateRecurringSchedule(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteRecurringSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.deleteRecurringSchedule(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const triggerRecurringOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registeredByName = (req as any).user?.name;
    const result = await crmService.triggerRecurringOrder(Number(req.params.id), registeredByName);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. PLANTILLAS Y RESPUESTAS RÁPIDAS
// ==========================================

export const getQuickReplies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const replies = await crmService.getQuickReplies();
    res.json(replies);
  } catch (error) {
    next(error);
  }
};

export const createQuickReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reply = await crmService.createQuickReply(req.body);
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
};

export const updateQuickReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await crmService.updateQuickReply(Number(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteQuickReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await crmService.deleteQuickReply(Number(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};
