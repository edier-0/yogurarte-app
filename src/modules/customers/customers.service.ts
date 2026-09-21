import prisma from '../../prisma.js';
import { buildWhatsAppUrl } from '../../utils/whatsapp.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  ApplyCustomerPaymentInput,
  CreateOrUpdateCustomerInput,
  CustomersQueryInput,
  ResolveCustomerInput,
  UpdateCustomerInput,
} from './customers.schema.js';

/**
 * Normaliza nombres de usuario de WhatsApp (@usuario -> usuario en minúsculas)
 */
export function normalizeWhatsAppUsername(username?: string | null): string | null {
  if (!username) return null;
  const cleaned = username.replace(/^@/, '').trim().toLowerCase();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Normaliza un número telefónico extrayendo solo dígitos
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  // Si empieza con @ o tiene letras, es un nombre de usuario, no un teléfono
  if (trimmed.startsWith('@') || /[a-zA-Z]/.test(trimmed)) {
    return null;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * Resolución Inteligente de Clientes (Upsert/Link híbrido WhatsApp + Teléfono)
 * Soporta búsqueda por JID/BSUID, WhatsApp Username (@usuario) o Teléfono,
 * enriqueciendo el contacto existente sin duplicar registros.
 */
export const resolveOrCreateCustomer = async (data: ResolveCustomerInput) => {
  const { fullName, phone, whatsappUsername, whatsappId, jid, address, neighborhood, notes } = data;

  const targetJid = whatsappId || jid || null;
  const cleanUsername = normalizeWhatsAppUsername(whatsappUsername) || (phone && (phone.startsWith('@') || /[a-zA-Z]/.test(phone)) ? normalizeWhatsAppUsername(phone) : null);
  const cleanDigits = normalizePhone(phone);

  let matchedCustomer: any = null;

  // 1. Buscar por conversación previa en CRM (JID / WhatsApp ID técnico)
  if (targetJid) {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        OR: [
          { remoteJid: targetJid },
          { remoteJid: { contains: targetJid } },
        ],
      },
      include: { customer: true },
    });
    if (conversation?.customer) {
      matchedCustomer = conversation.customer;
    }
  }

  // 2. Buscar por nombre de usuario de WhatsApp (@usuario)
  if (!matchedCustomer && cleanUsername) {
    matchedCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: { equals: `@${cleanUsername}`, mode: 'insensitive' } },
          { phone: { equals: cleanUsername, mode: 'insensitive' } },
          {
            conversations: {
              some: {
                OR: [
                  { contactName: { contains: cleanUsername, mode: 'insensitive' } },
                  { remoteJid: { contains: cleanUsername, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
    });
  }

  // 3. Buscar por teléfono tradicional normalizado
  if (!matchedCustomer && cleanDigits) {
    const last10 = cleanDigits.slice(-10);
    matchedCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: cleanDigits },
          { phone: { contains: last10 } },
        ],
      },
    });
  }

  // 4. Si el cliente ya existe, enriquecer datos sin duplicar
  if (matchedCustomer) {
    const updateData: any = {};
    if (fullName && (!matchedCustomer.fullName || matchedCustomer.fullName === 'Cliente' || matchedCustomer.fullName.startsWith('Cliente WhatsApp'))) {
      updateData.fullName = fullName.trim();
    }
    // Si entró con número real y antes solo tenía username, actualizar o enriquecer
    if (cleanDigits && (matchedCustomer.phone.startsWith('@') || /[a-zA-Z]/.test(matchedCustomer.phone))) {
      updateData.phone = cleanDigits;
    }
    if (address && !matchedCustomer.address) {
      updateData.address = address.trim();
    }
    if (neighborhood && !matchedCustomer.neighborhood) {
      updateData.neighborhood = neighborhood.trim();
    }
    if (notes && !matchedCustomer.notes) {
      updateData.notes = notes.trim();
    }

    if (Object.keys(updateData).length > 0) {
      matchedCustomer = await prisma.customer.update({
        where: { id: matchedCustomer.id },
        data: updateData,
      });
    }

    // Vincular conversación si no estaba vinculada
    if (targetJid) {
      await prisma.chatConversation.updateMany({
        where: {
          remoteJid: targetJid,
          customerId: null,
        },
        data: { customerId: matchedCustomer.id },
      }).catch(() => {});
    }

    return matchedCustomer;
  }

  // 5. Si no existe, crear cliente con su identificador primario (teléfono o @username)
  const finalContact = cleanDigits || (cleanUsername ? `@${cleanUsername}` : (phone ? phone.trim() : 'Sin contacto'));
  const finalName = fullName ? fullName.trim() : (cleanUsername ? `@${cleanUsername}` : 'Cliente WhatsApp');

  const newCustomer = await prisma.customer.create({
    data: {
      fullName: finalName,
      phone: finalContact,
      address: address ? address.trim() : 'Fonseca',
      neighborhood: neighborhood ? neighborhood.trim() : null,
      notes: notes ? notes.trim() : null,
      isActive: true,
    },
  });

  if (targetJid) {
    await prisma.chatConversation.updateMany({
      where: {
        remoteJid: targetJid,
        customerId: null,
      },
      data: { customerId: newCustomer.id },
    }).catch(() => {});
  }

  return newCustomer;
};

