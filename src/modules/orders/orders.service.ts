import prisma from '../../prisma.js';
import { getAllSettingsMap } from '../../controllers/settings.controller.js';
import { buildWhatsAppUrl } from '../../utils/whatsapp.utils.js';
import { getColombiaDateStr, parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  AddOrderPaymentInput,
  AssignDriverInput,
  CreateOrderInput,
  OrdersQueryInput,
  UpdateDeliveryStatusInput,
  UpdateOrderInput,
  UpdateOrderPaymentInput,
} from './orders.schema.js';

/**
 * Obtener listado de pedidos con filtros avanzados, búsqueda y ordenamiento jerárquico
 */
export const getOrders = async (query: OrdersQueryInput) => {
  const {
    search,
    paymentStatus,
    deliveryStatus,
    debtCategory,
    sortBy,
    startDate,
    endDate,
    month,
    date,
    batchId,
    deliveryType,
    driverId,
    deliveryDriverId,
    limit,
  } = query;

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
      items: {
        include: {
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
      },
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
    // Ordenar jerárquicamente por prioridad de negocio
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

  return orders;
};

/**
 * Obtener detalle completo de un pedido por ID
 */
export const getOrderById = async (id: number) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
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
      },
      payments: {
        orderBy: { paymentDate: 'asc' },
      },
      batch: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  return order;
};

/**
 * Crear un pedido completo de forma atómica ($transaction)
 * Incluye gestión de cliente, ítems múltiples, asignación de lote y abono inicial.
 */
