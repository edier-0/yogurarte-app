import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const {
      search,
      paymentStatus,
      deliveryStatus,
      debtCategory, // 'DELIVERED_DEBT' | 'IN_PROCESS' | 'PAID' | 'ALL'
      sortBy, // 'UPDATED_DESC' | 'PRIORITY_DEBT' | 'DATE_DESC' | 'DATE_ASC'
      startDate,
      endDate,
      month, // formato YYYY-MM
      date, // formato YYYY-MM-DD
      batchId, // ID del lote
      limit,
    } = req.query;

    const conditions: any[] = [];

    if (batchId && typeof batchId === 'string' && batchId !== 'ALL' && batchId.trim() !== '') {
      const bId = Number(batchId);
      if (!isNaN(bId)) {
        conditions.push({
          OR: [
            { batchId: bId },
            { items: { some: { batchId: bId } } },
          ],
        });
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      conditions.push({
        OR: [
          { customer: { fullName: { contains: q, mode: 'insensitive' } } },
          { customer: { phone: { contains: q, mode: 'insensitive' } } },
          { deliveryAddress: { contains: q, mode: 'insensitive' } },
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { flavor: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (debtCategory === 'DELIVERED_DEBT') {
      conditions.push({
        deliveryStatus: 'DELIVERED',
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      });
    } else if (debtCategory === 'PAID_NOT_DELIVERED' || debtCategory === 'PAID_PENDING_DELIVERY') {
      conditions.push({
        deliveryStatus: { not: 'DELIVERED' },
        paymentStatus: 'PAID',
      });
    } else if (debtCategory === 'IN_PROCESS') {
      conditions.push({
        deliveryStatus: { not: 'DELIVERED' },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      });
    } else if (debtCategory === 'PAID') {
      conditions.push({ paymentStatus: 'PAID' });
    }

    if (paymentStatus && typeof paymentStatus === 'string' && paymentStatus !== 'ALL') {
      conditions.push({ paymentStatus });
    }

    if (deliveryStatus && typeof deliveryStatus === 'string' && deliveryStatus !== 'ALL') {
      conditions.push({ deliveryStatus });
    }

    if (date && typeof date === 'string') {
      const cleanDate = date.split('T')[0];
      const dayStart = new Date(`${cleanDate}T00:00:00.000Z`);
      const dayEnd = new Date(`${cleanDate}T23:59:59.999Z`);
      const dayRange = { gte: dayStart, lte: dayEnd };
      conditions.push({
        OR: [
          { deliveryDate: dayRange },
          {
            AND: [
              { deliveryDate: null },
              { orderDate: dayRange },
            ],
          },
        ],
      });
    } else if (month && typeof month === 'string') {
      const [year, m] = month.split('-').map(Number);
      if (year && m) {
        const startOfMonth = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));
        conditions.push({
          OR: [
            { orderDate: { gte: startOfMonth, lte: endOfMonth } },
            { deliveryDate: { gte: startOfMonth, lte: endOfMonth } },
          ],
        });
      }
    } else if (startDate || endDate) {
      const dateRange: any = {};
      if (startDate) {
        dateRange.gte = new Date(`${String(startDate).split('T')[0]}T00:00:00.000Z`);
      }
      if (endDate) {
        dateRange.lte = new Date(`${String(endDate).split('T')[0]}T23:59:59.999Z`);
      }
      conditions.push({
        OR: [
          { orderDate: dateRange },
          { deliveryDate: dateRange },
        ],
      });
    }

    const whereClause = conditions.length > 0 ? { AND: conditions } : {};

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: true,
        batch: {
          select: {
            id: true,
            batchCode: true,
            flavor: true,
            price1L: true,
            price2L: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit ? Number(limit) : undefined,
    });

    if (sortBy === 'UPDATED_DESC') {
      orders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === 'DATE_ASC') {
      orders.sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
    } else if (sortBy === 'DATE_DESC') {
      orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    } else {
      // Ordenar jerárquicamente:
      // 1. Pedidos ENTREGADOS y NO PAGADOS (Deuda real de cobro inmediato)
      // 2. Pedidos YA PAGADOS pero NO ENTREGADOS (Compromiso de entrega prioritario)
      // 3. Pedidos ENCARGADOS / EN PROCESO (Pendientes de entrega y pago)
      // 4. Pedidos COMPLETADOS (Entregados y Pagados al día)
      const getOrderPriorityRank = (o: any): number => {
        const isDelivered = o.deliveryStatus === 'DELIVERED';
        const isPaid = o.paymentStatus === 'PAID';

        if (isDelivered && !isPaid) return 1; // 1. Deuda entregada
        if (!isDelivered && isPaid) return 2; // 2. Ya pagaron, falta entregar
        if (!isDelivered && !isPaid) return 3; // 3. Encargos en proceso
        return 4; // 4. Entregado y pagado
      };

      orders.sort((a, b) => {
        const rankA = getOrderPriorityRank(a);
        const rankB = getOrderPriorityRank(b);
        if (rankA !== rankB) return rankA - rankB;

        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        items: true,
        batch: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order by id:', error);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      customerNeighborhood,
      batchId, // ID opcional del lote de producción
      items, // Array de { bottleSize, flavor, quantity, unitPrice, batchId }
      bottleSize, // legacy fallback
      quantityBottles, // legacy fallback
      totalLiters, // legacy fallback
      flavor, // legacy fallback
      unitPrice, // legacy fallback
      totalAmount,
      paidAmount,
      paymentMethod,
      deliveryStatus,
      orderDate,
      deliveryDate,
      deliveryAddress,
      notes,
      registeredBy,
    } = req.body;

    let finalCustomerId = customerId ? Number(customerId) : null;

    // Crear o buscar cliente si se pasa información de contacto
    if (!finalCustomerId && customerPhone) {
      const cleanPhone = customerPhone.trim();
      const existingCustomer = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
        if (customerAddress && !existingCustomer.address) {
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: { address: customerAddress.trim() },
          });
        }
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            fullName: (customerName || 'Cliente').trim(),
            phone: cleanPhone,
            address: (customerAddress || 'Fonseca').trim(),
            neighborhood: customerNeighborhood ? customerNeighborhood.trim() : null,
          },
        });
        finalCustomerId = newCustomer.id;
      }
    }

    if (!finalCustomerId) {
      return res.status(400).json({ error: 'Se requiere información del cliente para registrar el pedido' });
    }

    // Procesar ítems múltiples del pedido
    const parsedBatchId = batchId ? Number(batchId) : null;

    let parsedItems: Array<{
      batchId?: number | null;
      bottleSize: string;
      flavor: string;
      quantity: number;
      litersPerUnit: number;
      totalLiters: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items.map((item) => {
        const size = item.bottleSize || '1L';
        const qty = Number(item.quantity) || 1;
        const litersPerUnit = size === '2L' ? 2.0 : 1.0;
        const itemUnitPrice = Number(item.unitPrice) || (size === '2L' ? 20000 : 10000);
        return {
          batchId: item.batchId ? Number(item.batchId) : parsedBatchId,
          bottleSize: size,
          flavor: (item.flavor || 'Natural').trim(),
          quantity: qty,
          litersPerUnit,
          totalLiters: qty * litersPerUnit,
          unitPrice: itemUnitPrice,
          totalPrice: qty * itemUnitPrice,
        };
      });
    } else {
      // Fallback a ítem único
      const size = bottleSize || '1L';
      const qty = Number(quantityBottles) || 1;
      const litersPerUnit = size === '2L' ? 2.0 : 1.0;
      const price = Number(unitPrice) || (size === '2L' ? 20000 : 10000);
      parsedItems = [
        {
          batchId: parsedBatchId,
          bottleSize: size,
          flavor: (flavor || 'Natural').trim(),
          quantity: qty,
          litersPerUnit,
          totalLiters: qty * litersPerUnit,
          unitPrice: price,
          totalPrice: qty * price,
        },
      ];
    }

    // Calcular totales acumulados
    const totalLitersCalculated = parsedItems.reduce((sum, i) => sum + i.totalLiters, 0);
    const totalQuantityBottles = parsedItems.reduce((sum, i) => sum + i.quantity, 0);
    const calculatedTotalAmount = totalAmount ? Number(totalAmount) : parsedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const paid = Number(paidAmount || 0);
    const pending = Math.max(0, calculatedTotalAmount - paid);

    let calculatedPaymentStatus = 'PENDING';
    if (paid >= calculatedTotalAmount) {
      calculatedPaymentStatus = 'PAID';
    } else if (paid > 0) {
      calculatedPaymentStatus = 'PARTIAL';
    }

    const flavorSummary = parsedItems.map((i) => `${i.quantity}x ${i.flavor} (${i.bottleSize})`).join(', ');
    const bottleSizeSummary = parsedItems.every((i) => i.bottleSize === parsedItems[0].bottleSize)
      ? parsedItems[0].bottleSize
      : 'MIXTO';

    // Generar consecutivo de pedido único (PED-YYYYMMDD-001)
    const dateObj = orderDate ? new Date(`${String(orderDate).split('T')[0]}T12:00:00.000Z`) : new Date();
    const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
    
    const todayOrders = await prisma.order.findMany({
      where: {
        orderNumber: {
          startsWith: `PED-${dateStr}`,
        },
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
    let orderNumber = `PED-${dateStr}-${String(nextSeq).padStart(3, '0')}`;

    while (await prisma.order.findUnique({ where: { orderNumber } })) {
      nextSeq++;
      orderNumber = `PED-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: finalCustomerId,
        batchId: parsedBatchId,
        bottleSize: bottleSizeSummary,
        quantityBottles: totalQuantityBottles,
        totalLiters: totalLitersCalculated,
        flavor: flavorSummary,
        unitPrice: parsedItems[0]?.unitPrice || 10000,
        totalAmount: calculatedTotalAmount,
        paidAmount: paid,
        pendingAmount: pending,
        paymentStatus: calculatedPaymentStatus,
        paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
        deliveryStatus: deliveryStatus || 'PENDING',
        orderDate: dateObj,
        deliveryDate: deliveryDate ? new Date(`${String(deliveryDate).split('T')[0]}T12:00:00.000Z`) : null,
        deliveryAddress: deliveryAddress ? deliveryAddress.trim() : (customerAddress ? customerAddress.trim() : 'Fonseca'),
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
        items: {
          create: parsedItems.map((i) => ({
            batchId: i.batchId || parsedBatchId,
            bottleSize: i.bottleSize,
            flavor: i.flavor,
            quantity: i.quantity,
            litersPerUnit: i.litersPerUnit,
            totalLiters: i.totalLiters,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
        batch: true,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerNeighborhood,
      batchId, // ID opcional del lote
      items, // Array de ítems actualizados
      bottleSize,
      quantityBottles,
      totalLiters,
      flavor,
      unitPrice,
      totalAmount,
      paidAmount,
      paymentStatus,
      paymentMethod,
      deliveryStatus,
      orderDate,
      deliveryDate,
      deliveryAddress,
      notes,
    } = req.body;

    const currentOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { customer: true, items: true },
    });

    if (!currentOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const parsedBatchId = batchId !== undefined ? (batchId ? Number(batchId) : null) : currentOrder.batchId;

    // 1. Actualizar cliente si se proporcionaron datos
    if (customerName || customerPhone || customerAddress) {
      await prisma.customer.update({
        where: { id: currentOrder.customerId },
        data: {
          fullName: customerName ? customerName.trim() : undefined,
          phone: customerPhone ? customerPhone.trim() : undefined,
          address: customerAddress ? customerAddress.trim() : undefined,
          neighborhood: customerNeighborhood ? customerNeighborhood.trim() : undefined,
        },
      });
    }

    // 2. Si vienen ítems múltiples, procesar y reemplazar
    let updatedLiters = currentOrder.totalLiters;
    let updatedQuantity = currentOrder.quantityBottles;
    let updatedTotal = currentOrder.totalAmount;
    let updatedFlavor = currentOrder.flavor;
    let updatedBottleSize = currentOrder.bottleSize;

    if (Array.isArray(items) && items.length > 0) {
      const parsedItems = items.map((item) => {
        const size = item.bottleSize || '1L';
        const qty = Number(item.quantity) || 1;
        const litersPerUnit = size === '2L' ? 2.0 : 1.0;
        const itemUnitPrice = Number(item.unitPrice) || (size === '2L' ? 20000 : 10000);
        return {
          batchId: item.batchId ? Number(item.batchId) : parsedBatchId,
          bottleSize: size,
          flavor: (item.flavor || 'Natural').trim(),
          quantity: qty,
          litersPerUnit,
          totalLiters: qty * litersPerUnit,
          unitPrice: itemUnitPrice,
          totalPrice: qty * itemUnitPrice,
        };
      });

      updatedLiters = parsedItems.reduce((sum, i) => sum + i.totalLiters, 0);
      updatedQuantity = parsedItems.reduce((sum, i) => sum + i.quantity, 0);
      updatedTotal = parsedItems.reduce((sum, i) => sum + i.totalPrice, 0);
      updatedFlavor = parsedItems.map((i) => `${i.quantity}x ${i.flavor} (${i.bottleSize})`).join(', ');
      updatedBottleSize = parsedItems.every((i) => i.bottleSize === parsedItems[0].bottleSize)
        ? parsedItems[0].bottleSize
        : 'MIXTO';

      // Reemplazar ítems en base de datos
      await prisma.orderItem.deleteMany({
        where: { orderId: Number(id) },
      });

      await prisma.orderItem.createMany({
        data: parsedItems.map((i) => ({
          orderId: Number(id),
          batchId: i.batchId || parsedBatchId,
          bottleSize: i.bottleSize,
          flavor: i.flavor,
          quantity: i.quantity,
          litersPerUnit: i.litersPerUnit,
          totalLiters: i.totalLiters,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      });
    } else if (totalAmount !== undefined || quantityBottles !== undefined) {
      updatedTotal = totalAmount !== undefined ? Number(totalAmount) : currentOrder.totalAmount;
      updatedQuantity = quantityBottles !== undefined ? Number(quantityBottles) : currentOrder.quantityBottles;
      updatedLiters = totalLiters !== undefined ? Number(totalLiters) : currentOrder.totalLiters;
      updatedFlavor = flavor !== undefined ? flavor.trim() : currentOrder.flavor;
      updatedBottleSize = bottleSize !== undefined ? bottleSize : currentOrder.bottleSize;
    }

    const finalPaid = paidAmount !== undefined ? Number(paidAmount) : currentOrder.paidAmount;
    const finalPending = Math.max(0, updatedTotal - finalPaid);

    let finalPaymentStatus = paymentStatus || currentOrder.paymentStatus;
    if (!paymentStatus && paidAmount !== undefined) {
      if (finalPaid >= updatedTotal) {
        finalPaymentStatus = 'PAID';
      } else if (finalPaid > 0) {
        finalPaymentStatus = 'PARTIAL';
      } else {
        finalPaymentStatus = 'PENDING';
      }
    }

    const updated = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        batchId: parsedBatchId,
        bottleSize: updatedBottleSize,
        quantityBottles: updatedQuantity,
        totalLiters: updatedLiters,
        flavor: updatedFlavor,
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : currentOrder.unitPrice,
        totalAmount: updatedTotal,
        paidAmount: finalPaid,
        pendingAmount: finalPending,
        paymentStatus: finalPaymentStatus,
        paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : currentOrder.paymentMethod,
        deliveryStatus: deliveryStatus || currentOrder.deliveryStatus,
        orderDate: orderDate ? new Date(`${String(orderDate).split('T')[0]}T12:00:00.000Z`) : currentOrder.orderDate,
        deliveryDate: deliveryDate ? new Date(`${String(deliveryDate).split('T')[0]}T12:00:00.000Z`) : currentOrder.deliveryDate,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : (customerAddress ? customerAddress.trim() : currentOrder.deliveryAddress),
        notes: notes !== undefined ? notes : currentOrder.notes,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Pedido eliminado exitosamente', id: Number(id) });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Error al eliminar el pedido' });
  }
};

export const getWhatsAppLink = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'THANK_PAYMENT' | 'ORDER_INFO'
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const rawContact = (order.customer.phone || '').trim();
    const isUsername = rawContact.startsWith('@') || /[a-zA-Z]/.test(rawContact);
    let whatsappPhoneParam = '';

    if (isUsername) {
      whatsappPhoneParam = rawContact.replace(/^@/, '').trim();
    } else {
      let digits = rawContact.replace(/\D/g, '');
      if (!digits.startsWith('57') && digits.length === 10) {
        digits = `57${digits}`;
      }
      whatsappPhoneParam = digits;
    }

    const formatCurrency = (val: number) => `$${new Intl.NumberFormat('es-CO').format(val)} COP`;

    let statusText = '🕒 Pendiente por preparar';
    if (order.deliveryStatus === 'PREPARING') {
      statusText = '🥣 En preparación (elaborando tu yogur fresco)';
    } else if (order.deliveryStatus === 'IN_ROUTE') {
      statusText = '🛵 En camino / En ruta a tu dirección';
    } else if (order.deliveryStatus === 'DELIVERED') {
      statusText = '✅ Entregado';
    }

    let itemsBreakdown = '';
    if (order.items && order.items.length > 0) {
      itemsBreakdown = order.items
        .map((i) => `• ${i.quantity}x Botella ${i.bottleSize} (${i.flavor}) - ${formatCurrency(i.totalPrice)}`)
        .join('\n');
    } else {
      itemsBreakdown = `• ${order.quantityBottles}x Botella ${order.bottleSize} (${order.flavor}) - ${formatCurrency(order.totalAmount)}`;
    }

    const formatOrderDate = (d: Date) => {
      const date = new Date(d);
      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    };

    let dateLine = `📅 *Fecha Pedido:* ${formatOrderDate(order.orderDate)}`;
    if (order.deliveryDate) {
      const dDate = new Date(order.deliveryDate);
      const deliveryFormatted = dDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
      dateLine += `\n🛵 *Entrega Programada:* ${deliveryFormatted}`;
    }

    // 1. Si el pedido ya está ENTREGADO y no se forzó otro tipo: Mensaje especial de agradecimiento y disfrute
    if (order.deliveryStatus === 'DELIVERED' && type !== 'ORDER_INFO') {
      let deliveredMsg = `🥛 *¡Muchas gracias por tu compra en YogurArte!* ✨\n\n`;
      deliveredMsg += `Hola *${order.customer.fullName}*, tu pedido *#${order.orderNumber}* ha sido entregado con éxito. 🎉\n\n`;
      deliveredMsg += `¡Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural! 🍇🍓🥛\n\n`;

      // Solo si debe se incluye el recordatorio de saldo pendiente; si no debe, no se muestra nada
      if (order.pendingAmount > 0) {
        deliveredMsg += `⚠️ *Recordatorio de Pago:*\n`;
        deliveredMsg += `• Saldo pendiente: *${formatCurrency(order.pendingAmount)}*\n`;
        if (order.paidAmount > 0) {
          deliveredMsg += `• Ya abonado: ${formatCurrency(order.paidAmount)}\n`;
        }
        deliveredMsg += `\n`;
      }

      deliveredMsg += `Estamos siempre atentos a cualquier duda o para tu próximo pedido. ¡Que lo disfrutes mucho! 🥛🍇🍓`;

      const encodedMessage = encodeURIComponent(deliveredMsg);
      const whatsappUrl = isUsername
        ? `https://api.whatsapp.com/send/?username=${whatsappPhoneParam}&text=${encodedMessage}&type=username`
        : `https://api.whatsapp.com/send?phone=${whatsappPhoneParam}&text=${encodedMessage}`;

      return res.json({
        whatsappUrl,
        rawMessage: deliveredMsg,
        phone: rawContact,
      });
    }

    // 2. Si el pedido ya está PAGADO pero aún NO entregado y no se pidió solo ORDER_INFO (Confirmación de pago y agradecimiento al estilo YogurArte)
    if (type !== 'ORDER_INFO' && order.deliveryStatus !== 'DELIVERED' && (order.paymentStatus === 'PAID' || order.pendingAmount <= 0)) {
      let paidMsg = `🥛 *¡Pago Recibido con Éxito - YogurArte!* ✨\n\n`;
      paidMsg += `¡Hola *${order.customer.fullName}*! Te saludamos con mucho aprecio y cariño de parte del equipo de *YogurArte*.\n\n`;
      paidMsg += `🎉 Te confirmamos que hemos recibido con éxito tu pago de *${formatCurrency(order.totalAmount)}* para tu pedido *#${order.orderNumber}*. ¡Muchísimas gracias por tu compra y por confiar en nuestro trabajo artesanal! 🙌🐄\n\n`;
      paidMsg += `📦 *Detalle de tu pedido:*\n${itemsBreakdown}\n`;
      paidMsg += `🥤 *Total:* ${order.totalLiters} Litro(s) • ${formatCurrency(order.totalAmount)}\n`;
      paidMsg += `✅ *Estado del Pago:* Totalmente Pagado / Paz y Salvo ✨\n`;
      paidMsg += `🛵 *Estado de Entrega:* ${statusText}\n`;
      paidMsg += `${dateLine}\n\n`;
      paidMsg += `🥣 Tu yogur 100% natural, fresco y sin conservantes está siendo preparado con todo el amor. Te notificaremos apenas nuestro domiciliario vaya en camino hacia tu dirección (${order.deliveryAddress || order.customer.address || 'Fonseca'}). 🍓🍑🛵💨\n\n`;
      paidMsg += `¡Que tengas un día maravilloso! ✨🥛`;

      const encodedMessage = encodeURIComponent(paidMsg);
      const whatsappUrl = isUsername
        ? `https://api.whatsapp.com/send/?username=${whatsappPhoneParam}&text=${encodedMessage}&type=username`
        : `https://api.whatsapp.com/send?phone=${whatsappPhoneParam}&text=${encodedMessage}`;

      return res.json({
        whatsappUrl,
        rawMessage: paidMsg,
        phone: rawContact,
      });
    }

    // 3. Estados previos a la entrega con pago pendiente o parcial
    let paymentInfo = '';
    if (order.pendingAmount > 0) {
      paymentInfo = `💵 *Abonado:* ${formatCurrency(order.paidAmount)} | 🚨 *Saldo Pendiente:* ${formatCurrency(order.pendingAmount)}`;
    } else {
      paymentInfo = `✅ *Pago:* Totalmente Pagado`;
    }

    // Frase de cierre adaptada según el estado
    let closingPhrase = '🥛 ¡Tu yogur artesanal 100% natural entrará en preparación muy pronto con el mayor amor! Cualquier duda estamos a tu disposición. 🥛🍇🍓';
    if (order.deliveryStatus === 'PREPARING') {
      closingPhrase = '🥣 ¡Tu yogur artesanal 100% natural está siendo preparado y empacado con el mayor amor! Cualquier duda estamos a tu disposición. 🥛🍇🍓';
    } else if (order.deliveryStatus === 'IN_ROUTE') {
      closingPhrase = '🛵 ¡Tu yogur artesanal 100% natural ya va en camino hacia tu dirección! Atento para recibirlo. Cualquier duda estamos a tu disposición. 🥛🍇🍓';
    }

    let message = `🥛 *YogurArte - Pedido #${order.orderNumber}*\n`;
    message += `👤 *Cliente:* ${order.customer.fullName}\n`;
    message += `📍 *Dirección:* ${order.deliveryAddress || order.customer.address || 'Fonseca'}\n`;
    message += `${dateLine}\n`;
    message += `📦 *Estado:* ${statusText}\n\n`;
    message += `*Detalle:*\n${itemsBreakdown}\n`;
    message += `🥤 *Total:* ${order.totalLiters} L • ${formatCurrency(order.totalAmount)}\n`;
    message += `${paymentInfo}\n\n`;
    message += `${closingPhrase}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = isUsername
      ? `https://api.whatsapp.com/send/?username=${whatsappPhoneParam}&text=${encodedMessage}&type=username`
      : `https://api.whatsapp.com/send?phone=${whatsappPhoneParam}&text=${encodedMessage}`;

    res.json({
      whatsappUrl,
      rawMessage: message,
      phone: rawContact,
    });
  } catch (error) {
    console.error('Error generating whatsapp link:', error);
    res.status(500).json({ error: 'Error al generar enlace de WhatsApp' });
  }
};