/**
 * Obtener clientes con métricas calculadas y ordenamiento jerárquico
 */
export const getCustomers = async (query: CustomersQueryInput) => {
  const { search, includeInactive, batchId, lite } = query;

  const whereClause: any = {};
  if (includeInactive !== 'true') {
    whereClause.isActive = true;
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim();
    whereClause.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      {
        conversations: {
          some: {
            OR: [
              { contactName: { contains: q, mode: 'insensitive' } },
              { remoteJid: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  if (lite === 'true') {
    return prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        phone: true,
        address: true,
        neighborhood: true,
        isActive: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  if (batchId && typeof batchId === 'string' && batchId !== 'ALL' && batchId.trim() !== '') {
    const bId = Number(batchId);
    if (!isNaN(bId)) {
      whereClause.orders = {
        some: {
          OR: [
            { batchId: bId },
            { items: { some: { batchId: bId } } },
          ],
        },
      };
    }
  }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      orders: {
        select: {
          id: true,
          orderNumber: true,
          batchId: true,
          totalLiters: true,
          totalAmount: true,
          paidAmount: true,
          pendingAmount: true,
          paymentStatus: true,
          deliveryStatus: true,
          orderDate: true,
          notes: true,
          batch: {
            select: {
              id: true,
              batchCode: true,
              flavor: true,
            },
          },
        },
        orderBy: { orderDate: 'desc' },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  const customersWithStats = customers.map((c) => {
    const totalOrders = c.orders.length;
    const totalLiters = c.orders.reduce((acc, o) => acc + o.totalLiters, 0);
    const totalSpent = c.orders.reduce((acc, o) => acc + o.totalAmount, 0);

    const uniqueBatchesMap = new Map();
    c.orders.forEach((o) => {
      if (o.batch) {
        uniqueBatchesMap.set(o.batch.id, {
          id: o.batch.id,
          batchCode: o.batch.batchCode,
          flavor: o.batch.flavor,
        });
      }
    });
    const customerBatches = Array.from(uniqueBatchesMap.values());

    const deliveredOrders = c.orders.filter((o) => o.deliveryStatus === 'DELIVERED');
    const deliveredPendingDebt = deliveredOrders.reduce(
      (acc, o) => acc + (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - o.paidAmount)),
      0
    );

    const inProcessOrders = c.orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
    const inProcessPendingAmount = inProcessOrders.reduce(
      (acc, o) => acc + (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - o.paidAmount)),
      0
    );
    const inProcessPaidCount = inProcessOrders.filter(
      (o) => o.paymentStatus === 'PAID' || o.totalAmount - o.paidAmount <= 0
    ).length;

    const totalPendingAmount = deliveredPendingDebt + inProcessPendingAmount;

    const latestOrderWithNotes = c.orders.find((o) => o.notes && o.notes.trim().length > 0);
    const latestOrderNotes = latestOrderWithNotes?.notes ? latestOrderWithNotes.notes.trim() : null;
    const latestOrderNumber = latestOrderWithNotes ? latestOrderWithNotes.orderNumber : null;
    const latestOrderDate = c.orders[0] ? c.orders[0].orderDate : null;

    return {
      id: c.id,
      fullName: c.fullName,
      phone: c.phone,
      address: c.address,
      neighborhood: c.neighborhood,
      notes: c.notes,
      latestOrderNotes,
      latestOrderNumber,
      latestOrderDate,
      isActive: c.isActive,
      totalOrders,
      totalLiters,
      totalSpent,
      deliveredPendingDebt,
      inProcessPendingAmount,
      inProcessOrdersCount: inProcessOrders.length,
      inProcessPaidCount,
      pendingDebt: deliveredPendingDebt,
      totalPendingAmount,
      batches: customerBatches,
      createdAt: c.createdAt,
    };
  });

  // Ordenar jerárquicamente por prioridad de cobro y atención
  const getCustomerRank = (c: any): number => {
    if (c.deliveredPendingDebt > 0) return 1;
    if (c.inProcessOrdersCount > 0 && c.inProcessPendingAmount <= 0) return 2;
    if (c.inProcessPendingAmount > 0) return 3;
    return 4;
  };

  customersWithStats.sort((a, b) => {
    const rankA = getCustomerRank(a);
    const rankB = getCustomerRank(b);
    if (rankA !== rankB) return rankA - rankB;

    if (rankA === 1) return b.deliveredPendingDebt - a.deliveredPendingDebt;
    if (rankA === 3) return b.inProcessPendingAmount - a.inProcessPendingAmount;

    return a.fullName.localeCompare(b.fullName);
  });

  return customersWithStats;
};

/**
 * Obtener detalle de un cliente con historial completo
 */
export const getCustomerById = async (id: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          batch: {
            select: {
              id: true,
              batchCode: true,
              flavor: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'asc' },
          },
          items: true,
        },
        orderBy: { orderDate: 'desc' },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Cliente no encontrado');
  }

  return customer;
};

/**
 * Crear o actualizar cliente
 */
export const createOrUpdateCustomer = async (data: CreateOrUpdateCustomerInput) => {
  const { id, fullName, phone, whatsappUsername, address, neighborhood, notes } = data;

  const cleanUsername = normalizeWhatsAppUsername(whatsappUsername);
  const cleanPhone = phone ? phone.trim() : (cleanUsername ? `@${cleanUsername}` : '');

  if (!fullName || !cleanPhone) {
    throw new BadRequestError('Nombre y teléfono o usuario de WhatsApp son obligatorios');
  }

  if (id) {
    const existing = await prisma.customer.findUnique({ where: { id: Number(id) } });
    if (!existing) throw new NotFoundError('Cliente no encontrado');

    return prisma.customer.update({
      where: { id: Number(id) },
      data: {
        fullName: fullName.trim(),
        phone: cleanPhone,
        address: address ? address.trim() : '',
        neighborhood: neighborhood ? neighborhood.trim() : null,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
    });
  }

  return prisma.customer.create({
    data: {
      fullName: fullName.trim(),
      phone: cleanPhone,
      address: address ? address.trim() : '',
      neighborhood: neighborhood ? neighborhood.trim() : null,
      notes: notes ? notes.trim() : null,
      isActive: true,
    },
  });
};

/**
 * Actualizar cliente existente
 */
export const updateCustomer = async (id: number, data: UpdateCustomerInput) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Cliente no encontrado');
  }

  const { fullName, phone, whatsappUsername, address, neighborhood, notes, isActive } = data;
  const cleanUsername = normalizeWhatsAppUsername(whatsappUsername);
  const cleanPhone = phone !== undefined ? phone.trim() : (cleanUsername ? `@${cleanUsername}` : undefined);

  return prisma.customer.update({
    where: { id },
    data: {
      fullName: fullName !== undefined ? fullName.trim() : undefined,
      phone: cleanPhone,
      address: address !== undefined ? (address ? address.trim() : '') : undefined,
      neighborhood: neighborhood !== undefined ? (neighborhood ? neighborhood.trim() : null) : undefined,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
  });
};

/**
 * Desactivar cliente (soft-delete para proteger historial)
 */
export const deleteCustomer = async (id: number) => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Cliente no encontrado');
  }

  await prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });

  return { message: 'Cliente desactivado correctamente', id };
};