export const createOrder = async (data: CreateOrderInput) => {
  const {
    customerId,
    customerName,
    customerPhone,
    customerAddress,
    customerNeighborhood,
    batchId,
    items,
    bottleSize,
    quantityBottles,
    flavor,
    unitPrice,
    totalAmount,
    paidAmount,
    paymentMethod,
    deliveryStatus,
    deliveryType,
    deliveryDriverId,
    deliveryDriverName,
    deliveryFee,
    discount,
    isLoyaltyReward,
    orderDate,
    deliveryDate,
    deliveryAddress,
    notes,
    registeredBy,
  } = data;

  return await prisma.$transaction(async (tx) => {
    let finalCustomerId = customerId ? Number(customerId) : null;

    // 1. Crear o buscar cliente si se pasa información de contacto
    if (!finalCustomerId && customerPhone) {
      const cleanPhone = customerPhone.trim();
      const existingCustomer = await tx.customer.findFirst({
        where: { phone: cleanPhone },
      });

      if (existingCustomer) {
        finalCustomerId = existingCustomer.id;
        if (customerAddress && !existingCustomer.address) {
          await tx.customer.update({
            where: { id: existingCustomer.id },
            data: { address: customerAddress.trim() },
          });
        }
      } else {
        const newCustomer = await tx.customer.create({
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
      throw new BadRequestError('Se requiere información del cliente para registrar el pedido');
    }

    // 2. Procesar ítems múltiples del pedido
    let parsedBatchId = batchId ? Number(batchId) : null;

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
      const rawParsed = items.map((item) => {
        const size = item.bottleSize || '1L';
        const qty = Number(item.quantity) || 1;
        const litersPerUnit = size === '2L' ? 2.0 : 1.0;
        const itemUnitPrice = item.unitPrice !== undefined && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0
          ? Number(item.unitPrice)
          : (size === '2L' ? 24000 : 12000);

        let itemBatchId: number | null = null;
        if (item.batchId !== undefined && item.batchId !== null && !isNaN(Number(item.batchId))) {
          itemBatchId = Number(item.batchId);
        } else if (parsedBatchId !== undefined && parsedBatchId !== null) {
          itemBatchId = Number(parsedBatchId);
        }

        return {
          batchId: itemBatchId,
          bottleSize: size,
          flavor: (item.flavor || 'Natural').trim(),
          quantity: qty,
          litersPerUnit,
          totalLiters: qty * litersPerUnit,
          unitPrice: itemUnitPrice,
          totalPrice: qty * itemUnitPrice,
        };
      });

      // Consolidar ítems idénticos
      for (const it of rawParsed) {
        const existing = parsedItems.find(
          (c) => c.bottleSize === it.bottleSize && c.flavor.toLowerCase() === it.flavor.toLowerCase() && c.unitPrice === it.unitPrice && c.batchId === it.batchId
        );
        if (existing) {
          existing.quantity += it.quantity;
          existing.totalLiters += it.totalLiters;
          existing.totalPrice += it.totalPrice;
        } else {
          parsedItems.push({ ...it });
        }
      }
    } else {
      // Fallback a ítem único
      const size = bottleSize || '1L';
      const qty = Number(quantityBottles) || 1;
      const litersPerUnit = size === '2L' ? 2.0 : 1.0;
      const price = unitPrice !== undefined && !isNaN(Number(unitPrice)) && Number(unitPrice) >= 0
        ? Number(unitPrice)
        : (size === '2L' ? 24000 : 12000);
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

    // 3. Calcular totales acumulados
    const parsedDeliveryFee = deliveryFee !== undefined ? Number(deliveryFee) : 0;
    let parsedDiscount = discount !== undefined ? Number(discount) : 0;
    const totalLitersCalculated = parsedItems.reduce((sum, i) => sum + i.totalLiters, 0);
    const totalQuantityBottles = parsedItems.reduce((sum, i) => sum + i.quantity, 0);
    let itemsTotal = parsedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    let calculatedTotalAmount = totalAmount !== undefined ? Number(totalAmount) : Math.max(0, itemsTotal + parsedDeliveryFee - parsedDiscount);
    if (totalAmount !== undefined) {
      calculatedTotalAmount = Number(totalAmount);
      if (parsedItems.length === 1 && parsedDiscount === 0 && calculatedTotalAmount !== itemsTotal + parsedDeliveryFee) {
        const adjustedUnitPrice = Math.max(0, Math.round((calculatedTotalAmount - parsedDeliveryFee) / parsedItems[0].quantity));
        parsedItems[0].unitPrice = adjustedUnitPrice;
        parsedItems[0].totalPrice = parsedItems[0].quantity * adjustedUnitPrice;
        itemsTotal = parsedItems[0].totalPrice;
      } else if (parsedDiscount === 0 && calculatedTotalAmount < itemsTotal + parsedDeliveryFee) {
        parsedDiscount = (itemsTotal + parsedDeliveryFee) - calculatedTotalAmount;
      }
    }

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

    // 4. Auto-vincular lote si no se envió explícito
    const hasAnyItemBatch = parsedItems.some((i) => i.batchId !== null && i.batchId !== undefined);
    if (!hasAnyItemBatch && !parsedBatchId) {
      const isExplicitPreventa = batchId === null;
      if (!isExplicitPreventa) {
        const primaryFlavor = (parsedItems[0]?.flavor || flavor || 'Natural').trim();
        const activeBatchesForFlavor = await tx.productionBatch.findMany({
          where: {
            flavor: { equals: primaryFlavor, mode: 'insensitive' },
            isActive: true,
            status: { in: ['COMPLETADO', 'EN_FERMENTACION', 'EN_PROCESO'] },
          },
          include: {
            orders: { select: { id: true, totalLiters: true } },
            orderItems: { select: { id: true, orderId: true, totalLiters: true } },
            discharges: { select: { totalLiters: true } },
          },
          orderBy: { preparationDate: 'desc' },
        });

        for (const b of activeBatchesForFlavor) {
          const soldFromItems = b.orderItems.reduce((sum, it) => sum + it.totalLiters, 0);
          const legacyOrdersSold = b.orders
            .filter((o) => !b.orderItems.some((it) => it.orderId === o.id))
            .reduce((sum, o) => sum + o.totalLiters, 0);
          const sold = soldFromItems + legacyOrdersSold;
          const discharges = (b.discharges || []).reduce((sum, d) => sum + d.totalLiters, 0);
          const available = Math.max(0, b.totalLitersProduced - sold - discharges);
          if (available >= totalLitersCalculated) {
            parsedBatchId = b.id;
            parsedItems.forEach((it) => {
              if (!it.batchId) it.batchId = b.id;
            });
            break;
          }
        }
      }
    }

    // 5. Validar capacidad de cada lote
    const batchLitersMap = new Map<number, number>();
    for (const item of parsedItems) {
      if (item.batchId) {
        const cur = batchLitersMap.get(item.batchId) || 0;
        batchLitersMap.set(item.batchId, cur + item.totalLiters);
      }
    }

    for (const [bId, requestedLiters] of batchLitersMap.entries()) {
      const batchObj = await tx.productionBatch.findUnique({
        where: { id: bId },
        include: {
          orders: { select: { id: true, totalLiters: true } },
          orderItems: { select: { id: true, orderId: true, totalLiters: true } },
          discharges: { select: { totalLiters: true } },
        },
      });

      if (batchObj) {
        const soldFromItems = batchObj.orderItems.reduce((sum, it) => sum + it.totalLiters, 0);
        const legacyOrdersSold = batchObj.orders
          .filter((o) => !batchObj.orderItems.some((it) => it.orderId === o.id))
          .reduce((sum, o) => sum + o.totalLiters, 0);
        const sold = soldFromItems + legacyOrdersSold;
        const discharges = (batchObj.discharges || []).reduce((sum, d) => sum + d.totalLiters, 0);
        const availableLiters = Math.max(0, batchObj.totalLitersProduced - sold - discharges);

        if (requestedLiters > availableLiters + 0.001) {
          throw new BadRequestError(
            `Capacidad excedida: El lote "${batchObj.batchCode}" (${batchObj.flavor}) solo tiene ${availableLiters.toFixed(1)}L disponibles, pero este pedido requiere ${requestedLiters.toFixed(1)}L de este lote.`
          );
        }
      }
    }

    const uniqueBatchIds = Array.from(new Set(parsedItems.map((i) => i.batchId).filter(Boolean))) as number[];
    const finalOrderBatchId = uniqueBatchIds.length === 1 ? uniqueBatchIds[0] : null;

    // 6. Generar consecutivo de pedido único (PED-YYYYMMDD-001)
    const dateObj = parseColombiaDate(orderDate);
    const dateStr = getColombiaDateStr(dateObj).replace(/-/g, '');

    const todayOrders = await tx.order.findMany({
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

    while (await tx.order.findUnique({ where: { orderNumber } })) {
      nextSeq++;
      orderNumber = `PED-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
    }

    let initialDeliveryDate: Date | null = null;
    if (deliveryDate) {
      initialDeliveryDate = parseColombiaDate(deliveryDate);
    } else if (deliveryStatus === 'DELIVERED') {
      initialDeliveryDate = new Date();
    }

    let order: any = null;
    let attempts = 0;
    while (!order && attempts < 10) {
      attempts++;
      try {
        order = await tx.order.create({
          data: {
            orderNumber,
            customerId: finalCustomerId,
            batchId: finalOrderBatchId,
            bottleSize: bottleSizeSummary,
            quantityBottles: totalQuantityBottles,
            totalLiters: totalLitersCalculated,
            flavor: flavorSummary,
            unitPrice: parsedItems[0]?.unitPrice || 12000,
            totalAmount: calculatedTotalAmount,
            paidAmount: paid,
            pendingAmount: pending,
            paymentStatus: calculatedPaymentStatus,
            paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
            deliveryStatus: deliveryStatus || 'PENDING',
            deliveryType: deliveryType ? String(deliveryType).toUpperCase() : 'PROPIO',
            deliveryDriverId: deliveryDriverId ? Number(deliveryDriverId) : null,
            deliveryDriverName: deliveryDriverName ? String(deliveryDriverName).trim() : null,
            deliveryFee: parsedDeliveryFee,
            discount: parsedDiscount,
            orderDate: dateObj,
            deliveryDate: initialDeliveryDate,
            deliveryAddress: deliveryAddress ? deliveryAddress.trim() : (customerAddress ? customerAddress.trim() : 'Fonseca'),
            notes: notes ? notes.trim() : null,
            registeredBy: registeredBy || 'Edier',
            items: {
              create: parsedItems.map((i) => ({
                batchId: i.batchId || null,
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
      } catch (err: any) {
        if (err.code === 'P2002' && err.meta?.target?.includes('orderNumber') && attempts < 10) {
          nextSeq++;
          orderNumber = `PED-${dateStr}-${String(nextSeq).padStart(3, '0')}`;
          continue;
        }
        throw err;
      }
    }

    if (isLoyaltyReward && finalCustomerId) {
      await tx.customer.update({
        where: { id: finalCustomerId },
        data: { loyaltyRedeemedCount: { increment: 1 } },
      }).catch((e) => console.warn('Aviso: No se pudo incrementar loyaltyRedeemedCount:', e.message));
    }

    return order;
  });
};

/**
 * Actualizar pedido existente de forma atómica ($transaction)
 */
export const updateOrder = async (id: number, data: UpdateOrderInput) => {
  const {
    customerName,
    customerPhone,
    customerAddress,
    customerNeighborhood,
    batchId,
    items,
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
    deliveryFee,
    discount,
    orderDate,
    deliveryDate,
    deliveryAddress,
    notes,
    registeredBy,
  } = data;

  return await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });

    if (!currentOrder) {
      throw new NotFoundError('Pedido no encontrado');
    }

    let parsedBatchId = batchId !== undefined ? (batchId ? Number(batchId) : null) : currentOrder.batchId;

    const updatedDeliveryFee = deliveryFee !== undefined ? Number(deliveryFee) : currentOrder.deliveryFee;
    let updatedDiscount = discount !== undefined ? Number(discount) : (currentOrder.discount || 0);

    let updatedLiters = currentOrder.totalLiters;
    let updatedQuantity = currentOrder.quantityBottles;
    let updatedTotal = currentOrder.totalAmount;
    let updatedFlavor = currentOrder.flavor;
    let updatedBottleSize = currentOrder.bottleSize;

    let parsedItemsList: any[] | null = null;
    if (Array.isArray(items) && items.length > 0) {
      const rawParsed = items.map((item) => {
        const size = item.bottleSize || '1L';
        const qty = Number(item.quantity) || 1;
        const litersPerUnit = size === '2L' ? 2.0 : 1.0;
        const itemUnitPrice = item.unitPrice !== undefined && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) >= 0
          ? Number(item.unitPrice)
          : (size === '2L' ? 24000 : 12000);

        let itemBatchId: number | null = null;
        if (item.batchId !== undefined && item.batchId !== null && !isNaN(Number(item.batchId))) {
          itemBatchId = Number(item.batchId);
        } else if (parsedBatchId !== undefined && parsedBatchId !== null) {
          itemBatchId = Number(parsedBatchId);
        }

        return {
          batchId: itemBatchId,
          bottleSize: size,
          flavor: (item.flavor || 'Natural').trim(),
          quantity: qty,
          litersPerUnit,
          totalLiters: qty * litersPerUnit,
          unitPrice: itemUnitPrice,
          totalPrice: qty * itemUnitPrice,
        };
      });

      // Consolidar ítems idénticos
      const parsedItems: typeof rawParsed = [];
      for (const it of rawParsed) {
        const existing = parsedItems.find(
          (c) => c.bottleSize === it.bottleSize && c.flavor.toLowerCase() === it.flavor.toLowerCase() && c.unitPrice === it.unitPrice && c.batchId === it.batchId
        );
        if (existing) {
          existing.quantity += it.quantity;
          existing.totalLiters += it.totalLiters;
          existing.totalPrice += it.totalPrice;
        } else {
          parsedItems.push({ ...it });
        }
      }

      let itemsTotal = parsedItems.reduce((sum, i) => sum + i.totalPrice, 0);

      // Reconciliación si se especificó totalAmount
      if (totalAmount !== undefined) {
        updatedTotal = Number(totalAmount);
        if (parsedItems.length === 1 && updatedDiscount === 0 && updatedTotal !== itemsTotal + updatedDeliveryFee) {
          const adjustedUnitPrice = Math.max(0, Math.round((updatedTotal - updatedDeliveryFee) / parsedItems[0].quantity));
          parsedItems[0].unitPrice = adjustedUnitPrice;
          parsedItems[0].totalPrice = parsedItems[0].quantity * adjustedUnitPrice;
          itemsTotal = parsedItems[0].totalPrice;
        } else if (updatedDiscount === 0 && updatedTotal < itemsTotal + updatedDeliveryFee) {
          updatedDiscount = (itemsTotal + updatedDeliveryFee) - updatedTotal;
        }
      } else {
        updatedTotal = Math.max(0, itemsTotal + updatedDeliveryFee - updatedDiscount);
      }

      parsedItemsList = parsedItems;
      updatedLiters = parsedItems.reduce((sum, i) => sum + i.totalLiters, 0);
      updatedQuantity = parsedItems.reduce((sum, i) => sum + i.quantity, 0);
      updatedFlavor = parsedItems.map((i) => `${i.quantity}x ${i.flavor} (${i.bottleSize})`).join(', ');
      updatedBottleSize = parsedItems.every((i) => i.bottleSize === parsedItems[0].bottleSize)
        ? parsedItems[0].bottleSize
        : 'MIXTO';

      // Validar capacidad de cada lote
      const batchLitersMap = new Map<number, number>();
      for (const item of parsedItems) {
        if (item.batchId) {
          const cur = batchLitersMap.get(item.batchId) || 0;
          batchLitersMap.set(item.batchId, cur + item.totalLiters);
        }
      }

      for (const [bId, requestedLiters] of batchLitersMap.entries()) {
        const batchObj = await tx.productionBatch.findUnique({
          where: { id: bId },
          include: {
            orders: { select: { id: true, totalLiters: true } },
            orderItems: { select: { id: true, orderId: true, totalLiters: true } },
            discharges: { select: { totalLiters: true } },
          },
        });

        if (batchObj) {
          const otherItems = batchObj.orderItems.filter((it) => it.orderId !== id);
          const otherLegacyOrders = batchObj.orders.filter((o) => o.id !== id && !batchObj.orderItems.some((it) => it.orderId === o.id));
          const otherSold = otherItems.reduce((sum, it) => sum + it.totalLiters, 0) + otherLegacyOrders.reduce((sum, o) => sum + o.totalLiters, 0);
          const discharges = (batchObj.discharges || []).reduce((sum, d) => sum + d.totalLiters, 0);
          const availableLiters = Math.max(0, batchObj.totalLitersProduced - otherSold - discharges);

          if (requestedLiters > availableLiters + 0.001) {
            throw new BadRequestError(
              `Capacidad excedida: El lote "${batchObj.batchCode}" (${batchObj.flavor}) solo tiene ${availableLiters.toFixed(1)}L disponibles (este pedido requiere ${requestedLiters.toFixed(1)}L de este lote).`
            );
          }
        }
      }

      const uniqueBatchIds = Array.from(new Set(parsedItems.map((i) => i.batchId).filter(Boolean))) as number[];
      parsedBatchId = uniqueBatchIds.length === 1 ? uniqueBatchIds[0] : null;
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

    let finalDeliveryDate = currentOrder.deliveryDate;
    if (deliveryDate) {
      finalDeliveryDate = parseColombiaDate(deliveryDate);
    } else if (deliveryStatus === 'DELIVERED') {
      if (currentOrder.deliveryStatus !== 'DELIVERED' || !currentOrder.deliveryDate) {
        finalDeliveryDate = new Date();
      }
    }

    const targetPaymentMethod = paymentMethod !== undefined ? paymentMethod.trim() : currentOrder.paymentMethod;

    // 1. Actualizar cliente si se proporcionaron datos
    if (customerName || customerPhone || customerAddress) {
      await tx.customer.update({
        where: { id: currentOrder.customerId },
        data: {
          fullName: customerName ? customerName.trim() : undefined,
          phone: customerPhone ? customerPhone.trim() : undefined,
          address: customerAddress ? customerAddress.trim() : undefined,
          neighborhood: customerNeighborhood ? customerNeighborhood.trim() : undefined,
        },
      });
    }

    // 2. Reemplazar ítems en base de datos si cambiaron
    if (parsedItemsList && parsedItemsList.length > 0) {
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      await tx.orderItem.createMany({
        data: parsedItemsList.map((i) => ({
          orderId: id,
          batchId: i.batchId || null,
          bottleSize: i.bottleSize,
          flavor: i.flavor,
          quantity: i.quantity,
          litersPerUnit: i.litersPerUnit,
          totalLiters: i.totalLiters,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
        })),
      });
    }

    // 3. Actualizar la orden principal
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        batchId: parsedBatchId,
        bottleSize: updatedBottleSize,
        quantityBottles: updatedQuantity,
        totalLiters: updatedLiters,
        flavor: updatedFlavor,
        unitPrice: (parsedItemsList && parsedItemsList.length > 0 ? parsedItemsList[0].unitPrice : (unitPrice !== undefined ? Number(unitPrice) : currentOrder.unitPrice)),
        totalAmount: updatedTotal,
        paidAmount: finalPaid,
        pendingAmount: finalPending,
        paymentStatus: finalPaymentStatus,
        paymentMethod: targetPaymentMethod,
        deliveryStatus: deliveryStatus || currentOrder.deliveryStatus,
        deliveryType: deliveryType !== undefined ? String(deliveryType).toUpperCase() : currentOrder.deliveryType,
        deliveryDriverId: deliveryDriverId !== undefined ? (deliveryDriverId ? Number(deliveryDriverId) : null) : currentOrder.deliveryDriverId,
        deliveryDriverName: deliveryDriverName !== undefined ? deliveryDriverName : currentOrder.deliveryDriverName,
        deliveryFee: updatedDeliveryFee,
        discount: updatedDiscount,
        orderDate: orderDate ? parseColombiaDate(orderDate) : currentOrder.orderDate,
        deliveryDate: finalDeliveryDate,
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

    // 4. Sincronizar registros en OrderPayment
    const existingPayments = await tx.orderPayment.findMany({
      where: { orderId: id },
      orderBy: { paymentDate: 'asc' },
    });

    if (finalPaid === 0 && existingPayments.length > 0) {
      await tx.orderPayment.deleteMany({
        where: { orderId: id },
      });
    } else if (finalPaid > 0) {
      if (existingPayments.length === 0) {
        const pDate = orderDate ? parseColombiaDate(orderDate) : currentOrder.orderDate;
        await tx.orderPayment.create({
          data: {
            orderId: id,
            amount: finalPaid,
            paymentDate: pDate,
            paymentMethod: targetPaymentMethod || 'EFECTIVO',
            notes: 'Abono registrado al actualizar pedido',
            registeredBy: registeredBy || 'Edier',
          },
        });
      } else if (existingPayments.length === 1) {
        await tx.orderPayment.update({
          where: { id: existingPayments[0].id },
          data: {
            amount: finalPaid,
            paymentMethod: targetPaymentMethod || 'EFECTIVO',
          },
        });
      } else if (paymentMethod !== undefined) {
        await tx.orderPayment.updateMany({
          where: { orderId: id },
          data: {
            paymentMethod: targetPaymentMethod || 'EFECTIVO',
          },
        });
      }
    }

    return updatedOrder;
  });
};

/**
 * Asignar o cambiar repartidor y tipo de entrega
 */
export const assignDriver = async (id: number, data: AssignDriverInput) => {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const { deliveryType, deliveryDriverId, deliveryDriverName } = data;
  const type = deliveryType ? String(deliveryType).toUpperCase() : existing.deliveryType;
  let driverIdNum = deliveryDriverId !== undefined ? (deliveryDriverId ? Number(deliveryDriverId) : null) : existing.deliveryDriverId;
  let driverNameStr = deliveryDriverName !== undefined ? deliveryDriverName : existing.deliveryDriverName;

  if (type !== 'DOMICILIARIO') {
    driverIdNum = null;
    driverNameStr = null;
  }

  return prisma.order.update({
    where: { id },
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
};

/**
 * Actualizar estado de entrega y recaudo (para Domiciliarios o Admins)
 */
export const updateDeliveryStatus = async (id: number, data: UpdateDeliveryStatusInput) => {
  const { deliveryStatus, paymentMethod, paidAmount, notes } = data;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!existing) {
      throw new NotFoundError('Pedido no encontrado');
    }

    const updateData: any = {};
    if (deliveryStatus) {
      updateData.deliveryStatus = deliveryStatus;
      if (deliveryStatus === 'DELIVERED') {
        updateData.deliveryDate = new Date();
      } else if (deliveryStatus === 'IN_ROUTE' && !existing.dispatchedAt) {
        updateData.dispatchedAt = new Date();
      } else if (deliveryStatus === 'PENDING' || deliveryStatus === 'PREPARING' || deliveryStatus === 'READY_FOR_DISPATCH') {
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

      const existingPayments = await tx.orderPayment.findMany({ where: { orderId: id } });
      const currentPaymentsSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);
      const delta = finalPaid - currentPaymentsSum;

      if (delta > 0) {
        await tx.orderPayment.create({
          data: {
            orderId: id,
            amount: delta,
            paymentDate: new Date(),
            paymentMethod: paymentMethod ? String(paymentMethod).trim() : (existing.paymentMethod || 'EFECTIVO'),
            notes: 'Pago recibido al entregar domicilio',
            registeredBy: existing.deliveryDriverName || 'Domiciliario',
          },
        });
      } else if (paymentMethod && existingPayments.length > 0) {
        await tx.orderPayment.updateMany({
          where: { orderId: id },
          data: { paymentMethod: String(paymentMethod).trim() },
        });
      }
    }

    if (paymentMethod && (!existing.payments || existing.payments.length === 0)) {
      updateData.paymentMethod = String(paymentMethod).trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    return tx.order.update({
      where: { id },
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
  });
};

/**
 * Reprogramar en lote pedidos atrasados para entregar el día de hoy
 */
export const rescheduleOverdueOrders = async () => {
  const todayStr = getColombiaDateStr();
  const todayStart = new Date(`${todayStr}T00:00:00.000Z`);
  const newDeliveryDate = new Date();

  const result = await prisma.order.updateMany({
    where: {
      deliveryStatus: { not: 'DELIVERED' },
      OR: [
        { deliveryDate: { lt: todayStart } },
        { deliveryDate: null, orderDate: { lt: todayStart } },
      ],
    },
    data: {
      deliveryDate: newDeliveryDate,
    },
  });

  return {
    message: `Se reprogramaron ${result.count} pedido(s) atrasados para hoy (${todayStr}) exitosamente`,
    updatedCount: result.count,
    newDeliveryDate: todayStr,
  };
};

/**
 * Registrar abono a un pedido existente con transacción atómica
 */
export const addOrderPayment = async (orderId: number, data: AddOrderPaymentInput) => {
  const { amount, paymentMethod, notes, registeredBy, paymentDate } = data;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Pedido no encontrado');
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new BadRequestError('El monto del abono debe ser mayor a 0');
    }

    const pDate = parseColombiaDate(paymentDate);

    const createdPayment = await tx.orderPayment.create({
      data: {
        orderId,
        amount: payAmount,
        paymentMethod: paymentMethod ? String(paymentMethod).trim() : (order.paymentMethod || 'EFECTIVO'),
        paymentDate: pDate,
        notes: notes ? String(notes).trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    const allPayments = await tx.orderPayment.findMany({ where: { orderId } });
    const newPaidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const newPendingAmount = Math.max(0, order.totalAmount - newPaidAmount);
    let newPaymentStatus = 'PENDING';
    if (newPaidAmount >= order.totalAmount) {
      newPaymentStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'PARTIAL';
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        paymentStatus: newPaymentStatus,
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

    return {
      message: 'Abono registrado exitosamente',
      payment: createdPayment,
      order: updatedOrder,
    };
  });
};

/**
 * Editar un abono existente de forma atómica
 */
export const updateOrderPayment = async (orderId: number, paymentId: number, data: UpdateOrderPaymentInput) => {
  const { amount, paymentMethod, paymentDate, notes, registeredBy } = data;

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundError('Pedido no encontrado');

    const existingPayment = await tx.orderPayment.findUnique({ where: { id: paymentId } });
    if (!existingPayment) throw new NotFoundError('Abono no encontrado');

    const updateData: any = {};
    if (amount !== undefined) {
      const payAmount = Number(amount);
      if (payAmount <= 0) throw new BadRequestError('El monto debe ser mayor a 0');
      updateData.amount = payAmount;
    }
    if (paymentMethod) updateData.paymentMethod = String(paymentMethod).trim();
    if (paymentDate) updateData.paymentDate = parseColombiaDate(paymentDate);
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
    if (registeredBy) updateData.registeredBy = String(registeredBy).trim();

    await tx.orderPayment.update({
      where: { id: paymentId },
      data: updateData,
    });

    const allPayments = await tx.orderPayment.findMany({
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

    return tx.order.update({
      where: { id: orderId },
      data: {
        paidAmount: totalPaid,
        pendingAmount,
        paymentStatus,
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
  });
};

/**
 * Eliminar un abono específico de un pedido
 */
export const deleteOrderPayment = async (orderId: number, paymentId: number) => {
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.orderPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.orderId !== orderId) {
      throw new NotFoundError('Abono no encontrado en este pedido');
    }

    await tx.orderPayment.delete({
      where: { id: paymentId },
    });

    const remainingPayments = await tx.orderPayment.findMany({
      where: { orderId },
    });

    const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Pedido no encontrado');
    }

    const newPending = Math.max(0, order.totalAmount - totalPaid);
    let newStatus = 'PENDING';
    if (totalPaid >= order.totalAmount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paidAmount: totalPaid,
        pendingAmount: newPending,
        paymentStatus: newStatus,
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

    return {
      message: 'Abono eliminado exitosamente',
      order: updatedOrder,
    };
  });
};

/**
 * Eliminar pedido
 */
export const deleteOrder = async (id: number) => {
  await prisma.order.delete({
    where: { id },
  });
  return { message: 'Pedido eliminado exitosamente', id };
};

/**
 * Generar enlace y mensaje interactivo de WhatsApp para clientes
 */
export const getWhatsAppLink = async (id: number, type?: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
    },
  });

  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const rawContact = (order.customer.phone || '').trim();
  const formatCurrency = (val: number) => `$${new Intl.NumberFormat('es-CO').format(val)} COP`;

  let statusText = '🕒 Pendiente por preparar';
  if (order.deliveryStatus === 'PREPARING') {
    statusText = '🥣 En preparación';
  } else if (order.deliveryStatus === 'READY_FOR_DISPATCH') {
    statusText = '📦 Listo para despacho';
  } else if (order.deliveryStatus === 'IN_ROUTE') {
    statusText = '🛵 En camino';
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

  const settings = await getAllSettingsMap();
  const nequiNum = settings.nequiNumber || '3024581882';
  const bankName = settings.bankName || 'Nequi / Bancolombia';
  const instagramUrl = settings.instagramUrl || 'https://www.instagram.com/yogurartesanalfonseca?igsi=ZXNjM2dxZ3Z1dXg4&utm_source=qr';
  const instagramLine = `\n\n📸 *Síguenos en Instagram:*\n${instagramUrl}`;

  // 1. Si el pedido ya está ENTREGADO
  if (order.deliveryStatus === 'DELIVERED' && type !== 'ORDER_INFO') {
    let deliveredMsg = '';
    if (order.pendingAmount <= 0 || order.paymentStatus === 'PAID') {
      deliveredMsg = `🥛 *YogurArte | ¡Pago Recibido con Éxito! ✨*\n\n`;
      deliveredMsg += `¡Hola *${order.customer.fullName}*! Confirmamos el recibido de tu pago para tu pedido *#${order.orderNumber}*:\n`;
      deliveredMsg += `${itemsBreakdown}\n\n`;
      deliveredMsg += `💰 *Total Pagado:* ${formatCurrency(order.totalAmount)} (✅ Paz y Salvo)\n`;
      deliveredMsg += `📦 *Estado:* ✅ Entregado\n\n`;
      deliveredMsg += `¡Muchísimas gracias por tu compra y cumplimiento! Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural. 🥛🍇🍓\n\n`;
      deliveredMsg += `Estamos siempre a tu orden para tu próximo pedido. ✨`;
    } else {
      deliveredMsg = `🥛 *YogurArte | Pedido #${order.orderNumber}*\n\n`;
      deliveredMsg += `¡Hola *${order.customer.fullName}*! Tu pedido ha sido *✅ Entregado con éxito*.\n`;
      deliveredMsg += `${itemsBreakdown}\n\n`;
      deliveredMsg += `🚨 *Saldo pendiente:* ${formatCurrency(order.pendingAmount)}\n`;
      if (order.paidAmount > 0) {
        deliveredMsg += `💵 *Abonado:* ${formatCurrency(order.paidAmount)}\n`;
      }
      deliveredMsg += `💳 *${bankName}:* ${nequiNum}\n\n`;
      deliveredMsg += `¡Esperamos que disfrutes al máximo tu delicioso yogur artesanal 100% natural! Cualquier duda o para tu próximo pago estamos a tu orden. 🥛🍇🍓`;
    }
    deliveredMsg += instagramLine;

    const whatsappUrl = buildWhatsAppUrl(rawContact, deliveredMsg);

    return {
      whatsappUrl,
      rawMessage: deliveredMsg,
      phone: rawContact,
      customerName: order.customer.fullName,
      customerId: order.customerId,
    };
  }

  // 2. Si el pedido ya está PAGADO pero aún NO entregado
  if (type !== 'ORDER_INFO' && order.deliveryStatus !== 'DELIVERED' && (order.paymentStatus === 'PAID' || order.pendingAmount <= 0)) {
    let paidMsg = `🥛 *YogurArte | Pago Confirmado ✨*\n\n`;
    paidMsg += `¡Hola *${order.customer.fullName}*! Confirmamos el pago de tu pedido *#${order.orderNumber}*:\n`;
    paidMsg += `${itemsBreakdown}\n\n`;
    paidMsg += `💰 *Total Pagado:* ${formatCurrency(order.totalAmount)} (✅ Paz y Salvo)\n`;
    paidMsg += `📦 *Estado:* ${statusText}\n`;
    if (order.deliveryAddress || order.customer.address) {
      paidMsg += `📍 *Entrega:* ${order.deliveryAddress || order.customer.address}\n`;
    }
    paidMsg += `\n🥣 ¡Muchas gracias por tu compra y confianza! Tu yogur 100% natural está siendo preparado y te avisaremos apenas vaya en camino. 🍓🛵💨`;
    paidMsg += instagramLine;

    const whatsappUrl = buildWhatsAppUrl(rawContact, paidMsg);

    return {
      whatsappUrl,
      rawMessage: paidMsg,
      phone: rawContact,
      customerName: order.customer.fullName,
      customerId: order.customerId,
    };
  }

  // 3. Estados previos a la entrega con pago pendiente o consulta
  let message = `🥛 *YogurArte | Pedido #${order.orderNumber}*\n\n`;
  message += `Hola *${order.customer.fullName}*, el estado de tu pedido es: *${statusText}*\n`;
  message += `${itemsBreakdown}\n\n`;
  message += `💰 *Total:* ${formatCurrency(order.totalAmount)}`;

  if (order.pendingAmount > 0) {
    message += `\n🚨 *Saldo pendiente:* ${formatCurrency(order.pendingAmount)}`;
    if (order.paidAmount > 0) {
      message += ` (💵 Abonado: ${formatCurrency(order.paidAmount)})`;
    }
    message += `\n💳 *${bankName}:* ${nequiNum}`;
  } else {
    message += ` (✅ Pagado)`;
  }

  if (order.deliveryAddress || order.customer.address) {
    message += `\n📍 *Entrega:* ${order.deliveryAddress || order.customer.address}`;
  }

  let closingPhrase = '\n\n🥛 ¡Tu yogur artesanal entrará en preparación muy pronto! Cualquier duda estamos a tu disposición. 🥛🍇🍓';
  if (order.deliveryStatus === 'PREPARING') {
    closingPhrase = '\n\n🥣 ¡Tu yogur artesanal 100% natural está siendo preparado con todo el amor! Te avisaremos cuando salga a reparto. 🥛🍇🍓';
  } else if (order.deliveryStatus === 'READY_FOR_DISPATCH') {
    closingPhrase = '\n\n📦 ¡Tu yogur artesanal ya está empacado y refrigerado! Nuestro domiciliario saldrá pronto hacia tu dirección. 🥛🍇🍓';
  } else if (order.deliveryStatus === 'IN_ROUTE') {
    closingPhrase = '\n\n🛵 ¡Tu yogur artesanal ya va en camino hacia tu dirección! Atento para recibirlo. ¡Muchas gracias por tu compra! 🥛🍇🍓';
  }

  message += `${closingPhrase}`;
  message += instagramLine;

  const whatsappUrl = buildWhatsAppUrl(rawContact, message);

  return {
    whatsappUrl,
    rawMessage: message,
    phone: rawContact,
    customerName: order.customer.fullName,
    customerId: order.customerId,
  };
};
