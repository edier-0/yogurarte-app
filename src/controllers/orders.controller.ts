import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { getAllSettingsMap } from './settings.controller.js';

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
      deliveryType, // 'PROPIO' | 'DOMICILIARIO' | 'LOCAL' | 'ALL'
      driverId, // ID del repartidor o 'UNASSIGNED'
      deliveryDriverId, // Alias de driverId
      limit,
    } = req.query;

    const conditions: any[] = [];

    if (deliveryType && typeof deliveryType === 'string' && deliveryType !== 'ALL') {
      conditions.push({ deliveryType: deliveryType.toUpperCase() });
    }

    const targetDriver = driverId || deliveryDriverId;
    if (targetDriver && typeof targetDriver === 'string' && targetDriver !== 'ALL') {
      if (targetDriver === 'UNASSIGNED') {
        conditions.push({
          deliveryType: 'DOMICILIARIO',
          deliveryDriverId: null,
        });
      } else {
        const dId = Number(targetDriver);
        if (!isNaN(dId)) {
          conditions.push({ deliveryDriverId: dId });
        }
      }
    }

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
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
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
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
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
      deliveryType, // 'PROPIO' | 'DOMICILIARIO' | 'LOCAL'
      deliveryDriverId,
      deliveryDriverName,
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
        deliveryType: deliveryType ? String(deliveryType).toUpperCase() : 'PROPIO',
        deliveryDriverId: deliveryDriverId ? Number(deliveryDriverId) : null,
        deliveryDriverName: deliveryDriverName ? String(deliveryDriverName).trim() : null,
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
        payments: paid > 0 ? {
          create: [{
            amount: paid,
            paymentDate: dateObj,
            paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
            notes: notes ? `Abono inicial (${notes.trim()})` : 'Abono inicial al crear pedido',
            registeredBy: registeredBy || 'Edier',
          }],
        } : undefined,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
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
      deliveryType,
      deliveryDriverId,
      deliveryDriverName,
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
        deliveryType: deliveryType !== undefined ? String(deliveryType).toUpperCase() : currentOrder.deliveryType,
        deliveryDriverId: deliveryDriverId !== undefined ? (deliveryDriverId ? Number(deliveryDriverId) : null) : currentOrder.deliveryDriverId,
        deliveryDriverName: deliveryDriverName !== undefined ? deliveryDriverName : currentOrder.deliveryDriverName,
        orderDate: orderDate ? new Date(`${String(orderDate).split('T')[0]}T12:00:00.000Z`) : currentOrder.orderDate,
        deliveryDate: deliveryDate ? new Date(`${String(deliveryDate).split('T')[0]}T12:00:00.000Z`) : currentOrder.deliveryDate,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : (customerAddress ? customerAddress.trim() : currentOrder.deliveryAddress),
        notes: notes !== undefined ? notes : currentOrder.notes,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
};

// Asignar o cambiar repartidor y tipo de entrega con 1 clic
export const assignDriver = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryType, deliveryDriverId, deliveryDriverName } = req.body;

    const orderId = Number(id);
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const type = deliveryType ? String(deliveryType).toUpperCase() : existing.deliveryType;
    let driverIdNum = deliveryDriverId !== undefined ? (deliveryDriverId ? Number(deliveryDriverId) : null) : existing.deliveryDriverId;
    let driverNameStr = deliveryDriverName !== undefined ? deliveryDriverName : existing.deliveryDriverName;

    if (type !== 'DOMICILIARIO') {
      driverIdNum = null;
      driverNameStr = null;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryType: type,
        deliveryDriverId: driverIdNum,
        deliveryDriverName: driverNameStr,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: 'Error al asignar repartidor' });
  }
};