/**
 * Generar enlace de cobro o contacto por WhatsApp (con soporte @username)
 */
export const getCustomerWhatsAppLink = async (id: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { orderDate: 'desc' },
        take: 5,
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Cliente no encontrado');
  }

  const deliveredOrders = customer.orders.filter((o) => o.deliveryStatus === 'DELIVERED');
  const deliveredPendingDebt = deliveredOrders.reduce((sum, o) => sum + o.pendingAmount, 0);

  const inProcessOrders = customer.orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
  const inProcessPendingAmount = inProcessOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
  const inProcessPaidOrders = inProcessOrders.filter((o) => o.paymentStatus === 'PAID' || o.pendingAmount <= 0);

  const rawPhone = (customer.phone || '').trim();
  if (!rawPhone) {
    throw new BadRequestError('El cliente no tiene teléfono o usuario registrado');
  }

  const formatCOPStr = (val: number) => `$${new Intl.NumberFormat('es-CO').format(val)} COP`;

  let msg = '';
  if (deliveredPendingDebt > 0) {
    msg = `¡Hola ${customer.fullName}! 🥛✨ Te saludamos cordialmente de *YogurArte*.\n\nEsperamos que estés disfrutando de nuestros deliciosos yogures artesanales 100% naturales.\n\nTe recordamos con mucho aprecio que presentas un saldo pendiente de *${formatCOPStr(deliveredPendingDebt)}* de tu pedido entregado.\n\nSi ya realizaste la transferencia, por favor compártenos el comprobante por este medio. ¡Muchísimas gracias por tu preferencia y apoyo continuo! 🙌🐄`;
  } else if (inProcessPaidOrders.length > 0) {
    msg = `¡Hola ${customer.fullName}! 🥛✨ Te saludamos con mucho cariño de parte del equipo de *YogurArte*.\n\n🎉 ¡Confirmamos que recibimos con éxito el pago de tu pedido! Muchísimas gracias por tu compra y confianza en nuestro producto 100% natural. 🥣🍓\n\nTu pedido está en preparación y te avisaremos en cuanto vaya en camino para la entrega. 🛵💨 ¡Que tengas un día maravilloso! 🙌🐄✨`;
  } else if (inProcessPendingAmount > 0) {
    msg = `¡Hola ${customer.fullName}! 🥛✨ Te saludamos de *YogurArte*.\n\nTu pedido de yogur artesanal 100% natural está siendo preparado con todo el cuidado. Te avisaremos apenas esté listo para entrega. ¡Gracias por tu encargo! 🥣🍓`;
  } else {
    msg = `¡Hola ${customer.fullName}! 🥛✨ Te saludamos de *YogurArte*.\n\n¿Te gustaría ordenar más de nuestros deliciosos yogures artesanales 100% naturales? Estamos atentos a tus pedidos. 🍓🍑🍇`;
  }

  const whatsappUrl = buildWhatsAppUrl(rawPhone, msg);

  return {
    whatsappUrl,
    rawMessage: msg,
    message: msg,
    phone: rawPhone,
    deliveredPendingDebt,
    inProcessPendingAmount,
  };
};

