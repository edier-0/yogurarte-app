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
    const { search, unreadOnly, tag } = req.query;

    const where: any = {
      isArchived: false,
    };

    if (unreadOnly === 'true') {
      where.unreadCount = { gt: 0 };
    }

    if (tag && typeof tag === 'string' && tag !== 'ALL') {
      where.tag = tag;
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
            loyaltyRedeemedCount: true,
            orders: {
              select: {
                id: true,
                orderNumber: true,
                quantityBottles: true,
                totalAmount: true,
                paidAmount: true,
                pendingAmount: true,
                paymentStatus: true,
                deliveryStatus: true,
                deliveryDate: true,
                orderDate: true,
              },
              orderBy: { orderDate: 'desc' },
              take: 10,
            },
          },
        },
      },
      orderBy: [
        { lastMessageTimestamp: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
      ],
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
    const { recipient: reqRecipient, remoteJid, to, text, contactName, customerId, mediaUrl, mediaType } = req.body;
    const recipient = reqRecipient || remoteJid || to;

    if (!recipient || (!text?.trim() && !mediaUrl)) {
      return res.status(400).json({ error: 'Se requiere destinatario y mensaje o archivo multimedia' });
    }

    const result = await whatsappService.sendMessage(
      recipient,
      text || '',
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

export const updateConversationTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const conversationId = Number(id);

    const updated = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { tag },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating conversation tag:', error);
    res.status(500).json({ error: 'Error al actualizar etiqueta de la conversación' });
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

    const cleanCustPhone = customer.phone ? customer.phone.replace(/\D/g, '') : null;
    const last10 = cleanCustPhone && cleanCustPhone.length >= 7 ? cleanCustPhone.slice(-10) : null;

    // Buscar TODAS las demás conversaciones asociadas a este cliente (por customerId o por su teléfono)
    const otherConvs = await prisma.chatConversation.findMany({
      where: {
        id: { not: conversationId },
        OR: [
          { customerId: targetCustId },
          ...(cleanCustPhone ? [{ phoneNumber: cleanCustPhone }] : []),
          ...(last10 ? [{ phoneNumber: { contains: last10 } }] : []),
          ...(last10 ? [{ remoteJid: { contains: last10 } }] : []),
        ],
      },
      include: { messages: true },
    });

    const deletedIds: number[] = [];
    for (const other of otherConvs) {
      // Reasignar mensajes a la conversación principal activa
      await prisma.chatMessage.updateMany({
        where: { conversationId: other.id },
        data: { conversationId },
      });

      // Eliminar conversación duplicada
      await prisma.chatConversation.delete({
        where: { id: other.id },
      });
      deletedIds.push(other.id);
    }

    // Obtener el último mensaje cronológico para dejar la conversación con la previsualización y hora correctas
    const lastMsg = await prisma.chatMessage.findFirst({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
    });

    const conversation = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        customerId: targetCustId,
        contactName: customer.fullName,
        phoneNumber: cleanCustPhone || undefined,
        lastMessageText: lastMsg ? lastMsg.text : undefined,
        lastMessageTimestamp: lastMsg ? lastMsg.timestamp : undefined,
        lastMessageFromMe: lastMsg ? lastMsg.fromMe : undefined,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
            loyaltyRedeemedCount: true,
            orders: {
              select: {
                id: true,
                orderNumber: true,
                quantityBottles: true,
                totalAmount: true,
                paymentStatus: true,
                deliveryStatus: true,
                deliveryDate: true,
                payments: {
                  select: { amount: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    // Notificar a todos los clientes vía Socket.IO
    if (whatsappService.io) {
      for (const delId of deletedIds) {
        whatsappService.io.emit('whatsapp:conversation_deleted', { conversationId: delId });
      }
      whatsappService.io.emit('whatsapp:conversations_merged', {
        targetId: conversationId,
        mergedIds: deletedIds,
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error linking customer to conversation:', error);
    res.status(500).json({ error: 'Error al vincular cliente con la conversación' });
  }
};

// ==========================================
// 🎁 PROGRAMA DE FIDELIZACIÓN "10 + 1 GRATIS"
// ==========================================

export const getLoyaltyOverview = async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '12' } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));

    const where: any = { isActive: true };
    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        address: true,
        loyaltyRedeemedCount: true,
        orders: {
          where: {
            deliveryStatus: { not: 'CANCELLED' },
          },
          select: {
            id: true,
            quantityBottles: true,
            totalAmount: true,
            orderDate: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const loyaltyData = customers.map((cust) => {
      const totalBottles = cust.orders.reduce((sum, o) => sum + (o.quantityBottles || 1), 0);
      const redeemed = cust.loyaltyRedeemedCount || 0;
      const netBottles = Math.max(0, totalBottles - redeemed * 10);
      const currentCycle = netBottles % 10;
      const rewardsAvailable = Math.floor(netBottles / 10);
      const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));

      return {
        id: cust.id,
        fullName: cust.fullName,
        phone: cust.phone,
        address: cust.address,
        totalOrders: cust.orders.length,
        totalBottles,
        redeemedCount: redeemed,
        currentCycleBottles: currentCycle,
        rewardsAvailable,
        progressPercent,
        hasAvailableReward: rewardsAvailable > 0,
      };
    });

    // Ordenar para mostrar primero los que tienen recompensas listas o están más cerca de 10
    loyaltyData.sort((a, b) => {
      if (a.rewardsAvailable !== b.rewardsAvailable) {
        return b.rewardsAvailable - a.rewardsAvailable;
      }
      return b.currentCycleBottles - a.currentCycleBottles;
    });

    const totalItems = loyaltyData.length;
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = loyaltyData.slice(startIndex, startIndex + limitNum);

    res.json({
      customers: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching loyalty overview:', error);
    res.status(500).json({ error: 'Error al consultar programa de fidelización' });
  }
};

export const redeemLoyaltyReward = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;
    const targetCustId = Number(customerId);

    if (!targetCustId || isNaN(targetCustId)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: targetCustId },
      include: {
        orders: {
          where: { deliveryStatus: { not: 'CANCELLED' } },
          select: { quantityBottles: true },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const totalBottles = customer.orders.reduce((sum, o) => sum + (o.quantityBottles || 1), 0);
    const redeemed = customer.loyaltyRedeemedCount || 0;
    const netBottles = Math.max(0, totalBottles - redeemed * 10);

    if (netBottles < 10) {
      return res.status(400).json({
        error: `El cliente solo tiene ${netBottles % 10} botellas acumuladas en este ciclo. Requiere 10 para canjear 1L gratis.`,
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: targetCustId },
      data: {
        loyaltyRedeemedCount: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: `¡Premio de 1L gratis canjeado exitosamente para ${customer.fullName}!`,
      loyaltyRedeemedCount: updatedCustomer.loyaltyRedeemedCount,
    });
  } catch (error) {
    console.error('Error redeeming loyalty reward:', error);
    res.status(500).json({ error: 'Error al canjear premio de fidelización' });
  }
};

// ==========================================
// 🔁 COMPRAS FRECUENTES Y RECORDATORIOS
// ==========================================

export const getRecurringSchedules = async (req: Request, res: Response) => {
  try {
    const { filter = 'ALL', search } = req.query;

    const where: any = { isActive: true };

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { customer: { fullName: { contains: search.trim(), mode: 'insensitive' } } },
        { customer: { phone: { contains: search.trim(), mode: 'insensitive' } } },
        { preferredFlavor: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in3Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59, 999);

    if (filter === 'TODAY') {
      where.nextDate = { lte: endOfToday };
    } else if (filter === 'UPCOMING') {
      where.nextDate = { gt: endOfToday, lte: in3Days };
    }

    const schedules = await prisma.recurringSchedule.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: { nextDate: 'asc' },
    });

    res.json(schedules);
  } catch (error) {
    console.error('Error fetching recurring schedules:', error);
    res.status(500).json({ error: 'Error al consultar compras frecuentes' });
  }
};

export const createRecurringSchedule = async (req: Request, res: Response) => {
  try {
    const { customerId, frequencyDays, preferredFlavor, bottleSize, quantity, nextDate, notes } = req.body;

    const customer = await prisma.customer.findUnique({
      where: { id: Number(customerId) },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const schedule = await prisma.recurringSchedule.create({
      data: {
        customerId: Number(customerId),
        frequencyDays: Number(frequencyDays) || 15,
        preferredFlavor: preferredFlavor || 'Fresa',
        bottleSize: bottleSize || '1L',
        quantity: Number(quantity) || 1,
        nextDate: new Date(nextDate),
        notes,
      },
      include: { customer: true },
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Error creating recurring schedule:', error);
    res.status(500).json({ error: 'Error al programar compra frecuente' });
  }
};

export const updateRecurringSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scheduleId = Number(id);
    const { frequencyDays, preferredFlavor, bottleSize, quantity, nextDate, notes, isActive } = req.body;

    const data: any = {};
    if (frequencyDays !== undefined) data.frequencyDays = Number(frequencyDays);
    if (preferredFlavor !== undefined) data.preferredFlavor = preferredFlavor;
    if (bottleSize !== undefined) data.bottleSize = bottleSize;
    if (quantity !== undefined) data.quantity = Number(quantity);
    if (nextDate !== undefined) data.nextDate = new Date(nextDate);
    if (notes !== undefined) data.notes = notes;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.recurringSchedule.update({
      where: { id: scheduleId },
      data,
      include: { customer: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating recurring schedule:', error);
    res.status(500).json({ error: 'Error al actualizar compra frecuente' });
  }
};

export const deleteRecurringSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.recurringSchedule.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true, message: 'Programación eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting recurring schedule:', error);
    res.status(500).json({ error: 'Error al eliminar compra frecuente' });
  }
};

export const triggerRecurringOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scheduleId = Number(id);

    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: { customer: true },
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Programación no encontrada' });
    }

    // Calcular precio estándar
    const unitPrice = schedule.bottleSize === '2L' ? 22000 : 12000;
    const litersPerUnit = schedule.bottleSize === '2L' ? 2.0 : 1.0;
    const totalLiters = schedule.quantity * litersPerUnit;
    const totalAmount = schedule.quantity * unitPrice;

    // Generar consecutivo de pedido
    const countToday = await prisma.order.count();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `PED-${todayStr}-${String(countToday + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: schedule.customerId,
        bottleSize: schedule.bottleSize,
        flavor: schedule.preferredFlavor,
        quantityBottles: schedule.quantity,
        totalLiters,
        unitPrice,
        totalAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        paymentStatus: 'PENDING',
        deliveryStatus: 'PENDING',
        deliveryAddress: schedule.customer.address,
        notes: `Generado automáticamente desde Compra Frecuente (${schedule.frequencyDays} días). ${schedule.notes || ''}`,
        registeredBy: (req as any).user?.name || 'CRM YogurArte',
        items: {
          create: [
            {
              bottleSize: schedule.bottleSize,
              flavor: schedule.preferredFlavor,
              quantity: schedule.quantity,
              litersPerUnit,
              totalLiters,
              unitPrice,
              totalPrice: totalAmount,
            },
          ],
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    // Actualizar la fecha del próximo recordatorio sumando los días de frecuencia
    const nextDate = new Date(schedule.nextDate);
    nextDate.setDate(nextDate.getDate() + schedule.frequencyDays);

    await prisma.recurringSchedule.update({
      where: { id: scheduleId },
      data: {
        lastOrderDate: new Date(),
        nextDate,
      },
    });

    res.status(201).json({
      success: true,
      message: `Pedido ${orderNumber} creado exitosamente`,
      order,
      nextScheduledDate: nextDate,
    });
  } catch (error) {
    console.error('Error triggering recurring order:', error);
    res.status(500).json({ error: 'Error al crear pedido desde compra frecuente' });
  }
};

// ==========================================
// ⚡ PLANTILLAS Y RESPUESTAS RÁPIDAS
// ==========================================

export const getQuickReplies = async (req: Request, res: Response) => {
  try {
    let replies = await prisma.crmQuickReply.findMany({
      orderBy: { id: 'asc' },
    });

    // Si la tabla está vacía, sembrar plantillas por defecto de YogurArte
    if (replies.length === 0) {
      const defaultReplies = [
        {
          shortcut: '/sabores',
          title: 'Sabores Artesanales de Hoy',
          category: 'VENTAS',
          content:
            '🥛 *Sabores Artesanales YogurArte disponibles hoy:*\n• Fresa 🍓\n• Mora 🫐\n• Melocotón 🍑\n• Guanábana 🍈\n• Arequipe 🍯\n• Natural 🍶\n\n¿Cuál te preparamos hoy?',
        },
        {
          shortcut: '/precios',
          title: 'Lista de Precios Oficiales',
          category: 'VENTAS',
          content:
            '💰 *Precios Oficiales YogurArte:*\n• Botella 1 Litro: $12.000 COP\n• Botella 2 Litros: $22.000 COP\n\n🛵 Domicilio disponible en todo Fonseca.',
        },
        {
          shortcut: '/pago',
          title: 'Datos de Pago (Nequi / Bancolombia)',
          category: 'PAGOS',
          content:
            '💳 *Cuentas para Pago / Transferencia:*\n• Nequi: 3024581882\n• Bancolombia: Ahorros a nombre de Edier / YogurArte\n\nPor favor nos envías el comprobante por aquí una vez realices la transferencia. ¡Gracias!',
        },
        {
          shortcut: '/saludo',
          title: 'Saludo y Bienvenida',
          category: 'GENERAL',
          content:
            '👋 ¡Hola! Bienvenido a *YogurArte*, tu yogur artesanal favorito en Fonseca. ¿En qué te podemos consentir hoy?',
        },
        {
          shortcut: '/fidelizacion',
          title: 'Programa 10+1 Yogur Gratis',
          category: 'VENTAS',
          content:
            '🎁 ¡En *YogurArte* premiamos tu preferencia! Por cada 10 botellas que compres, ¡te regalamos 1 botella de 1 Litro totalmente gratis! 🥛✨',
        },
      ];

      await prisma.crmQuickReply.createMany({
        data: defaultReplies,
      });

      replies = await prisma.crmQuickReply.findMany({
        orderBy: { id: 'asc' },
      });
    }

    res.json(replies);
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    res.status(500).json({ error: 'Error al consultar respuestas rápidas' });
  }
};

export const createQuickReply = async (req: Request, res: Response) => {
  try {
    const { shortcut, title, content, category, mediaUrl } = req.body;

    const existing = await prisma.crmQuickReply.findUnique({
      where: { shortcut },
    });

    if (existing) {
      return res.status(400).json({ error: `El atajo "${shortcut}" ya existe.` });
    }

    const reply = await prisma.crmQuickReply.create({
      data: {
        shortcut,
        title,
        content,
        category: category || 'VENTAS',
        mediaUrl,
      },
    });

    res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating quick reply:', error);
    res.status(500).json({ error: 'Error al crear respuesta rápida' });
  }
};

export const updateQuickReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { shortcut, title, content, category, mediaUrl } = req.body;

    const updated = await prisma.crmQuickReply.update({
      where: { id: Number(id) },
      data: {
        shortcut,
        title,
        content,
        category,
        mediaUrl,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating quick reply:', error);
    res.status(500).json({ error: 'Error al actualizar respuesta rápida' });
  }
};

export const deleteQuickReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.crmQuickReply.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true, message: 'Respuesta rápida eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting quick reply:', error);
    res.status(500).json({ error: 'Error al eliminar respuesta rápida' });
  }
};