// Actualizar estado de entrega y recaudo (para Domiciliarios o Admins)
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryStatus, paymentMethod, paidAmount, notes } = req.body;

    const orderId = Number(id);
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const updateData: any = {};
    if (deliveryStatus) {
      updateData.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'IN_ROUTE' && !existing.dispatchedAt) {
        updateData.dispatchedAt = new Date();
      } else if (deliveryStatus === 'PENDING' || deliveryStatus === 'PREPARING') {
        updateData.dispatchedAt = null;
      }
    }

    if (paidAmount !== undefined) {
      const finalPaid = Number(paidAmount);
      updateData.paidAmount = finalPaid;
      updateData.pendingAmount = Math.max(0, existing.totalAmount - finalPaid);
      if (finalPaid >= existing.totalAmount) {
        updateData.paymentStatus = 'PAID';
      } else if (finalPaid > 0) {
        updateData.paymentStatus = 'PARTIAL';
      } else {
        updateData.paymentStatus = 'PENDING';
      }

      // Si el monto pagado aumentó, registrar el abono delta en OrderPayment
      const delta = finalPaid - existing.paidAmount;
      if (delta > 0) {
        await prisma.orderPayment.create({
          data: {
            orderId,
            amount: delta,
            paymentDate: new Date(),
            paymentMethod: paymentMethod ? String(paymentMethod).trim() : (existing.paymentMethod || 'EFECTIVO'),
            notes: 'Pago recibido al entregar domicilio',
            registeredBy: existing.deliveryDriverName || 'Domiciliario',
          },
        });
      }
    }

    if (paymentMethod) {
      updateData.paymentMethod = String(paymentMethod).trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes ? String(notes).trim() : null;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: 'Error al actualizar estado de entrega' });
  }
};

// Registrar abono a un pedido existente con método de pago individual
export const addOrderPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes, registeredBy } = req.body;

    const orderId = Number(id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });
    }

    const pDate = paymentDate ? new Date(`${String(paymentDate).split('T')[0]}T12:00:00.000Z`) : new Date();

    // Crear registro de abono
    await prisma.orderPayment.create({
      data: {
        orderId,
        amount: payAmount,
        paymentDate: pDate,
        paymentMethod: paymentMethod ? String(paymentMethod).trim() : 'EFECTIVO',
        notes: notes ? String(notes).trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    // Recalcular todos los abonos del pedido
    const allPayments = await prisma.orderPayment.findMany({
      where: { orderId },
      orderBy: { paymentDate: 'asc' },
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = Math.max(0, order.totalAmount - totalPaid);

    let paymentStatus = 'PENDING';
    if (totalPaid >= order.totalAmount) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    const uniqueMethods = Array.from(new Set(allPayments.map((p) => p.paymentMethod)));
    let finalMethod = order.paymentMethod;
    if (uniqueMethods.length === 1) {
      finalMethod = uniqueMethods[0];
    } else if (uniqueMethods.length > 1) {
      finalMethod = `MIXTO (${uniqueMethods.join(' + ')})`;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: totalPaid,
        pendingAmount,
        paymentStatus,
        paymentMethod: finalMethod,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    res.status(201).json(updatedOrder);
  } catch (error) {
    console.error('Error adding order payment:', error);
    res.status(500).json({ error: 'Error al registrar abono del pedido' });
  }
};

// Eliminar un abono de un pedido
export const deleteOrderPayment = async (req: Request, res: Response) => {
  try {
    const { id, paymentId } = req.params;
    const orderId = Number(id);
    const pId = Number(paymentId);

    await prisma.orderPayment.delete({
      where: { id: pId },
    });

    const allPayments = await prisma.orderPayment.findMany({
      where: { orderId },
      orderBy: { paymentDate: 'asc' },
    });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = Math.max(0, order.totalAmount - totalPaid);

    let paymentStatus = 'PENDING';
    if (totalPaid >= order.totalAmount) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    const uniqueMethods = Array.from(new Set(allPayments.map((p) => p.paymentMethod)));
    let finalMethod = 'EFECTIVO';
    if (uniqueMethods.length === 1) {
      finalMethod = uniqueMethods[0];
    } else if (uniqueMethods.length > 1) {
      finalMethod = `MIXTO (${uniqueMethods.join(' + ')})`;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paidAmount: totalPaid,
        pendingAmount,
        paymentStatus,
        paymentMethod: finalMethod,
      },
      include: {
        customer: true,
        items: true,
        batch: true,
        payments: {
          orderBy: { paymentDate: 'asc' },
        },
      },
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error deleting order payment:', error);
    res.status(500).json({ error: 'Error al eliminar abono' });
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

    const settings = await getAllSettingsMap();
    const nequiNum = settings.nequiNumber || '3024581882';
    const bankName = settings.bankName || 'Nequi / Bancolombia';
    const bankHolder = settings.bankHolder || 'Edier / YogurArte';

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
        deliveredMsg += `💳 *${bankName}:* ${nequiNum}\n\n`;
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
      paymentInfo = `💵 *Abonado:* ${formatCurrency(order.paidAmount)} | 🚨 *Saldo Pendiente:* ${formatCurrency(order.pendingAmount)}\n💳 *Transferencia ${bankName}:* ${nequiNum}`;
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
