import prisma from '../../prisma.js';
import whatsappService, { normalizeColombianJid } from '../../services/whatsapp.service.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/appError.js';
import { getLocalDateString } from '../../shared/utils/dateUtils.js';
import { resolvePresentationLiters } from '../orders/orders.service.js';
import {
  SendCrmMessageInput,
  MergeChatInput,
  UnlinkChatInput,
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
  const { search, unreadOnly, tag, customerId } = query;

  const where: any = {
    isArchived: false,
  };

  if (customerId && !isNaN(Number(customerId))) {
    where.customerId = Number(customerId);
  }

  if (unreadOnly === 'true') {
    where.unreadCount = { gt: 0 };
  }

  if (tag && tag !== 'ALL') {
    where.tag = tag;
  }

  if (search && search.trim()) {
    const q = search.trim();
    const normalizedQ = normalizeColombianJid(q);
    where.OR = [
      { contactName: { contains: q, mode: 'insensitive' } },
      { phoneNumber: { contains: q, mode: 'insensitive' } },
      { phoneNumber: { contains: normalizedQ, mode: 'insensitive' } },
      { remoteJid: { contains: q, mode: 'insensitive' } },
      { remoteJid: { contains: normalizedQ, mode: 'insensitive' } },
      { lastMessageText: { contains: q, mode: 'insensitive' } },
      { customer: { fullName: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: normalizedQ, mode: 'insensitive' } } },
    ];
  }

  const rawConversations = await prisma.chatConversation.findMany({
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

  const customerIds = Array.from(new Set(rawConversations.map((c) => c.customerId).filter(Boolean))) as number[];
  const bottleCountMap = new Map<number, number>();

  if (customerIds.length > 0) {
    const ordersAgg = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        deliveryStatus: { not: 'CANCELLED' },
      },
      _sum: {
        quantityBottles: true,
        totalLiters: true,
      },
    });

    for (const agg of ordersAgg) {
      if (agg.customerId) {
        const total = agg._sum.totalLiters != null ? Number(agg._sum.totalLiters) : (agg._sum.quantityBottles || 0);
        bottleCountMap.set(agg.customerId, Math.round(total * 100) / 100);
      }
    }
  }

  return rawConversations.map((conv) => {
    if (conv.customer) {
      const totalBottles = bottleCountMap.has(conv.customer.id)
        ? bottleCountMap.get(conv.customer.id)!
        : (conv.customer.orders?.reduce((sum, o) => sum + (Number((o as any).totalLiters) || o.quantityBottles || 1), 0) || 0);
      const redeemed = conv.customer.loyaltyRedeemedCount || 0;
      const netBottles = Math.max(0, totalBottles - redeemed * 10);
      const currentCycle = netBottles % 10;
      const rewardsAvailable = Math.floor(netBottles / 10);
      const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));
      const bottlesNeeded = Math.max(0, 10 - currentCycle);

      return {
        ...conv,
        customer: {
          ...conv.customer,
          loyaltySummary: {
            totalBottles,
            redeemedCount: redeemed,
            currentCycleBottles: currentCycle,
            rewardsAvailable,
            progressPercent,
            bottlesNeeded,
          },
        },
      };
    }
    return conv;
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

/**
 * Resolución híbrida de destinatarios para WhatsApp:
 * Resuelve tanto números telefónicos como @username o identificadores alfanuméricos
 * al JID correspondiente (...@s.whatsapp.net o ...@lid)
 */
