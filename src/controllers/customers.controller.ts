import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { buildWhatsAppUrl } from '../utils/whatsapp.utils.js';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { search, includeInactive, batchId, lite } = req.query;

    const whereClause: any = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim() } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (lite === 'true') {
      const liteCustomers = await prisma.customer.findMany({
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
      return res.json(liteCustomers);
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

      // Extraer lotes únicos en los que el cliente ha comprado
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

      // Deuda real: solo pedidos ENTREGADOS y no pagados
      const deliveredOrders = c.orders.filter((o) => o.deliveryStatus === 'DELIVERED');
      const deliveredPendingDebt = deliveredOrders.reduce((acc, o) => acc + (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - o.paidAmount)), 0);

      // Pedidos en proceso (no entregados aún)
      const inProcessOrders = c.orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
      const inProcessPendingAmount = inProcessOrders.reduce((acc, o) => acc + (o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - o.paidAmount)), 0);
      const inProcessPaidCount = inProcessOrders.filter((o) => o.paymentStatus === 'PAID' || (o.totalAmount - o.paidAmount) <= 0).length;

      const totalPendingAmount = deliveredPendingDebt + inProcessPendingAmount;

      // Obtener la última nota de pedido si existe
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
        deliveredPendingDebt, // Deuda real de pedidos entregados
        inProcessPendingAmount, // Encargos en preparación / por entregar
        inProcessOrdersCount: inProcessOrders.length,
        inProcessPaidCount,
        pendingDebt: deliveredPendingDebt, // Deuda real
        totalPendingAmount,
        batches: customerBatches,
        createdAt: c.createdAt,
      };
    });

    // Ordenar jerárquicamente:
    // 1. Primero los que tienen deuda de pedidos YA ENTREGADOS (deuda real, de mayor a menor)
    // 2. Luego los que tienen pedidos PAGADOS PENDIENTES DE ENTREGA (compromisos pagados)
    // 3. Luego los que tienen pedidos encargados en proceso (sin entregar ni pagar)
    // 4. Finalmente los que están completamente al día sin pedidos pendientes (alfabético)
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

    res.json(customersWithStats);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

