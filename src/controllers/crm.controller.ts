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
                pendingAmount: true,
                deliveryStatus: true,
                paymentStatus: true,
                orderDate: true,
              },
              orderBy: { orderDate: 'desc' },
              take: 3,
            },
          },
        },
      },
      orderBy: { lastMessageTimestamp: 'desc' },
    });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
};

export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const conversationId = Number(id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'ID de conversación inválido' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: 150,
    });

    // Marcar como leídos automáticamente al abrir
    await whatsappService.markConversationAsRead(conversationId);

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
    const { customerId } = req.body;

    const conversation = await prisma.chatConversation.update({
      where: { id: Number(id) },
      data: {
        customerId: customerId ? Number(customerId) : null,
      },
      include: {
        customer: true,
      },
    });

    res.json(conversation);
  } catch (error) {
    console.error('Error linking customer to conversation:', error);
    res.status(500).json({ error: 'Error al vincular cliente' });
  }
};