export async function resolveRecipientJid(recipient: string, customerId?: number | null): Promise<string> {
  const trimmed = normalizeColombianJid(recipient.trim());

  // 1. Si ya es un JID completo y válido de WhatsApp
  if (trimmed.endsWith('@s.whatsapp.net') || trimmed.endsWith('@lid') || trimmed.endsWith('@g.us')) {
    return normalizeColombianJid(trimmed);
  }

  // 2. Si contiene dígitos telefónicos válidos (mínimo 7 dígitos)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 7 && !trimmed.startsWith('@')) {
    let cleanPhone = digits;
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = `57${cleanPhone}`;
    }
    cleanPhone = normalizeColombianJid(cleanPhone);
    return `${cleanPhone}@s.whatsapp.net`;
  }

  // 3. Si se proporcionó customerId, buscar su conversación previa o número telefónico registrado
  if (customerId) {
    const existingConv = await prisma.chatConversation.findFirst({
      where: { customerId: Number(customerId) },
      orderBy: { updatedAt: 'desc' },
      select: { remoteJid: true, phoneNumber: true },
    });
    if (existingConv?.remoteJid && (existingConv.remoteJid.endsWith('@s.whatsapp.net') || existingConv.remoteJid.endsWith('@lid'))) {
      return normalizeColombianJid(existingConv.remoteJid);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: Number(customerId) },
      select: { phone: true },
    });
    if (customer?.phone) {
      const custDigits = customer.phone.replace(/\D/g, '');
      if (custDigits.length >= 7) {
        let cleanPhone = custDigits;
        if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
          cleanPhone = `57${cleanPhone}`;
        }
        cleanPhone = normalizeColombianJid(cleanPhone);
        return `${cleanPhone}@s.whatsapp.net`;
      }
    }
  }

  // 4. Si es un @username o alias alfanumérico (ej: @carlos_lopez o carlos_lopez)
  const cleanUsername = trimmed.replace(/^@/, '').trim();
  if (cleanUsername) {
    // Buscar en conversaciones de chat por contactName, phoneNumber o customer
    const conv = await prisma.chatConversation.findFirst({
      where: {
        OR: [
          { contactName: { equals: cleanUsername, mode: 'insensitive' } },
          { contactName: { contains: cleanUsername, mode: 'insensitive' } },
          { phoneNumber: { equals: cleanUsername, mode: 'insensitive' } },
          { phoneNumber: { contains: cleanUsername, mode: 'insensitive' } },
          { customer: { fullName: { equals: cleanUsername, mode: 'insensitive' } } },
          { customer: { fullName: { contains: cleanUsername, mode: 'insensitive' } } },
          { customer: { phone: { contains: cleanUsername, mode: 'insensitive' } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: { remoteJid: true },
    });

    if (conv?.remoteJid && (conv.remoteJid.endsWith('@s.whatsapp.net') || conv.remoteJid.endsWith('@lid'))) {
      return conv.remoteJid;
    }

    // Buscar en la tabla Customer
    const matchedCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { fullName: { equals: cleanUsername, mode: 'insensitive' } },
          { fullName: { contains: cleanUsername, mode: 'insensitive' } },
          { phone: { equals: cleanUsername, mode: 'insensitive' } },
          { phone: { contains: cleanUsername, mode: 'insensitive' } },
          { phone: { equals: `@${cleanUsername}`, mode: 'insensitive' } },
        ],
      },
      select: { id: true, phone: true },
    });

    if (matchedCustomer?.phone) {
      const custDigits = matchedCustomer.phone.replace(/\D/g, '');
      if (custDigits.length >= 7) {
        let cleanPhone = custDigits;
        if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
          cleanPhone = `57${cleanPhone}`;
        }
        return `${cleanPhone}@s.whatsapp.net`;
      }
    }

    if (matchedCustomer?.id) {
      const customerConv = await prisma.chatConversation.findFirst({
        where: { customerId: matchedCustomer.id },
        select: { remoteJid: true },
      });
      if (customerConv?.remoteJid) {
        return customerConv.remoteJid;
      }
    }
  }

  // 5. Fallback si tiene dígitos utilizables
  if (digits.length >= 7) {
    let cleanPhone = digits;
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = `57${cleanPhone}`;
    }
    return `${cleanPhone}@s.whatsapp.net`;
  }

  const isUsernameCandidate = trimmed.startsWith('@') || (cleanUsername.length > 0 && isNaN(Number(cleanUsername)));
  if (isUsernameCandidate) {
    throw new BadRequestError(
      `El contacto "${recipient}" está registrado como nombre de usuario (@${cleanUsername}) sin número telefónico ni chat previo en el servidor. WhatsApp requiere iniciar la conversación externamente a través de WhatsApp oficial (Web o App).`
    );
  }

  throw new BadRequestError(
    `No se pudo resolver un destinatario de WhatsApp válido para "${recipient}". Verifique el número telefónico del cliente o ábralo directamente en la aplicación de WhatsApp.`
  );
}

