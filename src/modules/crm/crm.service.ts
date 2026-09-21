import prisma from '../../prisma.js';
import whatsappService from '../../services/whatsapp.service.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/appError.js';
import {
  SendCrmMessageInput,
  CreateRecurringScheduleInput,
  UpdateRecurringScheduleInput,
  CreateQuickReplyInput,
  UpdateQuickReplyInput,
  GetConversationsQuery,
  GetMessagesQuery,
  GetLoyaltyQuery,
  GetRecurringQuery,
} from './crm.schema.js';

// ==========================================
// 1. ESTADO Y GESTIÓN DE SESIÓN WHATSAPP
// ==========================================

export async function getStatus() {
  return whatsappService.getStatus();
}

export async function logout() {
  return whatsappService.logout();
}

export async function refreshQR() {
  return whatsappService.refreshQR();
}

// ==========================================
// 2. CONVERSACIONES Y MENSAJERÍA
// ==========================================

export async function getConversations(query: GetConversationsQuery) {
  const { search, unreadOnly, tag } = query;

  const where: any = {
    isArchived: false,
  };

  if (unreadOnly === 'true') {
    where.unreadCount = { gt: 0 };
  }

  if (tag && tag !== 'ALL') {
    where.tag = tag;
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { contactName: { contains: q, mode: 'insensitive' } },
      { phoneNumber: { contains: q, mode: 'insensitive' } },
      { lastMessageText: { contains: q, mode: 'insensitive' } },
      { customer: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  return prisma.chatConversation.findMany({
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
}

export async function getConversationMessages(conversationId: number, query: GetMessagesQuery) {
  if (!conversationId || isNaN(conversationId)) {
    throw new BadRequestError('ID de conversación inválido');
  }

  const takeCount = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  const where: any = { conversationId };

  if (query.beforeId) {
    const targetId = Number(query.beforeId);
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

  // Si es la carga inicial (sin beforeId), marcar conversación como leída de forma asíncrona y segura
  if (!query.beforeId) {
    whatsappService.markConversationAsRead(conversationId).catch(() => {});
  }

  return messages;
}

export async function sendMessage(data: SendCrmMessageInput) {
  const recipient = data.recipient || data.remoteJid || data.to;

  if (!recipient || (!data.text?.trim() && !data.mediaUrl)) {
    throw new BadRequestError('Se requiere destinatario y mensaje o archivo multimedia');
  }

  return whatsappService.sendMessage(
    recipient,
    data.text || '',
    data.contactName || undefined,
    data.customerId ? Number(data.customerId) : undefined
  );
}

export async function markAsRead(conversationId: number) {
  if (!conversationId || isNaN(conversationId)) {
    throw new BadRequestError('ID de conversación inválido');
  }
  await whatsappService.markConversationAsRead(conversationId);
  return { success: true };
}

export async function updateConversationTag(conversationId: number, tag: string) {
  if (!conversationId || isNaN(conversationId)) {
    throw new BadRequestError('ID de conversación inválido');
  }

  const existing = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!existing) {
    throw new NotFoundError('Conversación no encontrada');
  }

  return prisma.chatConversation.update({
    where: { id: conversationId },
    data: { tag },
  });
}

export async function linkCustomer(conversationId: number, customerId: number | null) {
  if (!conversationId || isNaN(conversationId)) {
    throw new BadRequestError('ID de conversación inválido');
  }

  if (!customerId) {
    return prisma.chatConversation.update({
      where: { id: conversationId },
      data: { customerId: null },
      include: { customer: true },
    });
  }

  const targetCustId = Number(customerId);
  const customer = await prisma.customer.findUnique({
    where: { id: targetCustId },
  });

  if (!customer) {
    throw new NotFoundError('Cliente no encontrado');
  }

  const cleanCustPhone = customer.phone ? customer.phone.replace(/\D/g, '') : null;
  const last10 = cleanCustPhone && cleanCustPhone.length >= 7 ? cleanCustPhone.slice(-10) : null;

  // Buscar todas las demás conversaciones asociadas a este cliente (por customerId o por su teléfono)
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

  // Notificar aisladamente a clientes vía Socket.IO (desacoplado de posibles fallos de red/socket)
  try {
    if (whatsappService.io) {
      for (const delId of deletedIds) {
        whatsappService.io.emit('whatsapp:conversation_deleted', { conversationId: delId });
      }
      whatsappService.io.emit('whatsapp:conversations_merged', {
        targetId: conversationId,
        mergedIds: deletedIds,
      });
    }
  } catch (socketErr) {
    console.warn('Advertencia: error al emitir eventos de Socket.IO en linkCustomer:', socketErr);
  }

  return conversation;
}

// ==========================================
// 3. PROGRAMA DE FIDELIZACIÓN "10 + 1 GRATIS"
// ==========================================

export async function getLoyaltyOverview(query: GetLoyaltyQuery) {
  const { search, page = '1', limit = '12' } = query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));

  const where: any = { isActive: true };
  if (search && search.trim()) {
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

  return {
    customers: paginatedItems,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
    },
  };
}

export async function redeemLoyaltyReward(customerId: number) {
  const targetCustId = Number(customerId);
  if (!targetCustId || isNaN(targetCustId)) {
    throw new BadRequestError('ID de cliente inválido');
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
    throw new NotFoundError('Cliente no encontrado');
  }

  const totalBottles = customer.orders.reduce((sum, o) => sum + (o.quantityBottles || 1), 0);
  const redeemed = customer.loyaltyRedeemedCount || 0;
  const netBottles = Math.max(0, totalBottles - redeemed * 10);

  if (netBottles < 10) {
    throw new BadRequestError(
      `El cliente solo tiene ${netBottles % 10} botellas acumuladas en este ciclo. Requiere 10 para canjear 1L gratis.`
    );
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: targetCustId },
    data: {
      loyaltyRedeemedCount: { increment: 1 },
    },
  });

  return {
    success: true,
    message: `¡Premio de 1L gratis canjeado exitosamente para ${customer.fullName}!`,
    loyaltyRedeemedCount: updatedCustomer.loyaltyRedeemedCount,
  };
}

