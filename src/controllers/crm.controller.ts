import { Request, Response } from 'express';
import prisma from '../prisma.js';
import whatsappService from '../services/whatsapp.service.js';

export const getStatus = async (req: Request, res: Response) => {
  try {
    const statusData = whatsappService.getStatus();
    res.json(statusData);
  } catch (error) {
    console.error('Error fetching CRM WhatsApp status:', error);
    res.status(500).json({ error: 'Error al consultar estado de WhatsApp' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const result = await whatsappService.logout();
    res.json(result);
  } catch (error) {
    console.error('Error logging out WhatsApp:', error);
    res.status(500).json({ error: 'Error al desconectar WhatsApp' });
  }
};

export const refreshQR = async (req: Request, res: Response) => {
  try {
    const statusData = await whatsappService.refreshQR();
    res.json(statusData);
  } catch (error) {
    console.error('Error refreshing WhatsApp QR:', error);
    res.status(500).json({ error: 'Error al regenerar código QR' });
  }
};

export const getConversations = async (req: Request, res: Response) => {
  try {
    const { search, unreadOnly } = req.query;

    const where: any = {
      isArchived: false,
    };

    if (unreadOnly === 'true') {
      where.unreadCount = { gt: 0 };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { contactName: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q, mode: 'insensitive' } },
        { lastMessageText: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const conversations = await prisma.chatConversation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
            orders: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                paymentStatus: true,
                deliveryStatus: true,
                deliveryDate: true,
                payments: {
                  select: {
                    amount: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
      orderBy: {
        lastMessageTimestamp: 'desc',
      },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching CRM conversations:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50', beforeId } = req.query;
    const conversationId = Number(id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'ID de conversación inválido' });
    }

    const takeCount = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where: any = { conversationId };

    if (beforeId) {
      const targetId = Number(beforeId);
      if (!isNaN(targetId)) {
        const pivotMsg = await prisma.chatMessage.findUnique({
          where: { id: targetId },
          select: { timestamp: true },
        });
        if (pivotMsg) {
          where.timestamp = { lt: pivotMsg.timestamp };
        }
      }
    }

    // Consulta indexada optimizada: toma los mensajes más recientes ordenados descendentemente
    const rawMessages = await prisma.chatMessage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: takeCount,
    });

    // Invertir para retornar en orden cronológico ascendente (de más antiguo a más nuevo)
    const messages = rawMessages.reverse();

    // Si es la carga inicial (sin beforeId), marcar conversación como leída
    if (!beforeId) {
      whatsappService.markConversationAsRead(conversationId).catch(() => {});
    }

    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Error al obtener mensajes de la conversación' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { remoteJid, to, text, contactName, customerId } = req.body;
    const recipient = remoteJid || to;

    if (!recipient || !text || !text.trim()) {
      return res.status(400).json({ error: 'Se requiere número o destinatario y mensaje de texto' });
    }

    const result = await whatsappService.sendMessage(
      recipient,
      text,
      contactName,
      customerId ? Number(customerId) : undefined
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ error: error.message || 'Error al enviar mensaje de WhatsApp' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await whatsappService.markConversationAsRead(Number(id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Error al marcar como leído' });
  }
};

export const linkCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversationId = Number(id);
    const { customerId } = req.body;
    const targetCustId = customerId ? Number(customerId) : null;

    if (!targetCustId) {
      const updated = await prisma.chatConversation.update({
        where: { id: conversationId },
        data: { customerId: null },
        include: { customer: true },
      });
      return res.json(updated);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: targetCustId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Si ya existía otra conversación para este cliente, fusionar los mensajes
    const existingOtherConv = await prisma.chatConversation.findFirst({
      where: {
        customerId: targetCustId,
        id: { not: conversationId },
      },
    });

    if (existingOtherConv) {
      await prisma.chatMessage.updateMany({
        where: { conversationId: existingOtherConv.id },
        data: { conversationId },
      });
      await prisma.chatConversation.delete({
        where: { id: existingOtherConv.id },
      });
    }

    const conversation = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        customerId: targetCustId,
        contactName: customer.fullName,
        phoneNumber: customer.phone ? customer.phone.replace(/\D/g, '') : undefined,
      },
      include: {
        customer: true,
      },
    });

    res.json(conversation);
  } catch (error) {
    console.error('Error linking customer to conversation:', error);
    res.status(500).json({ error: 'Error al vincular cliente con la conversación' });
  }
};