export async function sendMessage(data: SendCrmMessageInput) {
  const recipient = data.recipient || data.remoteJid || data.to;

  if (!recipient || (!data.text?.trim() && !data.mediaUrl)) {
    throw new BadRequestError('Se requiere destinatario y mensaje o archivo multimedia');
  }

  const jid = await resolveRecipientJid(recipient, data.customerId ? Number(data.customerId) : undefined);

  try {
    return await whatsappService.sendMessage(
      jid,
      data.text || '',
      data.contactName || undefined,
      data.customerId ? Number(data.customerId) : undefined
    );
  } catch (err: any) {
    const errMessage = err?.message || 'Error desconocido';
    throw new BadRequestError(
      `No se pudo enviar el mensaje por el CRM: ${errMessage}. Puedes abrir el chat directamente en WhatsApp oficial.`
    );
  }
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
  const custUsername = customer.phone && customer.phone.startsWith('@')
    ? customer.phone.slice(1).trim()
    : (!cleanCustPhone && customer.phone && /[a-zA-Z]/.test(customer.phone) ? customer.phone.trim() : null);

  const otherConvConditions: any[] = [{ customerId: targetCustId }];
  if (cleanCustPhone && cleanCustPhone.length >= 7) {
    otherConvConditions.push({ phoneNumber: cleanCustPhone });
  }
  if (last10) {
    otherConvConditions.push(
      { phoneNumber: { contains: last10 } },
      { remoteJid: { contains: last10 } }
    );
  }
  if (custUsername && custUsername.length >= 2) {
    otherConvConditions.push(
      { contactName: { equals: custUsername, mode: 'insensitive' } },
      { contactName: { contains: custUsername, mode: 'insensitive' } },
      { phoneNumber: { equals: custUsername, mode: 'insensitive' } },
      { phoneNumber: { contains: custUsername, mode: 'insensitive' } },
      { remoteJid: { contains: custUsername, mode: 'insensitive' } }
    );
  }

  // Buscar todas las demás conversaciones asociadas a este cliente (por customerId, teléfono o @usuario)
  const otherConvs = await prisma.chatConversation.findMany({
    where: {
      id: { not: conversationId },
      OR: otherConvConditions,
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

/**
 * Fusión de chats duplicados en el CRM (ej. 57 vs 579 o creación de hilos separados).
 * Mueve transaccionalmente todos los mensajes, actualiza la conversación canónica
 * y elimina la conversación redundante.
 */
export async function mergeChats(input: MergeChatInput) {
  const sourceChatId = Number(input.sourceChatId);
  const targetClientId = Number(input.targetClientId);
  const rawCanonicalJid = input.canonicalJid ? normalizeColombianJid(input.canonicalJid) : undefined;

  if (!sourceChatId || isNaN(sourceChatId)) {
    throw new BadRequestError('ID de conversación origen inválido');
  }
  if (!targetClientId || isNaN(targetClientId)) {
    throw new BadRequestError('ID de cliente destino inválido');
  }

  const sourceChat = await prisma.chatConversation.findUnique({
    where: { id: sourceChatId },
    include: { messages: true },
  });
  if (!sourceChat) {
    throw new NotFoundError('Conversación origen no encontrada');
  }

  const targetCustomer = await prisma.customer.findUnique({
    where: { id: targetClientId },
  });
  if (!targetCustomer) {
    throw new NotFoundError('Cliente destino no encontrado');
  }

  const cleanCustomerPhone = targetCustomer.phone
    ? normalizeColombianJid(targetCustomer.phone.replace(/\D/g, ''))
    : null;
  const targetUsername = targetCustomer.phone && targetCustomer.phone.startsWith('@')
    ? targetCustomer.phone.slice(1).trim()
    : (!cleanCustomerPhone && targetCustomer.phone && /[a-zA-Z]/.test(targetCustomer.phone) ? targetCustomer.phone.trim() : null);

  // Ejecución atómica en transacción
  const result = await prisma.$transaction(async (tx) => {
    // 1. Buscar si ya existe una conversación vinculada al cliente destino (excluyendo la origen)
    let targetConv = await tx.chatConversation.findFirst({
      where: {
        id: { not: sourceChatId },
        customerId: targetClientId,
      },
    });

    // 2. Si no hay por customerId, buscar por teléfono, JID canónico o @usuario
    if (!targetConv) {
      const searchConditions: any[] = [];
      if (cleanCustomerPhone && cleanCustomerPhone.length >= 7) {
        searchConditions.push(
          { phoneNumber: cleanCustomerPhone },
          { remoteJid: `${cleanCustomerPhone}@s.whatsapp.net` }
        );
        const last10 = cleanCustomerPhone.slice(-10);
        searchConditions.push(
          { phoneNumber: { contains: last10 } },
          { remoteJid: { contains: last10 } }
        );
      }
      if (rawCanonicalJid) {
        searchConditions.push({ remoteJid: rawCanonicalJid });
      }
      if (targetUsername && targetUsername.length >= 2) {
        searchConditions.push(
          { contactName: { equals: targetUsername, mode: 'insensitive' } },
          { contactName: { contains: targetUsername, mode: 'insensitive' } },
          { phoneNumber: { equals: targetUsername, mode: 'insensitive' } },
          { phoneNumber: { contains: targetUsername, mode: 'insensitive' } },
          { remoteJid: { contains: targetUsername, mode: 'insensitive' } }
        );
      }

      if (searchConditions.length > 0) {
        targetConv = await tx.chatConversation.findFirst({
          where: {
            id: { not: sourceChatId },
            OR: searchConditions,
          },
        });
      }
    }

    if (targetConv) {
      // FUSIÓN: Mover todos los mensajes de sourceChat a targetConv
      await tx.chatMessage.updateMany({
        where: { conversationId: sourceChatId },
        data: { conversationId: targetConv.id },
      });

      // Eliminar el chat origen duplicado
      await tx.chatConversation.delete({
        where: { id: sourceChatId },
      });

      // Determinar el JID canónico final seguro (evitando colisión con terceros)
      let finalJid = rawCanonicalJid || normalizeColombianJid(targetConv.remoteJid);
      if (finalJid !== targetConv.remoteJid) {
        const existingWithJid = await tx.chatConversation.findUnique({
          where: { remoteJid: finalJid },
        });
        if (existingWithJid && existingWithJid.id !== targetConv.id) {
          finalJid = targetConv.remoteJid;
        }
      }
      const finalPhone = cleanCustomerPhone || normalizeColombianJid(targetConv.phoneNumber);

      // Obtener el último mensaje cronológico
      const lastMsg = await tx.chatMessage.findFirst({
        where: { conversationId: targetConv.id },
        orderBy: { timestamp: 'desc' },
      });

      const updatedTarget = await tx.chatConversation.update({
        where: { id: targetConv.id },
        data: {
          customerId: targetClientId,
          contactName: targetCustomer.fullName,
          phoneNumber: finalPhone,
          remoteJid: finalJid,
          lastMessageText: lastMsg ? lastMsg.text : targetConv.lastMessageText,
          lastMessageTimestamp: lastMsg ? lastMsg.timestamp : targetConv.lastMessageTimestamp,
          lastMessageFromMe: lastMsg ? lastMsg.fromMe : targetConv.lastMessageFromMe,
          unreadCount: 0,
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
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      return { conversation: updatedTarget, deletedId: sourceChatId };
    } else {
      // VINCULACIÓN DIRECTA: Si no existía otra conversación, sourceChat pasa a ser la conversación canónica
      const finalJid = rawCanonicalJid || normalizeColombianJid(sourceChat.remoteJid);
      const finalPhone = cleanCustomerPhone || normalizeColombianJid(sourceChat.phoneNumber);

      const updatedSource = await tx.chatConversation.update({
        where: { id: sourceChatId },
        data: {
          customerId: targetClientId,
          contactName: targetCustomer.fullName,
          phoneNumber: finalPhone,
          remoteJid: finalJid,
          unreadCount: 0,
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
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      return { conversation: updatedSource, deletedId: null };
    }
  });

  // Notificar a Socket.IO
  try {
    if (whatsappService.io) {
      if (result.deletedId) {
        whatsappService.io.emit('whatsapp:conversation_deleted', { conversationId: result.deletedId });
        whatsappService.io.emit('whatsapp:conversations_merged', {
          targetId: result.conversation.id,
          sourceId: result.deletedId,
        });
      }
      whatsappService.io.emit('whatsapp:conversation_updated', {
        conversation: result.conversation,
      });
    }
  } catch (socketErr) {
    console.warn('Error emitiendo evento de merge vía socket:', socketErr);
  }

  // Calcular fidelización histórica
  const conv = result.conversation;
  if (conv.customer) {
    const ordersAgg = await prisma.order.aggregate({
      where: {
        customerId: targetClientId,
        deliveryStatus: { not: 'CANCELLED' },
      },
      _sum: {
        quantityBottles: true,
      },
    });

    const totalBottles = ordersAgg._sum.quantityBottles || 0;
    const redeemed = conv.customer.loyaltyRedeemedCount || 0;
    const netBottles = Math.max(0, totalBottles - redeemed * 10);
    const currentCycle = netBottles % 10;
    const rewardsAvailable = Math.floor(netBottles / 10);
    const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));
    const bottlesNeeded = Math.max(0, 10 - currentCycle);

    return {
      ...conv,
      customer: {
        ...conv.customer,
        loyaltySummary: {
          totalBottles,
          redeemedCount: redeemed,
          currentCycleBottles: currentCycle,
          rewardsAvailable,
          progressPercent,
          bottlesNeeded,
        },
      },
    };
  }

  return conv;
}

/**
 * Desvincula un chat de su cliente registrado (sin borrar mensajes ni historial)
 */
export async function unlinkChat(input: UnlinkChatInput) {
  const chatId = Number(input.chatId);
  if (!chatId || isNaN(chatId)) {
    throw new BadRequestError('ID de conversación inválido');
  }

  const existing = await prisma.chatConversation.findUnique({
    where: { id: chatId },
  });
  if (!existing) {
    throw new NotFoundError('Conversación no encontrada');
  }

  const updated = await prisma.chatConversation.update({
    where: { id: chatId },
    data: {
      customerId: null,
    },
    include: {
      customer: true,
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  try {
    if (whatsappService.io) {
      whatsappService.io.emit('whatsapp:conversation_unlinked', {
        conversationId: chatId,
        conversation: updated,
      });
      whatsappService.io.emit('whatsapp:conversation_updated', {
        conversation: updated,
      });
    }
  } catch (e) {}

  return updated;
}

// ==========================================
// 3. PROGRAMA DE FIDELIZACIÓN "10 + 1 GRATIS"
// ==========================================

export async function getLoyaltyOverview(query: GetLoyaltyQuery) {
  const { search, page = '1', limit = '12', customerId } = query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));

  const where: any = { isActive: true };
  if (customerId && !isNaN(Number(customerId))) {
    where.id = Number(customerId);
  } else
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
          totalLiters: true,
          totalAmount: true,
          orderDate: true,
        },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  const loyaltyData = customers.map((cust) => {
    const totalBottles = Math.round(
      cust.orders.reduce((sum, o) => sum + (Number((o as any).totalLiters) || o.quantityBottles || 1), 0) * 100
    ) / 100;
    const redeemed = cust.loyaltyRedeemedCount || 0;
    const netBottles = Math.max(0, Math.round((totalBottles - redeemed * 10) * 100) / 100);
    const currentCycle = Math.round((netBottles % 10) * 100) / 100;
    const rewardsAvailable = Math.floor(netBottles / 10);
    const progressPercent = Math.min(100, Math.round((currentCycle / 10) * 100));
    const bottlesNeeded = Math.max(0, Math.round((10 - currentCycle) * 100) / 100);

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
      bottlesNeeded,
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

export async function redeemLoyaltyReward(rawInput: any) {
  const input = typeof rawInput === 'number' ? { customerId: rawInput } : rawInput;
  const targetCustId = Number(input.customerId);
  if (!targetCustId || isNaN(targetCustId)) {
    throw new BadRequestError('ID de cliente inválido');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: targetCustId },
    include: {
      orders: {
        where: { deliveryStatus: { not: 'CANCELLED' } },
        select: { quantityBottles: true, totalLiters: true },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Cliente no encontrado');
  }

  const totalBottles = Math.round(
    customer.orders.reduce((sum, o) => sum + (Number(o.totalLiters) || o.quantityBottles || 1), 0) * 100
  ) / 100;
  const redeemed = customer.loyaltyRedeemedCount || 0;
  const netBottles = Math.max(0, Math.round((totalBottles - redeemed * 10) * 100) / 100);

  if (netBottles < 10) {
    throw new BadRequestError(
      `El cliente solo tiene ${(netBottles % 10).toFixed(1)} unidades de 1L (o litros equivalentes) acumuladas. Requiere 10 para canjear su premio.`
    );
  }

  let totalRedeemLiters = 0;
  let totalBottlesRedeemed = 0;
  let presentationSummary = '1L';

  if (input.items && Array.isArray(input.items) && input.items.length > 0) {
    for (const item of input.items) {
      const unitLiters = resolvePresentationLiters(item.bottleSize);
      const qty = Number(item.quantity) || 1;
      totalRedeemLiters += unitLiters * qty;
      totalBottlesRedeemed += qty;
    }
    if (totalRedeemLiters > 1.05) {
      throw new BadRequestError(
        `El premio de fidelización permite hasta 1.0 Litro. Volumen seleccionado: ${totalRedeemLiters.toFixed(2)}L`
      );
    }
    presentationSummary = input.items.map((i: any) => `${i.quantity}x ${i.bottleSize}`).join(', ');
  } else {
    totalRedeemLiters = 1.0;
    totalBottlesRedeemed = 1;
    presentationSummary = '1L';
  }

  let dischargeId = undefined;
  if (input.packagingId) {
    const packaging = await prisma.batchPackaging.findUnique({
      where: { id: Number(input.packagingId) },
      select: { id: true, batchId: true },
    });
    if (!packaging) {
      throw new NotFoundError('Fracción de lote envasado no encontrada');
    }

    const discharge = await prisma.batchDischarge.create({
      data: {
        batchId: packaging.batchId,
        packagingId: packaging.id,
        bottleSize: presentationSummary,
        quantityBottles: totalBottlesRedeemed,
        totalLiters: totalRedeemLiters,
        unitPrice: 0,
        totalAmount: 0,
        reasonType: 'PREMIO_FIDELIZACION',
        notes: `Premio fidelización 10+1 entregado a ${customer.fullName} (${presentationSummary})`,
        registeredBy: input.registeredBy || 'Sistema',
      },
    });
    dischargeId = discharge.id;
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id: targetCustId },
    data: {
      loyaltyRedeemedCount: { increment: 1 },
    },
  });

  return {
    success: true,
    message: `¡Premio de fidelización (${presentationSummary}) canjeado exitosamente para ${customer.fullName}!`,
    loyaltyRedeemedCount: updatedCustomer.loyaltyRedeemedCount,
    dischargeId,
    redeemedLiters: totalRedeemLiters,
  };
}

// ==========================================
// 4. COMPRAS FRECUENTES Y RECORDATORIOS
// ==========================================

export async function getRecurringSchedules(query: GetRecurringQuery) {
  const { filter = 'ALL', search, page, limit, paginate } = query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

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
    where.isActive = true;
    where.nextDate = { lte: endOfToday };
  } else if (filter === 'UPCOMING') {
    where.isActive = true;
    where.nextDate = { gt: endOfToday, lte: in3Days };
  } else if (filter === 'ACTIVE') {
    where.isActive = true;
  } else if (filter === 'PAUSED') {
    where.isActive = false;
  }

  const [totalItems, items] = await Promise.all([
    prisma.recurringSchedule.count({ where }),
    prisma.recurringSchedule.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            address: true,
            orders: {
              where: {
                deliveryStatus: { not: 'CANCELLED' },
                paymentStatus: { in: ['PENDING', 'PARTIAL'] },
              },
              select: {
                id: true,
                orderNumber: true,
                orderDate: true,
                totalAmount: true,
                paidAmount: true,
                pendingAmount: true,
                paymentStatus: true,
                deliveryStatus: true,
              },
              orderBy: { orderDate: 'asc' },
            },
          },
        },
      },
      orderBy: { nextDate: 'asc' },
      skip,
      take: limitNum,
    }),
  ]);

  const enrichedItems = items.map((sch) => {
    const debtOrders = sch.customer?.orders || [];
    const pendingDebt = debtOrders.reduce((sum, o) => {
      const p = o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0));
      return sum + p;
    }, 0);

    return {
      ...sch,
      customer: {
        id: sch.customer.id,
        fullName: sch.customer.fullName,
        phone: sch.customer.phone,
        address: sch.customer.address,
        pendingDebt,
        pendingOrders: debtOrders.map((o) => ({
          ...o,
          calculatedPending: o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0)),
        })),
      },
    };
  });

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  if (paginate === true) {
    return {
      data: enrichedItems,
      items: enrichedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    };
  }

  return Object.assign(enrichedItems, {
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalItems,
      totalPages,
    },
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

  // Generar consecutivo de pedido correlativo (PED-YYYYMMDD-001) usando zona horaria de Colombia
  const todayStr = getLocalDateString().replace(/-/g, '');
  const todayOrders = await prisma.order.findMany({
    where: {
      orderNumber: { startsWith: `PED-${todayStr}` },
    },
    select: { orderNumber: true },
  });

  let maxSeq = 0;
  for (const ord of todayOrders) {
    const parts = ord.orderNumber.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  let nextSeq = maxSeq + 1;
  let orderNumber = `PED-${todayStr}-${String(nextSeq).padStart(3, '0')}`;
  while (await prisma.order.findUnique({ where: { orderNumber } })) {
    nextSeq++;
    orderNumber = `PED-${todayStr}-${String(nextSeq).padStart(3, '0')}`;
  }

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
        shortcut: '/bienvenida',
        title: 'Bienvenida Institucional',
        category: 'GENERAL',
        content:
          'Hola {{cliente}}, gracias por comunicarte con YogurArte. Estamos atentos para tomar tu pedido o resolver cualquier inquietud sobre nuestros yogures artesanales.',
      },
      {
        shortcut: '/sabores',
        title: 'Catalogo de Sabores',
        category: 'VENTAS',
        content:
          'Estimado/a {{cliente}}, hoy tenemos disponibles los siguientes sabores frescos: {{sabores}}. Presentaciones en 1 Litro ($12.000 COP) y 2 Litros ($22.000 COP). ¿Cual deseas ordenar?',
      },
      {
        shortcut: '/despacho',
        title: 'Confirmacion de Despacho',
        category: 'VENTAS',
        content:
          'Estimado/a {{cliente}}, tu pedido por un valor de {{total}} ha sido preparado y despachado con nuestro domiciliario hacia tu direccion. Te avisaremos apenas este en camino.',
      },
      {
        shortcut: '/saldo',
        title: 'Recordatorio de Saldo Pendiente',
        category: 'PAGOS',
        content:
          'Estimado/a {{cliente}}, te informamos que tienes un saldo pendiente de {{total}} de tu pedido anterior en YogurArte. Puedes transferir a nuestra cuenta Nequi 3024581882 y enviarnos el comprobante por aqui. Muchas gracias.',
      },
      {
        shortcut: '/gracias_pago',
        title: 'Agradecer Pago Recibido',
        category: 'PAGOS',
        content:
          '¡Hola {{cliente}}! 🥛✨ Confirmamos con éxito el recibo de tu pago por valor de {{total}}. Muchísimas gracias por tu preferencia y por apoyar nuestro yogur artesanal. ¡Que lo disfrutes al máximo! 🙌🐄',
      },
      {
        shortcut: '/fidelizacion',
        title: 'Programa 10+1 Yogur Gratis',
        category: 'VENTAS',
        content:
          'Estimado/a {{cliente}}, con el Programa de Fidelización YogurArte acumulas litros en cada compra: por cada 10 envases de 1L (o 10 litros equivalentes), recibes 1 envase de 1 Litro totalmente gratis.',
      },
    ];

    await prisma.crmQuickReply.createMany({
      data: defaultReplies,
    });

    replies = await prisma.crmQuickReply.findMany({
      orderBy: { id: 'asc' },
    });
  } else {
    // Si la tabla ya existe pero aún no tiene la plantilla /gracias_pago, agregarla
    const hasThanksPayment = replies.some((r) => r.shortcut === '/gracias_pago');
    if (!hasThanksPayment) {
      await prisma.crmQuickReply.create({
        data: {
          shortcut: '/gracias_pago',
          title: 'Agradecer Pago Recibido',
          category: 'PAGOS',
          content:
            '¡Hola {{cliente}}! 🥛✨ Confirmamos con éxito el recibo de tu pago por valor de {{total}}. Muchísimas gracias por tu preferencia y por apoyar nuestro yogur artesanal. ¡Que lo disfrutes al máximo! 🙌🐄',
        },
      }).catch(() => {});

      replies = await prisma.crmQuickReply.findMany({
        orderBy: { id: 'asc' },
      });
    }
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