export const getCustomerWhatsAppLink = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const deliveredOrders = customer.orders.filter((o) => o.deliveryStatus === 'DELIVERED');
    const deliveredPendingDebt = deliveredOrders.reduce((sum, o) => sum + o.pendingAmount, 0);

    const inProcessOrders = customer.orders.filter((o) => o.deliveryStatus !== 'DELIVERED');
    const inProcessPendingAmount = inProcessOrders.reduce((sum, o) => sum + o.pendingAmount, 0);
    const inProcessPaidOrders = inProcessOrders.filter((o) => o.paymentStatus === 'PAID' || o.pendingAmount <= 0);

    const rawPhone = (customer.phone || '').trim();
    if (!rawPhone) {
      return res.status(400).json({ error: 'El cliente no tiene teléfono o usuario registrado' });
    }

    const isUsername = rawPhone.startsWith('@') || /[a-zA-Z]/.test(rawPhone);
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

    res.json({ whatsappUrl, message: msg, deliveredPendingDebt, inProcessPendingAmount });
  } catch (error) {
    console.error('Error generating customer whatsapp link:', error);
    res.status(500).json({ error: 'Error al generar enlace de WhatsApp' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
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
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer by id:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

export const createOrUpdateCustomer = async (req: Request, res: Response) => {
  try {
    const { id, fullName, phone, address, neighborhood, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
    }

    if (id) {
      const updated = await prisma.customer.update({
        where: { id: Number(id) },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address ? address.trim() : '',
          neighborhood: neighborhood ? neighborhood.trim() : null,
          notes: notes ? notes.trim() : null,
          isActive: true,
        },
      });
      return res.json(updated);
    }

    const created = await prisma.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address ? address.trim() : '',
        neighborhood: neighborhood ? neighborhood.trim() : null,
        notes: notes ? notes.trim() : null,
        isActive: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    res.status(500).json({ error: 'Error al guardar cliente' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, address, neighborhood, notes, isActive } = req.body;

    const updated = await prisma.customer.update({
      where: { id: Number(id) },
      data: {
        fullName: fullName !== undefined ? fullName.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        neighborhood: neighborhood !== undefined ? neighborhood.trim() : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Desactivar cliente (soft-delete para proteger historial de pedidos)
    await prisma.customer.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    res.json({ message: 'Cliente desactivado correctamente', id: Number(id) });
  } catch (error) {
    console.error('Error deactivating customer:', error);
    res.status(500).json({ error: 'Error al desactivar cliente' });
  }
};

export const applyCustomerPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, orderId, paymentMethod, notes, registeredBy } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'El monto a abonar o pagar debe ser mayor a cero' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: Number(id) },
      include: {
        orders: {
          orderBy: { orderDate: 'asc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Calcular pendiente real de cada pedido
    let pendingOrders = (customer.orders || []).filter((o) => {
      const pending = o.pendingAmount > 0 ? o.pendingAmount : Math.max(0, o.totalAmount - (o.paidAmount || 0));
      return pending > 0 || o.paymentStatus !== 'PAID';
    });

    if (customer.orders.length === 0) {
      return res.status(400).json({ error: 'Este cliente no tiene ningún pedido registrado en el sistema. Crea un pedido primero.' });
    }

    if (pendingOrders.length === 0) {
      // Si todos están al día, usar los pedidos existentes (el más reciente) para aplicar el pago
      pendingOrders = [customer.orders[customer.orders.length - 1]];
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
        return res.status(404).json({ error: 'Pedido seleccionado no encontrado' });
      }

      const currentPending = targetOrder.pendingAmount > 0 ? targetOrder.pendingAmount : Math.max(0, targetOrder.totalAmount - targetOrder.paidAmount);
      if (currentPending <= 0 && targetOrder.paymentStatus === 'PAID') {
        return res.status(400).json({ error: 'El pedido seleccionado ya está completamente pagado' });
      }

      const apply = Math.min(remainingToPay, currentPending > 0 ? currentPending : targetOrder.totalAmount);
      const newPaid = targetOrder.paidAmount + apply;
      const newPending = Math.max(0, targetOrder.totalAmount - newPaid);
      const newStatus = newPaid >= targetOrder.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');

      const paymentNote = `Abono: $${new Intl.NumberFormat('es-CO').format(apply)} (${effectivePaymentMethod}) por ${effectiveRegisteredBy}`;
      const updatedNotes = notes ? `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}${notes} [${paymentNote}]` : `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}${paymentNote}`;

      // Crear registro de OrderPayment
      const newPayment = await prisma.orderPayment.create({
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

      const updated = await prisma.order.update({
        where: { id: targetOrder.id },
        data: {
          paidAmount: newPaid,
          pendingAmount: newPending,
          paymentStatus: newStatus,
          notes: updatedNotes,
        },
      });
      updatedOrders.push(updated);
      remainingToPay -= apply;
    } else {
      // Ordenar pedidos pendientes:
      // 1. Pedidos ENTREGADOS primero (deuda real prioritaria)
      // 2. Por fecha más antigua a más reciente
      const sortedOrders = [...pendingOrders].sort((a, b) => {
        if (a.deliveryStatus === 'DELIVERED' && b.deliveryStatus !== 'DELIVERED') return -1;
        if (b.deliveryStatus === 'DELIVERED' && a.deliveryStatus !== 'DELIVERED') return 1;
        return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      });

      for (const ord of sortedOrders) {
        if (remainingToPay <= 0) break;
        const ordPending = ord.pendingAmount > 0 ? ord.pendingAmount : Math.max(0, ord.totalAmount - ord.paidAmount);
        if (ordPending <= 0) continue;

        const apply = Math.min(remainingToPay, ordPending);
        const newPaid = ord.paidAmount + apply;
        const newPending = Math.max(0, ord.totalAmount - newPaid);
        const newStatus = newPaid >= ord.totalAmount ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'PENDING');

        const paymentNote = `Abono: $${new Intl.NumberFormat('es-CO').format(apply)} (${effectivePaymentMethod}) por ${effectiveRegisteredBy}`;
        const updatedNotes = notes ? `${ord.notes ? ord.notes + ' | ' : ''}${notes} [${paymentNote}]` : `${ord.notes ? ord.notes + ' | ' : ''}${paymentNote}`;

        // Crear registro de OrderPayment
        const newPayment = await prisma.orderPayment.create({
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

        const updated = await prisma.order.update({
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
    }

    res.json({
      message: 'Abono / pago registrado correctamente',
      totalPaid: paymentAmount,
      applied: paymentAmount - remainingToPay,
      updatedOrders,
      payments: createdPayments,
    });
  } catch (error) {
    console.error('Error applying customer payment:', error);
    res.status(500).json({ error: 'Error al registrar el pago del cliente' });
  }
};