/**
 * Aplicar abono o pago en cascada atómico a pedidos del cliente ($transaction)
 */
export const applyCustomerPayment = async (id: number, data: ApplyCustomerPaymentInput) => {
  const { amount, orderId, paymentMethod, notes, registeredBy } = data;

  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    throw new BadRequestError('El monto a abonar o pagar debe ser mayor a cero');
  }

  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { orderDate: 'asc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Cliente no encontrado');
    }

    if (!customer.orders || customer.orders.length === 0) {
      throw new BadRequestError(
        'Este cliente no tiene ningún pedido registrado en el sistema. Crea un pedido primero.'
      );
    }

    let remainingToPay = paymentAmount;
    const updatedOrders: any[] = [];
    const createdPayments: any[] = [];

    const now = new Date();
    const effectivePaymentMethod = paymentMethod ? String(paymentMethod).trim() : 'EFECTIVO';
    const effectiveRegisteredBy = registeredBy ? String(registeredBy).trim() : 'Edier';

    if (orderId && orderId !== 'AUTO') {
      const targetOrder = customer.orders.find((o) => o.id === Number(orderId));
      if (!targetOrder) {
        throw new NotFoundError('Pedido seleccionado no encontrado');
      }

      const apply = remainingToPay;
      const newPaid = (targetOrder.paidAmount || 0) + apply;
      const newPending = Math.max(0, targetOrder.totalAmount - newPaid);
      const newStatus = newPaid >= targetOrder.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');

      const paymentNote = `Abono: $${new Intl.NumberFormat('es-CO').format(apply)} (${effectivePaymentMethod}) por ${effectiveRegisteredBy}`;
      const updatedNotes = notes
        ? `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}${notes} [${paymentNote}]`
        : `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}${paymentNote}`;

      const newPayment = await tx.orderPayment.create({
        data: {
          orderId: targetOrder.id,
          amount: apply,
          paymentMethod: effectivePaymentMethod,
          paymentDate: now,
          notes: notes ? String(notes).trim() : null,
          registeredBy: effectiveRegisteredBy,
        },
      });
      createdPayments.push(newPayment);

      const updated = await tx.order.update({
        where: { id: targetOrder.id },
        data: {
          paidAmount: newPaid,
          pendingAmount: newPending,
          paymentStatus: newStatus,
          notes: updatedNotes,
        },
      });
      updatedOrders.push(updated);
      remainingToPay = 0;
    } else {
      // Modo AUTOMÁTICO en cascada (del pedido más antiguo al más reciente)
      const debtOrders = customer.orders.filter((o) => {
        const ordPending = o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0));
        return ordPending > 0;
      });

      const sortedDebtOrders = [...debtOrders].sort((a, b) => {
        const timeDiff = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id - b.id;
      });

      for (const ord of sortedDebtOrders) {
        if (remainingToPay <= 0) break;
        const ordPending = ord.pendingAmount > 0 ? ord.pendingAmount : Math.max(0, ord.totalAmount - (ord.paidAmount || 0));
        if (ordPending <= 0) continue;

        const apply = Math.min(remainingToPay, ordPending);
        const newPaid = (ord.paidAmount || 0) + apply;
        const newPending = Math.max(0, ord.totalAmount - newPaid);
        const newStatus = newPaid >= ord.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');

        ord.paidAmount = newPaid;
        ord.pendingAmount = newPending;

        const paymentNote = `Abono: $${new Intl.NumberFormat('es-CO').format(apply)} (${effectivePaymentMethod}) por ${effectiveRegisteredBy}`;
        const updatedNotes = notes
          ? `${ord.notes ? ord.notes + ' | ' : ''}${notes} [${paymentNote}]`
          : `${ord.notes ? ord.notes + ' | ' : ''}${paymentNote}`;

        const newPayment = await tx.orderPayment.create({
          data: {
            orderId: ord.id,
            amount: apply,
            paymentMethod: effectivePaymentMethod,
            paymentDate: now,
            notes: notes ? String(notes).trim() : null,
            registeredBy: effectiveRegisteredBy,
          },
        });
        createdPayments.push(newPayment);

        const updated = await tx.order.update({
          where: { id: ord.id },
          data: {
            paidAmount: newPaid,
            pendingAmount: newPending,
            paymentStatus: newStatus,
            notes: updatedNotes,
          },
        });
        updatedOrders.push(updated);
        remainingToPay -= apply;
      }

      // Si aún queda dinero por aplicar, abonar al pedido más reciente
      if (remainingToPay > 0 && customer.orders.length > 0) {
        const lastOrder = customer.orders[customer.orders.length - 1];
        const apply = remainingToPay;
        const currentPaid = lastOrder.paidAmount || 0;
        const newPaid = currentPaid + apply;
        const newPending = Math.max(0, lastOrder.totalAmount - newPaid);
        const newStatus = newPaid >= lastOrder.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');

        lastOrder.paidAmount = newPaid;
        lastOrder.pendingAmount = newPending;

        const paymentNote = `Abono / Anticipo: $${new Intl.NumberFormat('es-CO').format(apply)} (${effectivePaymentMethod}) por ${effectiveRegisteredBy}`;
        const updatedNotes = notes
          ? `${lastOrder.notes ? lastOrder.notes + ' | ' : ''}${notes} [${paymentNote}]`
          : `${lastOrder.notes ? lastOrder.notes + ' | ' : ''}${paymentNote}`;

        const newPayment = await tx.orderPayment.create({
          data: {
            orderId: lastOrder.id,
            amount: apply,
            paymentMethod: effectivePaymentMethod,
            paymentDate: now,
            notes: notes ? String(notes).trim() : null,
            registeredBy: effectiveRegisteredBy,
          },
        });
        createdPayments.push(newPayment);

        const existingIdx = updatedOrders.findIndex((o) => o.id === lastOrder.id);
        const updated = await tx.order.update({
          where: { id: lastOrder.id },
          data: {
            paidAmount: newPaid,
            pendingAmount: newPending,
            paymentStatus: newStatus,
            notes: updatedNotes,
          },
        });

        if (existingIdx >= 0) {
          updatedOrders[existingIdx] = updated;
        } else {
          updatedOrders.push(updated);
        }
        remainingToPay = 0;
      }
    }

    return {
      message: 'Abono / pago registrado correctamente',
      totalPaid: paymentAmount,
      applied: paymentAmount - remainingToPay,
      updatedOrders,
      payments: createdPayments,
    };
  });
};