// ==========================================
// 4. COMPRAS FRECUENTES Y RECORDATORIOS
// ==========================================

export async function getRecurringSchedules(query: GetRecurringQuery) {
  const { filter = 'ALL', search } = query;

  const where: any = { isActive: true };

  if (search && search.trim()) {
    where.OR = [
      { customer: { fullName: { contains: search.trim(), mode: 'insensitive' } } },
      { customer: { phone: { contains: search.trim(), mode: 'insensitive' } } },
      { preferredFlavor: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const in3Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59, 999);

  if (filter === 'TODAY') {
    where.nextDate = { lte: endOfToday };
  } else if (filter === 'UPCOMING') {
    where.nextDate = { gt: endOfToday, lte: in3Days };
  }

  return prisma.recurringSchedule.findMany({
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
}

export async function createRecurringSchedule(data: CreateRecurringScheduleInput) {
  const { customerId, frequencyDays, preferredFlavor, bottleSize, quantity, nextDate, notes } = data;

  const customer = await prisma.customer.findUnique({
    where: { id: Number(customerId) },
  });

  if (!customer) {
    throw new NotFoundError('Cliente no encontrado');
  }

  return prisma.recurringSchedule.create({
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
}

export async function updateRecurringSchedule(id: number, data: UpdateRecurringScheduleInput) {
  if (!id || isNaN(id)) {
    throw new BadRequestError('ID de programación inválido');
  }

  const existing = await prisma.recurringSchedule.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Programación no encontrada');
  }

  const updateData: any = {};
  if (data.frequencyDays !== undefined) updateData.frequencyDays = Number(data.frequencyDays);
  if (data.preferredFlavor !== undefined) updateData.preferredFlavor = data.preferredFlavor;
  if (data.bottleSize !== undefined) updateData.bottleSize = data.bottleSize;
  if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
  if (data.nextDate !== undefined) updateData.nextDate = new Date(data.nextDate);
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

  return prisma.recurringSchedule.update({
    where: { id },
    data: updateData,
    include: { customer: true },
  });
}

export async function deleteRecurringSchedule(id: number) {
  if (!id || isNaN(id)) {
    throw new BadRequestError('ID de programación inválido');
  }

  const existing = await prisma.recurringSchedule.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Programación no encontrada');
  }

  await prisma.recurringSchedule.delete({
    where: { id },
  });

  return { success: true, message: 'Programación eliminada exitosamente' };
}

export async function triggerRecurringOrder(scheduleId: number, registeredByName?: string) {
  if (!scheduleId || isNaN(scheduleId)) {
    throw new BadRequestError('ID de programación inválido');
  }

  const schedule = await prisma.recurringSchedule.findUnique({
    where: { id: scheduleId },
    include: { customer: true },
  });

  if (!schedule) {
    throw new NotFoundError('Programación no encontrada');
  }

  // Precios oficiales
  const unitPrice = schedule.bottleSize === '2L' ? 22000 : 12000;
  const litersPerUnit = schedule.bottleSize === '2L' ? 2.0 : 1.0;
  const totalLiters = schedule.quantity * litersPerUnit;
  const totalAmount = schedule.quantity * unitPrice;

  // Generar consecutivo de pedido correlativo
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
      registeredBy: registeredByName || 'CRM YogurArte',
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

  // Actualizar fecha del próximo recordatorio sumando los días de frecuencia
  const nextDate = new Date(schedule.nextDate);
  nextDate.setDate(nextDate.getDate() + schedule.frequencyDays);

  await prisma.recurringSchedule.update({
    where: { id: scheduleId },
    data: {
      lastOrderDate: new Date(),
      nextDate,
    },
  });

  return {
    success: true,
    message: `Pedido ${orderNumber} creado exitosamente`,
    order,
    nextScheduledDate: nextDate,
  };
}

// ==========================================
// 5. PLANTILLAS Y RESPUESTAS RÁPIDAS
// ==========================================

export async function getQuickReplies() {
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

  return replies;
}

export async function createQuickReply(data: CreateQuickReplyInput) {
  const existing = await prisma.crmQuickReply.findUnique({
    where: { shortcut: data.shortcut },
  });

  if (existing) {
    throw new BadRequestError(`El atajo "${data.shortcut}" ya existe.`);
  }

  return prisma.crmQuickReply.create({
    data: {
      shortcut: data.shortcut,
      title: data.title,
      content: data.content,
      category: data.category || 'VENTAS',
      mediaUrl: data.mediaUrl,
    },
  });
}

export async function updateQuickReply(id: number, data: UpdateQuickReplyInput) {
  if (!id || isNaN(id)) {
    throw new BadRequestError('ID de respuesta rápida inválido');
  }

  const existing = await prisma.crmQuickReply.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Respuesta rápida no encontrada');
  }

  return prisma.crmQuickReply.update({
    where: { id },
    data: {
      shortcut: data.shortcut,
      title: data.title,
      content: data.content,
      category: data.category,
      mediaUrl: data.mediaUrl,
    },
  });
}

export async function deleteQuickReply(id: number) {
  if (!id || isNaN(id)) {
    throw new BadRequestError('ID de respuesta rápida inválido');
  }

  const existing = await prisma.crmQuickReply.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Respuesta rápida no encontrada');
  }

  await prisma.crmQuickReply.delete({
    where: { id },
  });

  return { success: true, message: 'Respuesta rápida eliminada exitosamente' };
}
