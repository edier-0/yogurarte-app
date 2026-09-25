import prisma from '../../prisma.js';
import { getColombiaDateStr, parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  BatchesQueryInput,
  BatchPackagingInput,
  CreateBatchDischargeInput,
  CreateBatchInput,
  DeactivateBatchInput,
  LinkOrdersToBatchInput,
  NextCodeQueryInput,
  PartnerWithdrawalInput,
  PatchBatchStatusInput,
  UnlinkOrderInput,
  UpdateBatchInput,
  UpdateBatchPackagingInput,
} from './batches.schema.js';

function isKgUnit(unit: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return u === 'kg' || u === 'kilo' || u === 'kilos' || u === 'kilogramo' || u === 'kilogramos';
}

function isGramUnit(unit: string): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return u === 'g' || u === 'gr' || u === 'gramo' || u === 'gramos';
}

/**
 * Sincronización bidireccional automática del estado del lote
 * Si stock disponible <= 0.05 -> AGOTADO
 * Si stock disponible > 0.05 y estaba AGOTADO -> DISPONIBLE
 */
export const syncBatchStatusBidirectional = async (tx: any, batchId: number) => {
  const batch = await tx.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      orders: {
        where: { deliveryStatus: { not: 'CANCELLED' } },
        select: { id: true, totalLiters: true },
      },
      orderItems: {
        where: { order: { deliveryStatus: { not: 'CANCELLED' } } },
        select: { id: true, orderId: true, totalLiters: true },
      },
      discharges: {
        select: { totalLiters: true },
      },
    },
  });

  if (!batch || !batch.isActive || batch.status === 'ARCHIVADO') {
    return null;
  }

  const soldFromItems = batch.orderItems.reduce((sum: number, it: any) => sum + it.totalLiters, 0);
  const legacySold = batch.orders
    .filter((o: any) => !batch.orderItems.some((it: any) => it.orderId === o.id))
    .reduce((sum: number, o: any) => sum + o.totalLiters, 0);
  const totalSold = soldFromItems + legacySold;
  const totalDischarged = batch.discharges.reduce((sum: number, d: any) => sum + d.totalLiters, 0);
  const remaining = Math.max(0, batch.totalLitersProduced - totalSold - totalDischarged);

  let newStatus = batch.status;

  if (remaining <= 0.05) {
    if (batch.status === 'DISPONIBLE' || batch.status === 'COMPLETADO') {
      newStatus = 'AGOTADO';
      await tx.productionBatch.update({
        where: { id: batchId },
        data: { status: 'AGOTADO' },
      });
    }
  } else {
    // Si recuperó saldo y estaba AGOTADO
    if (batch.status === 'AGOTADO') {
      newStatus = 'DISPONIBLE';
      await tx.productionBatch.update({
        where: { id: batchId },
        data: { status: 'DISPONIBLE' },
      });
    }
  }

  return { batchId, remaining, status: newStatus };
};

/**
 * Obtener listado de lotes enriquecidos con balance lácteo, ventas, preventa y paginación
 */
export const getBatches = async (query: BatchesQueryInput) => {
  const { status, includeInactive, lite, page = 1, limit = 5 } = query;

  const whereClause: any = {};
  if (includeInactive !== 'true') {
    whereClause.isActive = true;
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    if (status === 'DISPONIBLE' || status === 'COMPLETADO') {
      whereClause.status = { in: ['DISPONIBLE', 'COMPLETADO'] };
    } else if (status === 'ACTIVE') {
      whereClause.status = { in: ['DISPONIBLE', 'COMPLETADO', 'EN_FERMENTACION'] };
    } else if (status === 'ARCHIVED' || status === 'ARCHIVADO') {
      delete whereClause.isActive;
      whereClause.OR = [{ status: 'ARCHIVADO' }, { isActive: false }];
    } else {
      whereClause.status = status;
    }
  }

  if (lite === 'true') {
    const liteBatches = await prisma.productionBatch.findMany({
      where: whereClause,
      include: {
        orders: {
          select: {
            id: true,
            totalLiters: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            orderId: true,
            totalLiters: true,
          },
        },
        discharges: {
          select: {
            totalLiters: true,
            reasonType: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { preparationDate: 'desc' },
    });

    return liteBatches.map((b) => {
      const soldFromItems = b.orderItems.reduce((sum, i) => sum + i.totalLiters, 0);
      const legacySold = b.orders
        .filter((o) => !b.orderItems.some((it) => it.orderId === o.id))
        .reduce((sum, o) => sum + o.totalLiters, 0);
      const totalSoldLiters = soldFromItems + legacySold;
      const totalDischargedLiters = (b.discharges || []).reduce((sum, d) => sum + d.totalLiters, 0);
      const remainingAvailableLiters = Math.max(0, b.totalLitersProduced - totalSoldLiters - totalDischargedLiters);
      return {
        id: b.id,
        batchCode: b.batchCode,
        flavor: b.flavor,
        price1L: b.price1L,
        price2L: b.price2L,
        status: b.status,
        isActive: b.isActive,
        totalLitersProduced: b.totalLitersProduced,
        packagedLiters: b.packagedLiters,
        totalSoldLiters,
        totalDischargedLiters,
        remainingAvailableLiters,
        bottles1LProduced: b.bottles1LProduced,
        bottles2LProduced: b.bottles2LProduced,
        preparationDate: b.preparationDate,
      };
    });
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 5);
  const skip = (pageNum - 1) * limitNum;

  const [total, batches] = await Promise.all([
    prisma.productionBatch.count({ where: whereClause }),
    prisma.productionBatch.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      include: {
        packagings: {
          orderBy: { packagedAt: 'desc' },
        },
        itemsUsed: {
          include: {
            rawMaterial: {
              select: {
                name: true,
                unit: true,
                category: true,
                code: true,
              },
            },
          },
        },
        orders: {
          where: { deliveryStatus: { not: 'CANCELLED' } },
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            paidAmount: true,
            totalLiters: true,
            quantityBottles: true,
            bottleSize: true,
            orderDate: true,
            deliveryStatus: true,
            paymentStatus: true,
            customer: {
              select: {
                fullName: true,
              },
            },
          },
        },
        orderItems: {
          where: { order: { deliveryStatus: { not: 'CANCELLED' } } },
          select: {
            id: true,
            orderId: true,
            quantity: true,
            totalLiters: true,
            totalPrice: true,
            bottleSize: true,
          },
        },
        discharges: {
          include: {
            staffMember: {
              select: {
                id: true,
                fullName: true,
                role: true,
                type: true,
              },
            },
          },
          orderBy: { dischargeDate: 'desc' },
        },
      },
      orderBy: { preparationDate: 'desc' },
    }),
  ]);

  // Consultar pedidos activos sin lote asignado (preventa)
  const unassignedOrders = await prisma.order.findMany({
    where: {
      deliveryStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
      OR: [
        { batchId: null, items: { none: {} } },
        { items: { some: { batchId: null } } },
      ],
    },
    select: {
      id: true,
      batchId: true,
      flavor: true,
      totalLiters: true,
      items: {
        select: {
          flavor: true,
          totalLiters: true,
          batchId: true,
        },
      },
    },
  });

  const mappedBatches = batches.map((b) => {
    const soldLitersFromItems = b.orderItems.reduce((sum, i) => sum + i.totalLiters, 0);
    const legacyOrdersSold = b.orders
      .filter((o) => !b.orderItems.some((it) => it.orderId === o.id))
      .reduce((sum, o) => sum + o.totalLiters, 0);
    const totalSoldLiters = soldLitersFromItems + legacyOrdersSold;
    const totalSoldBottles = b.orders.reduce((sum, o) => sum + o.quantityBottles, 0);
    const totalRevenue = b.orders.reduce((sum, o) => sum + o.totalAmount, 0);

    const totalDischargedLiters = (b.discharges || []).reduce((sum, d) => sum + d.totalLiters, 0);
    const partnerConsumptionLiters = (b.discharges || [])
      .filter((d) => d.reasonType === 'CONSUMO_SOCIO')
      .reduce((sum, d) => sum + d.totalLiters, 0);
    const partnerConsumptionAmount = (b.discharges || [])
      .filter((d) => d.reasonType === 'CONSUMO_SOCIO')
      .reduce((sum, d) => sum + d.totalAmount, 0);
    const otherDischargedLiters = totalDischargedLiters - partnerConsumptionLiters;

    // Calcular preventa de este sabor
    const bFlavorNorm = (b.flavor || '').toLowerCase().trim();
    let unassignedOrdersCount = 0;
    let unassignedLiters = 0;

    for (const uo of unassignedOrders) {
      if (uo.items && uo.items.length > 0) {
        const unassignedItems = uo.items.filter(
          (it) => it.batchId == null && (it.flavor || '').toLowerCase().trim().includes(bFlavorNorm)
        );
        if (unassignedItems.length > 0) {
          unassignedOrdersCount++;
          unassignedLiters += unassignedItems.reduce((sum, it) => sum + it.totalLiters, 0);
        }
      } else if (uo.batchId == null) {
        const oFlavorNorm = (uo.flavor || '').toLowerCase().trim();
        if (oFlavorNorm.includes(bFlavorNorm) || bFlavorNorm.includes(oFlavorNorm)) {
          unassignedOrdersCount++;
          unassignedLiters += uo.totalLiters;
        }
      }
    }

    const remainingAvailableLiters = Math.max(0, b.totalLitersProduced - totalSoldLiters - totalDischargedLiters);
    const unpackagedLiters = Math.max(0, b.totalLitersProduced - (b.packagedLiters || 0));

    return {
      ...b,
      totalSoldLiters,
      totalSoldBottles,
      totalRevenue,
      totalDischargedLiters,
      partnerConsumptionLiters,
      partnerConsumptionAmount,
      otherDischargedLiters,
      unassignedOrdersCount,
      unassignedLiters,
      remainingAvailableLiters,
      unpackagedLiters,
    };
  });

  return {
    data: mappedBatches,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Obtener detalle de un lote por ID
 */
export const getBatchById = async (id: number) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id },
    include: {
      itemsUsed: {
        include: {
          rawMaterial: true,
        },
      },
      orders: {
        include: {
          customer: true,
          items: true,
          payments: true,
        },
        orderBy: { orderDate: 'desc' },
      },
      orderItems: {
        include: {
          order: {
            include: {
              customer: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      discharges: {
        include: {
          staffMember: {
            select: {
              id: true,
              fullName: true,
              role: true,
              type: true,
            },
          },
        },
        orderBy: { dischargeDate: 'desc' },
      },
    },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  return batch;
};

/**
 * Calcular el siguiente correlativo libre diario para lote madre o fraccionamiento
 */
export const getNextBatchCode = async (query: NextCodeQueryInput) => {
  const { date, batchId } = query;
  const dateObj = date ? parseColombiaDate(date) : new Date();
  const dateStr = getColombiaDateStr(dateObj).replace(/-/g, '');

  if (batchId) {
    const batch = await prisma.productionBatch.findUnique({
      where: { id: Number(batchId) },
      include: { packagings: true },
    });
    if (!batch) {
      throw new NotFoundError('Lote no encontrado');
    }

    let maxPkgSeq = 0;
    for (const p of batch.packagings) {
      if (p.packagingCode) {
        const parts = p.packagingCode.split('-F');
        if (parts.length === 2) {
          const s = parseInt(parts[1], 10);
          if (!isNaN(s) && s > maxPkgSeq) maxPkgSeq = s;
        }
      }
    }
    if (maxPkgSeq === 0) {
      maxPkgSeq = batch.packagings.length;
    }
    const nextPkgSeq = maxPkgSeq + 1;
    const nextPackagingCode = `${batch.batchCode}-F${String(nextPkgSeq).padStart(2, '0')}`;

    return {
      batchCode: batch.batchCode,
      nextPackagingCode,
    };
  }

  // Correlativo lote madre: LOTE-YYYYMMDD-01, LOTE-YYYYMMDD-02, ...
  const todayBatches = await prisma.productionBatch.findMany({
    where: {
      batchCode: {
        startsWith: `LOTE-${dateStr}`,
      },
    },
    select: { batchCode: true },
  });

  let maxSeq = 0;
  for (const b of todayBatches) {
    const parts = b.batchCode.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  let nextSeq = maxSeq + 1;
  let batchCode = `LOTE-${dateStr}-${String(nextSeq).padStart(2, '0')}`;
  while (await prisma.productionBatch.findUnique({ where: { batchCode } })) {
    nextSeq++;
    batchCode = `LOTE-${dateStr}-${String(nextSeq).padStart(2, '0')}`;
  }

  return {
    nextBatchCode: batchCode,
    date: getColombiaDateStr(dateObj),
  };
};

/**
 * Cambio rápido de estado de 1 toque (EN_FERMENTACION <-> DISPONIBLE)
 */
export const patchBatchStatus = async (id: number, data: PatchBatchStatusInput) => {
  return await prisma.$transaction(async (tx) => {
    const batch = await tx.productionBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundError('Lote no encontrado');
    }

    if (data.status === 'EN_FERMENTACION') {
      return await tx.productionBatch.update({
        where: { id },
        data: { status: 'EN_FERMENTACION' },
      });
    }

    if (data.status === 'DISPONIBLE') {
      await tx.productionBatch.update({
        where: { id },
        data: { status: 'DISPONIBLE' },
      });
      return await syncBatchStatusBidirectional(tx, id);
    }

    return batch;
  });
};

/**
 * Crear lote de producción con validación de inventario y descuento atómico ($transaction)
 */
export const createBatch = async (data: CreateBatchInput) => {
  const {
    milkUsedLiters,
    totalLitersProduced: customTotalLiters,
    bottles1LProduced,
    bottles2LProduced,
    flavor,
    cultureType,
    fermentationHours,
    initialSugarGrams,
    powderedMilkGrams,
    preparationDate,
    expirationDate,
    notes,
    registeredBy,
    useSugar,
    sugarGramsPerLiter,
    usePowderedMilk,
    powderedMilkGramsPerLiter,
    useLabels,
    extraItems,
    dynamicItems,
    price1L,
    price2L,
    status,
    autoLinkPendingOrders,
    linkOrderIds,
  } = data;

  const milkUsed = Number(milkUsedLiters);
  const b1L = Number(bottles1LProduced || 0);
  const b2L = Number(bottles2LProduced || 0);
  const bottleLiters = b1L * 1.0 + b2L * 2.0;

  if (isNaN(milkUsed) || milkUsed <= 0) {
    throw new BadRequestError('Debe ingresar la cantidad de litros de leche utilizados');
  }

  let totalLitersProduced = Number(customTotalLiters);
  if (isNaN(totalLitersProduced) || totalLitersProduced <= 0) {
    totalLitersProduced = bottleLiters > 0 ? bottleLiters : milkUsed;
  }

  const isFermenting = status === 'EN_FERMENTACION' || (b1L === 0 && b2L === 0 && (!status || status === 'EN_FERMENTACION'));
  const effectiveStatus = isFermenting ? 'EN_FERMENTACION' : (status || 'COMPLETADO');

  if (totalLitersProduced <= 0 && b1L <= 0 && b2L <= 0 && !isFermenting) {
    throw new BadRequestError('Debe ingresar los litros de yogur obtenidos o las botellas envasadas');
  }

  const yieldPercentage = Math.round((totalLitersProduced / milkUsed) * 10000) / 100;

  // 1. Validar Stock Obligatorio de Leche Líquida
  const milkMaterial = await prisma.rawMaterial.findFirst({
    where: {
      OR: [
        { code: 'LECHE' },
        { name: { contains: 'leche entera', mode: 'insensitive' } },
        { name: { contains: 'leche', mode: 'insensitive' } },
      ],
      NOT: { name: { contains: 'polvo', mode: 'insensitive' } },
      isActive: true,
    },
  });

  const currentMilkStock = milkMaterial ? milkMaterial.currentStock : 0;
  if (!milkMaterial || currentMilkStock < milkUsed) {
    throw new BadRequestError(
      `Stock insuficiente de leche líquida. Tienes ${currentMilkStock} L en inventario y requieres ${milkUsed} L. Registra compras de leche primero.`
    );
  }

  // 2. Validar Stock de Botellas 1L (Solo si no está en fermentación o se especifican botellas)
  if (!isFermenting && b1L > 0) {
    const bottle1L = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'BOTELLA_1L' },
          { name: { contains: '1 litro', mode: 'insensitive' } },
          { name: { contains: '1l', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const currentB1Stock = bottle1L ? bottle1L.currentStock : 0;
    if (!bottle1L || currentB1Stock < b1L) {
      throw new BadRequestError(
        `Stock insuficiente de botellas de 1L. Tienes ${currentB1Stock} und en inventario y requieres ${b1L} und. Registra compra de envases primero.`
      );
    }
  }

  // 3. Validar Stock de Botellas 2L (Solo si no está en fermentación o se especifican botellas)
  if (!isFermenting && b2L > 0) {
    const bottle2L = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'BOTELLA_2L' },
          { name: { contains: '2 litro', mode: 'insensitive' } },
          { name: { contains: '2l', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const currentB2Stock = bottle2L ? bottle2L.currentStock : 0;
    if (!bottle2L || currentB2Stock < b2L) {
      throw new BadRequestError(
        `Stock insuficiente de botellas de 2L. Tienes ${currentB2Stock} und en inventario y requieres ${b2L} und. Registra compra de envases primero.`
      );
    }
  }

  // 4. Validar Stock de Azúcar
  const shouldUseSugar = useSugar !== false;
  const sugarGramsPerL = sugarGramsPerLiter !== undefined ? Number(sugarGramsPerLiter) : 80;
  const totalSugarGrams = shouldUseSugar ? sugarGramsPerL * milkUsed : 0;

  let sugarMaterial = null;
  if (shouldUseSugar && totalSugarGrams > 0) {
    sugarMaterial = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'AZUCAR' },
          { name: { contains: 'azucar', mode: 'insensitive' } },
          { name: { contains: 'azúcar', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    if (sugarMaterial) {
      const sugarQtyNeeded = isKgUnit(sugarMaterial.unit) ? totalSugarGrams / 1000 : totalSugarGrams;
      if (sugarMaterial.currentStock < sugarQtyNeeded) {
        const unitLabel = isKgUnit(sugarMaterial.unit) ? 'kg' : 'g';
        throw new BadRequestError(
          `Stock insuficiente de azúcar. Tienes ${sugarMaterial.currentStock} ${unitLabel} en inventario y requieres ${totalSugarGrams} g (${sugarQtyNeeded.toFixed(2)} ${unitLabel}). Registra la compra de azúcar primero.`
        );
      }
    }
  }

  // 5. Validar Stock de Leche en Polvo
  const shouldUsePowderedMilk = usePowderedMilk !== false;
  const powderedMilkGramsPerL = powderedMilkGramsPerLiter !== undefined ? Number(powderedMilkGramsPerLiter) : 30;
  const totalPowderedMilkGrams = shouldUsePowderedMilk ? powderedMilkGramsPerL * milkUsed : 0;

  let powderedMilkMaterial = null;
  if (shouldUsePowderedMilk && totalPowderedMilkGrams > 0) {
    powderedMilkMaterial = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'LECHE_POLVO' },
          { name: { contains: 'polvo', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    if (powderedMilkMaterial) {
      const powderQtyNeeded = isKgUnit(powderedMilkMaterial.unit) ? totalPowderedMilkGrams / 1000 : totalPowderedMilkGrams;
      if (powderedMilkMaterial.currentStock < powderQtyNeeded) {
        const unitLabel = isKgUnit(powderedMilkMaterial.unit) ? 'kg' : 'g';
        throw new BadRequestError(
          `Stock insuficiente de leche en polvo. Tienes ${powderedMilkMaterial.currentStock} ${unitLabel} en inventario y requieres ${totalPowderedMilkGrams} g (${powderQtyNeeded.toFixed(2)} ${unitLabel}). Registra la compra de leche en polvo primero.`
        );
      }
    }
  }

  // Generar código de lote correlativo único
  const dateObj = parseColombiaDate(preparationDate);
  const dateStr = getColombiaDateStr(dateObj).replace(/-/g, '');

  const todayBatches = await prisma.productionBatch.findMany({
    where: {
      batchCode: {
        startsWith: `LOTE-${dateStr}`,
      },
    },
    select: { batchCode: true },
  });

  let maxSeq = 0;
  for (const b of todayBatches) {
    const parts = b.batchCode.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  let nextSeq = maxSeq + 1;
  let batchCode = `LOTE-${dateStr}-${String(nextSeq).padStart(2, '0')}`;
  while (await prisma.productionBatch.findUnique({ where: { batchCode } })) {
    nextSeq++;
    batchCode = `LOTE-${dateStr}-${String(nextSeq).padStart(2, '0')}`;
  }

  return await prisma.$transaction(async (tx) => {
    let totalBatchCost = 0;
    const usageRecords: Array<{
      rawMaterialId: number;
      quantityUsed: number;
      unitCost: number;
      totalCost: number;
    }> = [];

    // 1. Descontar Leche Líquida
    const milkMat = await tx.rawMaterial.findUnique({ where: { id: milkMaterial.id } });
    if (milkMat) {
      const unitCost = milkMat.avgCost || 0;
      const cost = milkUsed * unitCost;
      totalBatchCost += cost;

      usageRecords.push({
        rawMaterialId: milkMat.id,
        quantityUsed: milkUsed,
        unitCost,
        totalCost: cost,
      });

      await tx.rawMaterial.update({
        where: { id: milkMat.id },
        data: { currentStock: Math.max(0, milkMat.currentStock - milkUsed) },
      });
    }

    // 2. Descontar Azúcar
    if (shouldUseSugar && totalSugarGrams > 0 && sugarMaterial) {
      const sugarMat = await tx.rawMaterial.findUnique({ where: { id: sugarMaterial.id } });
      if (sugarMat) {
        let qtyToDeduct = totalSugarGrams;
        let itemCost = 0;

        if (isKgUnit(sugarMat.unit)) {
          qtyToDeduct = Number((totalSugarGrams / 1000).toFixed(4));
          itemCost = qtyToDeduct * (sugarMat.avgCost || 0);
        } else {
          itemCost = totalSugarGrams * (sugarMat.avgCost || 0);
        }

        totalBatchCost += itemCost;

        usageRecords.push({
          rawMaterialId: sugarMat.id,
          quantityUsed: qtyToDeduct,
          unitCost: sugarMat.avgCost || 0,
          totalCost: itemCost,
        });

        await tx.rawMaterial.update({
          where: { id: sugarMat.id },
          data: { currentStock: Math.max(0, sugarMat.currentStock - qtyToDeduct) },
        });
      }
    }

    // 3. Descontar Leche en Polvo
    if (shouldUsePowderedMilk && totalPowderedMilkGrams > 0 && powderedMilkMaterial) {
      const powderMat = await tx.rawMaterial.findUnique({ where: { id: powderedMilkMaterial.id } });
      if (powderMat) {
        let qtyToDeduct = totalPowderedMilkGrams;
        let itemCost = 0;

        if (isKgUnit(powderMat.unit)) {
          qtyToDeduct = Number((totalPowderedMilkGrams / 1000).toFixed(4));
          itemCost = qtyToDeduct * (powderMat.avgCost || 0);
        } else {
          itemCost = totalPowderedMilkGrams * (powderMat.avgCost || 0);
        }

        totalBatchCost += itemCost;

        usageRecords.push({
          rawMaterialId: powderMat.id,
          quantityUsed: qtyToDeduct,
          unitCost: powderMat.avgCost || 0,
          totalCost: itemCost,
        });

        await tx.rawMaterial.update({
          where: { id: powderMat.id },
          data: { currentStock: Math.max(0, powderMat.currentStock - qtyToDeduct) },
        });
      }
    }

    // 4. Descontar Botellas 1L (Solo si no está en fermentación)
    if (!isFermenting && b1L > 0) {
      const bottle1L = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'BOTELLA_1L' },
            { name: { contains: '1 litro', mode: 'insensitive' } },
            { name: { contains: '1l', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });

      if (bottle1L) {
        const unitCost = bottle1L.avgCost || 0;
        const cost = b1L * unitCost;
        totalBatchCost += cost;

        usageRecords.push({
          rawMaterialId: bottle1L.id,
          quantityUsed: b1L,
          unitCost,
          totalCost: cost,
        });

        await tx.rawMaterial.update({
          where: { id: bottle1L.id },
          data: { currentStock: Math.max(0, bottle1L.currentStock - b1L) },
        });
      }
    }

    // 5. Descontar Botellas 2L (Solo si no está en fermentación)
    if (!isFermenting && b2L > 0) {
      const bottle2L = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'BOTELLA_2L' },
            { name: { contains: '2 litro', mode: 'insensitive' } },
            { name: { contains: '2l', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });

      if (bottle2L) {
        const unitCost = bottle2L.avgCost || 0;
        const cost = b2L * unitCost;
        totalBatchCost += cost;

        usageRecords.push({
          rawMaterialId: bottle2L.id,
          quantityUsed: b2L,
          unitCost,
          totalCost: cost,
        });

        await tx.rawMaterial.update({
          where: { id: bottle2L.id },
          data: { currentStock: Math.max(0, bottle2L.currentStock - b2L) },
        });
      }
    }

    // 6. Descontar Etiquetas si aplica (Solo si no está en fermentación)
    const totalBottles = b1L + b2L;
    const shouldUseLabels = useLabels !== false;

    if (!isFermenting && shouldUseLabels && totalBottles > 0) {
      const labelMaterial = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'ETIQUETA' },
            { name: { contains: 'etiqueta', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });

      if (labelMaterial && labelMaterial.currentStock > 0) {
        const qtyToDeduct = Math.min(totalBottles, labelMaterial.currentStock);
        const unitCost = labelMaterial.avgCost || 0;
        const cost = qtyToDeduct * unitCost;
        totalBatchCost += cost;

        usageRecords.push({
          rawMaterialId: labelMaterial.id,
          quantityUsed: qtyToDeduct,
          unitCost,
          totalCost: cost,
        });

        await tx.rawMaterial.update({
          where: { id: labelMaterial.id },
          data: { currentStock: Math.max(0, labelMaterial.currentStock - qtyToDeduct) },
        });
      }
    }

    // 7. Descontar insumos extras
    if (Array.isArray(extraItems) && extraItems.length > 0) {
      for (const item of extraItems) {
        const matId = Number(item.rawMaterialId);
        const qty = Number(item.quantityUsed);
        const unitInput = String(item.unit || '').toLowerCase().trim();

        if (matId && qty > 0) {
          const material = await tx.rawMaterial.findUnique({ where: { id: matId } });
          if (material) {
            let qtyToDeduct = qty;
            let itemCost = 0;

            if (isKgUnit(material.unit) && (unitInput === 'g' || unitInput === 'gramos' || unitInput === 'gr')) {
              qtyToDeduct = Number((qty / 1000).toFixed(4));
              itemCost = qtyToDeduct * (material.avgCost || 0);
            } else if (isGramUnit(material.unit) && (unitInput === 'kg' || unitInput === 'kilos' || unitInput === 'kilogramos')) {
              qtyToDeduct = qty * 1000;
              itemCost = qtyToDeduct * (material.avgCost || 0);
            } else {
              qtyToDeduct = qty;
              itemCost = qtyToDeduct * (material.avgCost || 0);
            }

            totalBatchCost += itemCost;

            usageRecords.push({
              rawMaterialId: matId,
              quantityUsed: qtyToDeduct,
              unitCost: material.avgCost || 0,
              totalCost: itemCost,
            });

            await tx.rawMaterial.update({
              where: { id: matId },
              data: { currentStock: Math.max(0, material.currentStock - qtyToDeduct) },
            });
          }
        }
      }
    }

    // 7.1 Descontar insumos dinámicos de checklist
    if (Array.isArray(dynamicItems) && dynamicItems.length > 0) {
      for (const item of dynamicItems) {
        const matId = Number(item.rawMaterialId);
        const qty = Number(item.quantityUsed);
        if (matId && qty > 0) {
          const material = await tx.rawMaterial.findUnique({ where: { id: matId } });
          if (material) {
            if (material.currentStock < qty) {
              throw new BadRequestError(
                `Stock insuficiente del insumo "${material.name}". Hay ${material.currentStock} ${material.unit} y requieres ${qty}.`
              );
            }
            const unitCost = Number(item.unitCost) || material.avgCost || 0;
            const itemCost = qty * unitCost;
            totalBatchCost += itemCost;

            usageRecords.push({
              rawMaterialId: matId,
              quantityUsed: qty,
              unitCost,
              totalCost: itemCost,
            });

            await tx.rawMaterial.update({
              where: { id: matId },
              data: { currentStock: Math.max(0, material.currentStock - qty) },
            });
          }
        }
      }
    }

    const costPerLiter = totalLitersProduced > 0 ? Math.round(totalBatchCost / totalLitersProduced) : 0;

    const batch = await tx.productionBatch.create({
      data: {
        batchCode,
        milkUsedLiters: milkUsed,
        bottles1LProduced: b1L,
        bottles2LProduced: b2L,
        totalLitersProduced,
        packagedLiters: bottleLiters,
        yieldPercentage,
        flavor: flavor ? flavor.trim() : 'Natural',
        cultureType: cultureType || null,
        fermentationHours: fermentationHours !== undefined ? Number(fermentationHours) : 8,
        initialSugarGrams: shouldUseSugar ? totalSugarGrams : 0,
        powderedMilkGrams: shouldUsePowderedMilk ? totalPowderedMilkGrams : 0,
        price1L: price1L !== undefined && Number(price1L) > 0 ? Number(price1L) : 12000,
        price2L: price2L !== undefined && Number(price2L) > 0 ? Number(price2L) : 24000,
        preparationDate: dateObj,
        expirationDate: expirationDate ? parseColombiaDate(expirationDate) : null,
        totalCost: totalBatchCost,
        costPerLiter,
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
        status: effectiveStatus,
        isActive: true,
        itemsUsed: {
          create: usageRecords,
        },
      },
      include: {
        itemsUsed: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    // 8. Auto-vincular pedidos si se solicita (Solo si NO está en fermentación)
    const shouldAutoLink = autoLinkPendingOrders === true;
    const hasSpecificOrders = Array.isArray(linkOrderIds) && linkOrderIds.length > 0;

    if (!isFermenting && (shouldAutoLink || hasSpecificOrders)) {
      let targetOrderIds: number[] = [];
      if (hasSpecificOrders) {
        targetOrderIds = linkOrderIds.map(Number).filter((id: number) => !isNaN(id) && id > 0);
      } else if (shouldAutoLink) {
        const pending = await tx.order.findMany({
          where: {
            batchId: null,
            deliveryStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
            OR: [
              { flavor: { contains: batch.flavor, mode: 'insensitive' } },
              { items: { some: { flavor: { contains: batch.flavor, mode: 'insensitive' } } } },
            ],
          },
          select: { id: true },
        });
        targetOrderIds = pending.map((p) => p.id);
      }

      if (targetOrderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: targetOrderIds } },
          data: { batchId: batch.id },
        });

        await tx.orderItem.updateMany({
          where: {
            orderId: { in: targetOrderIds },
            OR: [
              { flavor: { contains: batch.flavor, mode: 'insensitive' } },
              { batchId: null },
            ],
          },
          data: { batchId: batch.id },
        });

        await syncBatchStatusBidirectional(tx, batch.id);
      }
    }

    return batch;
  });
};

/**
 * Actualizar lote de producción con sincronización delta de inventario
 */
export const updateBatch = async (id: number, data: UpdateBatchInput) => {
  return await prisma.$transaction(async (tx) => {
    const currentBatch = await tx.productionBatch.findUnique({
      where: { id },
      include: { itemsUsed: true, packagings: true },
    });

    if (!currentBatch) {
      throw new NotFoundError('Lote no encontrado');
    }

    const {
      milkUsedLiters,
      totalLitersProduced: customTotalLiters,
      bottles1LProduced,
      bottles2LProduced,
      flavor,
      cultureType,
      fermentationHours,
      preparationDate,
      expirationDate,
      notes,
      registeredBy,
      status,
      price1L,
      price2L,
      dynamicItems,
    } = data;

    let totalBatchCost = currentBatch.totalCost || 0;

    // 1. Delta Leche Líquida
    let newMilk = currentBatch.milkUsedLiters;
    if (milkUsedLiters !== undefined && Number(milkUsedLiters) > 0) {
      newMilk = Number(milkUsedLiters);
      const deltaMilk = newMilk - currentBatch.milkUsedLiters;

      if (Math.abs(deltaMilk) > 0.001) {
        const milkMaterial = await tx.rawMaterial.findFirst({
          where: {
            OR: [
              { code: 'LECHE' },
              { name: { contains: 'leche entera', mode: 'insensitive' } },
              { name: { contains: 'leche', mode: 'insensitive' } },
            ],
            NOT: { name: { contains: 'polvo', mode: 'insensitive' } },
            isActive: true,
          },
        });

        if (milkMaterial) {
          if (deltaMilk > 0 && milkMaterial.currentStock < deltaMilk) {
            throw new BadRequestError(
              `Stock insuficiente de leche para el incremento. Tienes ${milkMaterial.currentStock} L y requieres ${deltaMilk} L adicionales.`
            );
          }

          const unitCost = milkMaterial.avgCost || 0;
          const costDiff = deltaMilk * unitCost;
          totalBatchCost += costDiff;

          // Ajustar stock de leche
          await tx.rawMaterial.update({
            where: { id: milkMaterial.id },
            data: { currentStock: Math.max(0, milkMaterial.currentStock - deltaMilk) },
          });

          // Actualizar registro de uso de leche
          const milkUsage = currentBatch.itemsUsed.find((u) => u.rawMaterialId === milkMaterial.id);
          if (milkUsage) {
            await tx.batchItemUsage.update({
              where: { id: milkUsage.id },
              data: {
                quantityUsed: newMilk,
                totalCost: Math.max(0, newMilk * (milkUsage.unitCost || unitCost)),
              },
            });
          } else {
            await tx.batchItemUsage.create({
              data: {
                batchId: id,
                rawMaterialId: milkMaterial.id,
                quantityUsed: newMilk,
                unitCost,
                totalCost: newMilk * unitCost,
              },
            });
          }
        }
      }
    }

    // 2. Delta de Insumos Dinámicos
    if (Array.isArray(dynamicItems)) {
      const milkMaterial = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'LECHE' },
            { name: { contains: 'leche entera', mode: 'insensitive' } },
            { name: { contains: 'leche', mode: 'insensitive' } },
          ],
          NOT: { name: { contains: 'polvo', mode: 'insensitive' } },
          isActive: true,
        },
      });
      const milkMatId = milkMaterial?.id;

      // Insumos no lácteos actuales
      const nonMilkUsages = currentBatch.itemsUsed.filter((u) => u.rawMaterialId !== milkMatId);
      const incomingMatIds = new Set(dynamicItems.map((d) => Number(d.rawMaterialId)));

      // A. Insumos eliminados (estaban antes pero ya no vienen)
      for (const usage of nonMilkUsages) {
        if (!incomingMatIds.has(usage.rawMaterialId)) {
          await tx.rawMaterial.update({
            where: { id: usage.rawMaterialId },
            data: { currentStock: { increment: usage.quantityUsed } },
          });
          totalBatchCost -= usage.totalCost;
          await tx.batchItemUsage.delete({ where: { id: usage.id } });
        }
      }

      // B. Insumos agregados o modificados
      for (const item of dynamicItems) {
        const matId = Number(item.rawMaterialId);
        const newQty = Number(item.quantityUsed);
        if (!matId || newQty < 0) continue;

        const existingUsage = nonMilkUsages.find((u) => u.rawMaterialId === matId);
        const material = await tx.rawMaterial.findUnique({ where: { id: matId } });
        if (!material) continue;

        const unitCost = Number(item.unitCost) || material.avgCost || 0;

        if (existingUsage) {
          const deltaQty = newQty - existingUsage.quantityUsed;
          if (Math.abs(deltaQty) > 0.0001) {
            if (deltaQty > 0 && material.currentStock < deltaQty) {
              throw new BadRequestError(
                `Stock insuficiente de "${material.name}". Hay ${material.currentStock} ${material.unit} y requieres ${deltaQty} adicionales.`
              );
            }
            await tx.rawMaterial.update({
              where: { id: matId },
              data: { currentStock: Math.max(0, material.currentStock - deltaQty) },
            });
            const oldCost = existingUsage.totalCost;
            const newCost = newQty * unitCost;
            totalBatchCost = totalBatchCost - oldCost + newCost;

            await tx.batchItemUsage.update({
              where: { id: existingUsage.id },
              data: {
                quantityUsed: newQty,
                unitCost,
                totalCost: newCost,
              },
            });
          }
        } else if (newQty > 0) {
          if (material.currentStock < newQty) {
            throw new BadRequestError(
              `Stock insuficiente de "${material.name}". Hay ${material.currentStock} ${material.unit} y requieres ${newQty}.`
            );
          }
          await tx.rawMaterial.update({
            where: { id: matId },
            data: { currentStock: Math.max(0, material.currentStock - newQty) },
          });
          const itemCost = newQty * unitCost;
          totalBatchCost += itemCost;

          await tx.batchItemUsage.create({
            data: {
              batchId: id,
              rawMaterialId: matId,
              quantityUsed: newQty,
              unitCost,
              totalCost: itemCost,
            },
          });
        }
      }
    }

    const newB1L = bottles1LProduced !== undefined ? Number(bottles1LProduced) : currentBatch.bottles1LProduced;
    const newB2L = bottles2LProduced !== undefined ? Number(bottles2LProduced) : currentBatch.bottles2LProduced;
    const bottleLiters = newB1L * 1.0 + newB2L * 2.0;

    const newTotalLiters =
      customTotalLiters !== undefined && Number(customTotalLiters) > 0
        ? Number(customTotalLiters)
        : bottleLiters > 0
        ? bottleLiters
        : currentBatch.totalLitersProduced;

    const newYield = newMilk > 0 ? Math.round((newTotalLiters / newMilk) * 10000) / 100 : 0;
    const newCostPerLiter = newTotalLiters > 0 ? Math.round(totalBatchCost / newTotalLiters) : 0;

    const updated = await tx.productionBatch.update({
      where: { id },
      data: {
        milkUsedLiters: newMilk,
        bottles1LProduced: newB1L,
        bottles2LProduced: newB2L,
        totalLitersProduced: newTotalLiters,
        yieldPercentage: newYield,
        totalCost: Math.max(0, totalBatchCost),
        costPerLiter: newCostPerLiter,
        flavor: flavor !== undefined ? flavor.trim() : undefined,
        cultureType: cultureType !== undefined ? cultureType : undefined,
        fermentationHours: fermentationHours !== undefined ? Number(fermentationHours) : undefined,
        price1L: price1L !== undefined && Number(price1L) > 0 ? Number(price1L) : undefined,
        price2L: price2L !== undefined && Number(price2L) > 0 ? Number(price2L) : undefined,
        preparationDate: preparationDate ? parseColombiaDate(preparationDate) : undefined,
        expirationDate: expirationDate ? parseColombiaDate(expirationDate) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        registeredBy: registeredBy !== undefined ? (registeredBy ? registeredBy.trim() : undefined) : undefined,
        status: status !== undefined ? String(status).trim() : undefined,
      },
      include: {
        itemsUsed: {
          include: { rawMaterial: true },
        },
        packagings: true,
      },
    });

    await syncBatchStatusBidirectional(tx, id);
    return updated;
  });
};

/**
 * Desactivar lote con reversión opcional de stock y desvinculación atómica ($transaction)
 */
export const deactivateBatch = async (id: number, data: DeactivateBatchInput) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id },
    include: { itemsUsed: true },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  const { reason, restoreStock, unlinkOrders } = data;
  let unlinkedCount = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Restaurar inventario si se solicita
    if (restoreStock === true && batch.itemsUsed.length > 0) {
      for (const item of batch.itemsUsed) {
        const mat = await tx.rawMaterial.findUnique({ where: { id: item.rawMaterialId } });
        if (mat) {
          await tx.rawMaterial.update({
            where: { id: item.rawMaterialId },
            data: { currentStock: mat.currentStock + item.quantityUsed },
          });
        }
      }
    }

    // 2. Desvincular pedidos asociados (vuelven a Preventa sin lote)
    const shouldUnlink = unlinkOrders !== false;
    if (shouldUnlink) {
      const orderUpdate = await tx.order.updateMany({
        where: { batchId: id },
        data: { batchId: null },
      });
      await tx.orderItem.updateMany({
        where: { batchId: id },
        data: { batchId: null },
      });
      unlinkedCount = orderUpdate.count;
    }

    // 3. Desactivar el lote
    await tx.productionBatch.update({
      where: { id },
      data: {
        isActive: false,
        deactivationReason: reason ? reason.trim() : 'Desactivado por el usuario',
        status: 'DESACTIVADO',
      },
    });
  });

  const msg =
    unlinkedCount > 0
      ? `Lote desactivado correctamente. Se liberaron ${unlinkedCount} pedido(s) como encargos preventa sin lote.`
      : 'Lote desactivado correctamente';

  return { message: msg, id, unlinkedCount };
};

/**
 * Consultar pedidos preventa pendientes sin lote por sabor
 */
export const getPendingOrdersByFlavor = async (flavor?: string) => {
  const allUnassigned = await prisma.order.findMany({
    where: {
      deliveryStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
      OR: [
        { batchId: null, items: { none: {} } },
        { items: { some: { batchId: null } } },
      ],
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          address: true,
        },
      },
      items: true,
    },
    orderBy: { orderDate: 'asc' },
  });

  const targetFlavor =
    flavor && typeof flavor === 'string' && flavor.trim() !== '' && flavor.toUpperCase() !== 'ALL'
      ? flavor.trim().toLowerCase()
      : null;

  const pendingOrders = allUnassigned.filter((o) => {
    if (o.items && o.items.length > 0) {
      return o.items.some(
        (it) => it.batchId === null && (!targetFlavor || (it.flavor || '').toLowerCase().includes(targetFlavor))
      );
    }
    if (o.batchId === null) {
      return !targetFlavor || (o.flavor || '').toLowerCase().includes(targetFlavor);
    }
    return false;
  });

  let totalLiters = 0;
  let totalAmount = 0;

  for (const o of pendingOrders) {
    if (o.items && o.items.length > 0) {
      const unassignedItems = o.items.filter(
        (it) => it.batchId === null && (!targetFlavor || (it.flavor || '').toLowerCase().includes(targetFlavor))
      );
      totalLiters += unassignedItems.reduce((sum, it) => sum + it.totalLiters, 0);
      totalAmount += unassignedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    } else {
      totalLiters += o.totalLiters;
      totalAmount += o.totalAmount;
    }
  }

  return {
    count: pendingOrders.length,
    totalLiters,
    totalAmount,
    orders: pendingOrders,
  };
};

/**
 * Vincular pedidos masivamente a un lote existente ($transaction)
 */
export const linkOrdersToBatch = async (id: number, data: LinkOrdersToBatchInput) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  if (batch.status === 'EN_FERMENTACION') {
    throw new BadRequestError(
      `No es posible vincular pedidos al lote "${batch.batchCode}" porque se encuentra en etapa de FERMENTACIÓN BASE. Solo se pueden vincular pedidos a lotes fraccionados y disponibles.`
    );
  }

  const { orderIds, autoAll } = data;
  let targetOrderIds: number[] = [];

  if (Array.isArray(orderIds) && orderIds.length > 0) {
    targetOrderIds = orderIds.map(Number);
  } else if (autoAll === true || (!orderIds && autoAll !== false)) {
    const pending = await prisma.order.findMany({
      where: {
        batchId: null,
        deliveryStatus: { notIn: ['DELIVERED', 'CANCELLED'] },
        OR: [
          { flavor: { contains: batch.flavor, mode: 'insensitive' } },
          { items: { some: { flavor: { contains: batch.flavor, mode: 'insensitive' } } } },
        ],
      },
      select: { id: true },
    });
    targetOrderIds = pending.map((p) => p.id);
  }

  if (targetOrderIds.length === 0) {
    return {
      message: 'No se encontraron encargos pendientes para vincular.',
      linkedCount: 0,
      linkedLiters: 0,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { id: { in: targetOrderIds } },
      data: { batchId: batch.id },
    });

    await tx.orderItem.updateMany({
      where: {
        orderId: { in: targetOrderIds },
        OR: [
          { flavor: { contains: batch.flavor, mode: 'insensitive' } },
          { batchId: null },
        ],
      },
      data: { batchId: batch.id },
    });
  });

  const linkedOrders = await prisma.order.findMany({
    where: { id: { in: targetOrderIds } },
    select: { totalLiters: true },
  });
  const linkedLiters = linkedOrders.reduce((sum, o) => sum + o.totalLiters, 0);

  return {
    message: `¡${targetOrderIds.length} pedido(s) (${linkedLiters} L) vinculados exitosamente al lote ${batch.batchCode}!`,
    linkedCount: targetOrderIds.length,
    linkedLiters,
  };
};

/**
 * Registrar descarga o merma de lote con balance lácteo y atomicidad ($transaction)
 */
export const createBatchDischarge = async (id: number, data: CreateBatchDischargeInput) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id },
    include: {
      orders: { select: { id: true, totalLiters: true } },
      orderItems: { select: { id: true, orderId: true, totalLiters: true } },
      discharges: true,
    },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  const {
    bottleSize,
    quantityBottles,
    totalLiters,
    unitPrice,
    reasonType,
    staffMemberId,
    dischargeDate,
    notes,
    registeredBy,
  } = data;

  const soldLitersFromItems = batch.orderItems.reduce((sum, i) => sum + i.totalLiters, 0);
  const legacyOrdersSold = batch.orders
    .filter((o) => !batch.orderItems.some((it) => it.orderId === o.id))
    .reduce((sum, o) => sum + o.totalLiters, 0);
  const totalSoldLiters = soldLitersFromItems + legacyOrdersSold;
  const totalDischargedLiters = batch.discharges.reduce((sum, d) => sum + d.totalLiters, 0);
  const remainingAvailableLiters = Math.max(0, batch.totalLitersProduced - totalSoldLiters - totalDischargedLiters);

  const size = (bottleSize || '1L').toUpperCase().trim();
  const qtyBottles = Math.max(1, Number(quantityBottles) || 1);
  let litersToDischarge = Number(totalLiters);
  if (!litersToDischarge || litersToDischarge <= 0) {
    litersToDischarge = size === '2L' ? qtyBottles * 2 : qtyBottles * 1;
  }

  if (litersToDischarge > remainingAvailableLiters + 0.001) {
    throw new BadRequestError(
      `No hay suficientes litros disponibles en este lote. Disponibles: ${remainingAvailableLiters.toFixed(1)}L, solicitados: ${litersToDischarge.toFixed(1)}L`
    );
  }

  const defaultUnitPrice = size === '2L' ? (batch.price2L || 24000) : (batch.price1L || 12000);
  const effectiveUnitPrice = Number(unitPrice) > 0 ? Number(unitPrice) : defaultUnitPrice;
  const totalAmount = size === '2L' ? qtyBottles * effectiveUnitPrice : litersToDischarge * effectiveUnitPrice;

  const effectiveReason = reasonType || 'CONSUMO_SOCIO';
  let staffMember: any = null;
  if (effectiveReason === 'CONSUMO_SOCIO') {
    if (!staffMemberId) {
      throw new BadRequestError('Debes seleccionar el socio que realiza el retiro');
    }
    staffMember = await prisma.staffMember.findUnique({
      where: { id: Number(staffMemberId) },
    });
    if (!staffMember) {
      throw new NotFoundError('Socio no encontrado');
    }
  }

  const effectiveDischargeDate = dischargeDate ? new Date(dischargeDate) : new Date();
  const effectiveRegisteredBy = registeredBy ? String(registeredBy).trim() : 'Edier';

  return await prisma.$transaction(async (tx) => {
    const createdDischarge = await tx.batchDischarge.create({
      data: {
        batchId: batch.id,
        bottleSize: size,
        quantityBottles: qtyBottles,
        totalLiters: litersToDischarge,
        unitPrice: effectiveUnitPrice,
        totalAmount: totalAmount,
        reasonType: effectiveReason,
        staffMemberId: staffMember ? staffMember.id : null,
        staffPaymentId: null,
        notes: notes ? String(notes).trim() : null,
        registeredBy: effectiveRegisteredBy,
        dischargeDate: effectiveDischargeDate,
      },
      include: {
        staffMember: {
          select: {
            id: true,
            fullName: true,
            role: true,
            type: true,
          },
        },
      },
    });

    await syncBatchStatusBidirectional(tx, batch.id);

    return {
      message: `Retiro de ${litersToDischarge}L registrado exitosamente en el lote #${batch.batchCode}`,
      discharge: createdDischarge,
      remainingAvailableLiters: Math.max(0, remainingAvailableLiters - litersToDischarge),
    };
  });
};

/**
 * Anular y revertir un retiro de lote reintegrando los litros ($transaction)
 */
export const deleteBatchDischarge = async (dischargeId: number) => {
  const discharge = await prisma.batchDischarge.findUnique({
    where: { id: dischargeId },
    include: { batch: true },
  });

  if (!discharge) {
    throw new NotFoundError('Retiro no encontrado');
  }

  return await prisma.$transaction(async (tx) => {
    if (discharge.staffPaymentId) {
      await tx.staffPayment.deleteMany({
        where: { id: discharge.staffPaymentId },
      });
    }

    await tx.batchDischarge.delete({
      where: { id: discharge.id },
    });

    await syncBatchStatusBidirectional(tx, discharge.batchId);

    return {
      message: `Retiro de ${discharge.totalLiters}L revertido y reintegrado al lote #${discharge.batch.batchCode}`,
      id: dischargeId,
      batchId: discharge.batchId,
    };
  });
};

/**
 * Registrar fraccionamiento / envasado por sabor (Fase B)
 */
export const createBatchPackaging = async (batchId: number, input: BatchPackagingInput) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  if (!batch.isActive) {
    throw new BadRequestError('No se puede envasar un lote inactivo o archivado');
  }

  const {
    flavor,
    bottles1L,
    bottles2L,
    fruitRawMaterialId,
    fruitQuantityUsed,
    notes,
    packagedBy,
    packagedAt,
    linkOrderIds,
  } = input;

  const b1L = Math.max(0, Number(bottles1L) || 0);
  const b2L = Math.max(0, Number(bottles2L) || 0);
  const totalPackagingLiters = b1L * 1.0 + b2L * 2.0;

  if (totalPackagingLiters <= 0) {
    throw new BadRequestError('Debes ingresar al menos una botella de 1L o 2L para envasar');
  }

  const currentPackaged = batch.packagedLiters || 0;
  const availableUnpackaged = Math.max(0, batch.totalLitersProduced - currentPackaged);

  if (totalPackagingLiters > availableUnpackaged + 0.05) {
    throw new BadRequestError(
      `Volumen insuficiente para envasar. Hay ${availableUnpackaged.toFixed(1)}L sin envasar y solicitas ${totalPackagingLiters.toFixed(1)}L.`
    );
  }

  // 1. Validar Stock de Botellas 1L
  let bottle1LMat: any = null;
  if (b1L > 0) {
    bottle1LMat = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'BOTELLA_1L' },
          { name: { contains: '1 litro', mode: 'insensitive' } },
          { name: { contains: '1l', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const currentStock = bottle1LMat ? bottle1LMat.currentStock : 0;
    if (!bottle1LMat || currentStock < b1L) {
      throw new BadRequestError(
        `Stock insuficiente de botellas 1L. Tienes ${currentStock} y requieres ${b1L}.`
      );
    }
  }

  // 2. Validar Stock de Botellas 2L
  let bottle2LMat: any = null;
  if (b2L > 0) {
    bottle2LMat = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'BOTELLA_2L' },
          { name: { contains: '2 litro', mode: 'insensitive' } },
          { name: { contains: '2l', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const currentStock = bottle2LMat ? bottle2LMat.currentStock : 0;
    if (!bottle2LMat || currentStock < b2L) {
      throw new BadRequestError(
        `Stock insuficiente de botellas 2L. Tienes ${currentStock} y requieres ${b2L}.`
      );
    }
  }

  // 3. Validar Stock de Fruta / Mermelada (si aplica)
  let fruitMat: any = null;
  const fruitQty = Number(fruitQuantityUsed) || 0;
  if (fruitRawMaterialId && fruitQty > 0) {
    fruitMat = await prisma.rawMaterial.findUnique({
      where: { id: Number(fruitRawMaterialId) },
    });

    if (!fruitMat) {
      throw new NotFoundError('Insumo de fruta no encontrado');
    }

    if (fruitMat.currentStock < fruitQty) {
      throw new BadRequestError(
        `Stock insuficiente de fruta "${fruitMat.name}". Tienes ${fruitMat.currentStock} ${fruitMat.unit} y requieres ${fruitQty}.`
      );
    }
  }

  // 4. Transacción atómica
  return await prisma.$transaction(async (tx) => {
    let packagingCost = 0;
    const totalBottles = b1L + b2L;

    // Descontar botellas 1L
    if (b1L > 0 && bottle1LMat) {
      const unitCost = bottle1LMat.avgCost || 0;
      packagingCost += b1L * unitCost;
      await tx.rawMaterial.update({
        where: { id: bottle1LMat.id },
        data: { currentStock: Math.max(0, bottle1LMat.currentStock - b1L) },
      });
    }

    // Descontar botellas 2L
    if (b2L > 0 && bottle2LMat) {
      const unitCost = bottle2LMat.avgCost || 0;
      packagingCost += b2L * unitCost;
      await tx.rawMaterial.update({
        where: { id: bottle2LMat.id },
        data: { currentStock: Math.max(0, bottle2LMat.currentStock - b2L) },
      });
    }

    // Descontar tapas
    if (totalBottles > 0) {
      const capMat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'TAPA' },
            { name: { contains: 'tapa', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (capMat && capMat.currentStock > 0) {
        const qtyToDeduct = Math.min(totalBottles, capMat.currentStock);
        packagingCost += qtyToDeduct * (capMat.avgCost || 0);
        await tx.rawMaterial.update({
          where: { id: capMat.id },
          data: { currentStock: Math.max(0, capMat.currentStock - qtyToDeduct) },
        });
      }
    }

    // Descontar etiquetas
    if (totalBottles > 0) {
      const labelMat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'ETIQUETA' },
            { name: { contains: 'etiqueta', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (labelMat && labelMat.currentStock > 0) {
        const qtyToDeduct = Math.min(totalBottles, labelMat.currentStock);
        packagingCost += qtyToDeduct * (labelMat.avgCost || 0);
        await tx.rawMaterial.update({
          where: { id: labelMat.id },
          data: { currentStock: Math.max(0, labelMat.currentStock - qtyToDeduct) },
        });
      }
    }

    // Descontar fruta
    let fruitUnitCost = 0;
    if (fruitMat && fruitQty > 0) {
      fruitUnitCost = fruitMat.avgCost || 0;
      packagingCost += fruitQty * fruitUnitCost;
      await tx.rawMaterial.update({
        where: { id: fruitMat.id },
        data: { currentStock: Math.max(0, fruitMat.currentStock - fruitQty) },
      });
    }

    // Generar packagingCode: LOTE-YYYYMMDD-01-F01, etc.
    let maxPkgSeq = 0;
    const existingPkgs = await tx.batchPackaging.findMany({
      where: { batchId },
      select: { packagingCode: true },
    });
    for (const p of existingPkgs) {
      if (p.packagingCode) {
        const parts = p.packagingCode.split('-F');
        if (parts.length === 2) {
          const s = parseInt(parts[1], 10);
          if (!isNaN(s) && s > maxPkgSeq) maxPkgSeq = s;
        }
      }
    }
    const nextPkgSeq = (maxPkgSeq || existingPkgs.length) + 1;
    const packagingCode = `${batch.batchCode}-F${String(nextPkgSeq).padStart(2, '0')}`;

    // Crear registro de envasado
    const packaging = await tx.batchPackaging.create({
      data: {
        batchId,
        packagingCode,
        flavor: flavor.trim(),
        bottles1L: b1L,
        bottles2L: b2L,
        totalLiters: totalPackagingLiters,
        fruitRawMaterialId: fruitMat ? fruitMat.id : null,
        fruitQuantityUsed: fruitQty,
        fruitUnitCost,
        packagingCost,
        notes: notes ? notes.trim() : null,
        packagedBy: packagedBy || 'Edier',
        packagedAt: packagedAt ? parseColombiaDate(packagedAt) : new Date(),
      },
    });

    // Actualizar lote
    const updatedPackagedLiters = currentPackaged + totalPackagingLiters;
    const updatedB1L = (batch.bottles1LProduced || 0) + b1L;
    const updatedB2L = (batch.bottles2LProduced || 0) + b2L;
    const updatedTotalCost = (batch.totalCost || 0) + packagingCost;
    const updatedCostPerLiter = batch.totalLitersProduced > 0 ? Math.round(updatedTotalCost / batch.totalLitersProduced) : 0;

    let updatedStatus = batch.status;
    if (batch.status === 'EN_FERMENTACION') {
      updatedStatus = 'DISPONIBLE';
    }

    const updatedBatch = await tx.productionBatch.update({
      where: { id: batchId },
      data: {
        bottles1LProduced: updatedB1L,
        bottles2LProduced: updatedB2L,
        packagedLiters: updatedPackagedLiters,
        totalCost: updatedTotalCost,
        costPerLiter: updatedCostPerLiter,
        status: updatedStatus,
      },
    });

    // 5. Vincular pre-ventas si se seleccionaron
    if (Array.isArray(linkOrderIds) && linkOrderIds.length > 0) {
      const validOrderIds = linkOrderIds.map(Number).filter((id) => !isNaN(id) && id > 0);
      if (validOrderIds.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: validOrderIds } },
          data: { batchId },
        });

        await tx.orderItem.updateMany({
          where: {
            orderId: { in: validOrderIds },
            OR: [
              { flavor: { contains: flavor.trim(), mode: 'insensitive' } },
              { batchId: null },
            ],
          },
          data: { batchId },
        });
      }
    }

    // 6. Sincronizar estado bidireccional
    await syncBatchStatusBidirectional(tx, batchId);

    return {
      message: `¡Envasado de ${totalPackagingLiters}L (${flavor}) registrado exitosamente!`,
      packaging,
      batch: updatedBatch,
    };
  });
};

/**
 * Actualizar fraccionamiento de Fase B con balance delta de envases e insumos
 */
export const updateBatchPackaging = async (packagingId: number, data: UpdateBatchPackagingInput) => {
  return await prisma.$transaction(async (tx) => {
    const pkg = await tx.batchPackaging.findUnique({
      where: { id: packagingId },
      include: { batch: true },
    });

    if (!pkg) {
      throw new NotFoundError('Registro de envasado no encontrado');
    }

    const {
      flavor,
      bottles1L,
      bottles2L,
      fruitRawMaterialId,
      fruitQuantityUsed,
      notes,
      packagedBy,
      packagedAt,
    } = data;

    const oldB1L = pkg.bottles1L;
    const oldB2L = pkg.bottles2L;
    const newB1L = bottles1L !== undefined ? Number(bottles1L) : oldB1L;
    const newB2L = bottles2L !== undefined ? Number(bottles2L) : oldB2L;

    const oldPkgLiters = pkg.totalLiters;
    const newPkgLiters = newB1L * 1.0 + newB2L * 2.0;
    const deltaLiters = newPkgLiters - oldPkgLiters;

    // Validar volumen total del lote madre
    const batch = pkg.batch;
    const newPackagedLiters = (batch.packagedLiters || 0) + deltaLiters;
    if (newPackagedLiters > batch.totalLitersProduced + 0.05) {
      throw new BadRequestError(
        `Volumen insuficiente para el ajuste de envasado. El lote tiene ${batch.totalLitersProduced}L totales y el ajuste llevaría a ${newPackagedLiters.toFixed(1)}L envasados.`
      );
    }

    let deltaPackagingCost = 0;

    // Delta Botellas 1L
    const delta1L = newB1L - oldB1L;
    if (delta1L !== 0) {
      const b1Mat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'BOTELLA_1L' },
            { name: { contains: '1 litro', mode: 'insensitive' } },
            { name: { contains: '1l', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (b1Mat) {
        if (delta1L > 0 && b1Mat.currentStock < delta1L) {
          throw new BadRequestError(`Stock insuficiente de botellas 1L. Tienes ${b1Mat.currentStock} y requieres ${delta1L} adicionales.`);
        }
        await tx.rawMaterial.update({
          where: { id: b1Mat.id },
          data: { currentStock: Math.max(0, b1Mat.currentStock - delta1L) },
        });
        deltaPackagingCost += delta1L * (b1Mat.avgCost || 0);
      }
    }

    // Delta Botellas 2L
    const delta2L = newB2L - oldB2L;
    if (delta2L !== 0) {
      const b2Mat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'BOTELLA_2L' },
            { name: { contains: '2 litro', mode: 'insensitive' } },
            { name: { contains: '2l', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (b2Mat) {
        if (delta2L > 0 && b2Mat.currentStock < delta2L) {
          throw new BadRequestError(`Stock insuficiente de botellas 2L. Tienes ${b2Mat.currentStock} y requieres ${delta2L} adicionales.`);
        }
        await tx.rawMaterial.update({
          where: { id: b2Mat.id },
          data: { currentStock: Math.max(0, b2Mat.currentStock - delta2L) },
        });
        deltaPackagingCost += delta2L * (b2Mat.avgCost || 0);
      }
    }

    // Delta Tapas y Etiquetas si cambiaron las botellas totales
    const deltaTotalBottles = (newB1L + newB2L) - (oldB1L + oldB2L);
    if (deltaTotalBottles !== 0) {
      const capMat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'TAPA' },
            { name: { contains: 'tapa', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (capMat) {
        await tx.rawMaterial.update({
          where: { id: capMat.id },
          data: { currentStock: Math.max(0, capMat.currentStock - deltaTotalBottles) },
        });
        deltaPackagingCost += deltaTotalBottles * (capMat.avgCost || 0);
      }

      const labelMat = await tx.rawMaterial.findFirst({
        where: {
          OR: [
            { code: 'ETIQUETA' },
            { name: { contains: 'etiqueta', mode: 'insensitive' } },
          ],
          isActive: true,
        },
      });
      if (labelMat) {
        await tx.rawMaterial.update({
          where: { id: labelMat.id },
          data: { currentStock: Math.max(0, labelMat.currentStock - deltaTotalBottles) },
        });
        deltaPackagingCost += deltaTotalBottles * (labelMat.avgCost || 0);
      }
    }

    // Delta Fruta / Mermelada
    let targetFruitId = fruitRawMaterialId !== undefined ? (fruitRawMaterialId ? Number(fruitRawMaterialId) : null) : pkg.fruitRawMaterialId;
    let targetFruitQty = fruitQuantityUsed !== undefined ? Number(fruitQuantityUsed) : (pkg.fruitQuantityUsed || 0);
    let fruitUnitCost = pkg.fruitUnitCost || 0;

    if (pkg.fruitRawMaterialId !== targetFruitId || (pkg.fruitQuantityUsed || 0) !== targetFruitQty) {
      if (pkg.fruitRawMaterialId && (pkg.fruitQuantityUsed || 0) > 0) {
        await tx.rawMaterial.update({
          where: { id: pkg.fruitRawMaterialId },
          data: { currentStock: { increment: pkg.fruitQuantityUsed! } },
        });
      }
      if (targetFruitId && targetFruitQty > 0) {
        const newFruitMat = await tx.rawMaterial.findUnique({ where: { id: targetFruitId } });
        if (newFruitMat) {
          if (newFruitMat.currentStock < targetFruitQty) {
            throw new BadRequestError(`Stock insuficiente de fruta "${newFruitMat.name}".`);
          }
          await tx.rawMaterial.update({
            where: { id: targetFruitId },
            data: { currentStock: Math.max(0, newFruitMat.currentStock - targetFruitQty) },
          });
          fruitUnitCost = newFruitMat.avgCost || 0;
        }
      } else {
        targetFruitId = null;
        targetFruitQty = 0;
        fruitUnitCost = 0;
      }
    }

    const updatedPackaging = await tx.batchPackaging.update({
      where: { id: packagingId },
      data: {
        flavor: flavor !== undefined ? flavor.trim() : pkg.flavor,
        bottles1L: newB1L,
        bottles2L: newB2L,
        totalLiters: newPkgLiters,
        fruitRawMaterialId: targetFruitId,
        fruitQuantityUsed: targetFruitQty,
        fruitUnitCost,
        packagingCost: Math.max(0, (pkg.packagingCost || 0) + deltaPackagingCost),
        notes: notes !== undefined ? (notes ? notes.trim() : null) : pkg.notes,
        packagedBy: packagedBy !== undefined ? packagedBy.trim() : pkg.packagedBy,
        packagedAt: packagedAt ? parseColombiaDate(packagedAt) : pkg.packagedAt,
      },
    });

    await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        packagedLiters: Math.max(0, newPackagedLiters),
      },
    });

    await syncBatchStatusBidirectional(tx, batch.id);

    const updatedBatch = await tx.productionBatch.findUnique({
      where: { id: batch.id },
      include: { packagings: true },
    });

    return {
      message: 'Fraccionamiento actualizado exitosamente',
      packaging: updatedPackaging,
      batch: updatedBatch,
    };
  });
};

/**
 * Desvincular pedido de un lote (retornando a pre-venta)
 */
export const unlinkOrderFromBatch = async (batchId: number, orderId: number) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  return await prisma.$transaction(async (tx) => {
    if (order.batchId === batchId) {
      await tx.order.update({
        where: { id: orderId },
        data: { batchId: null },
      });
    }

    await tx.orderItem.updateMany({
      where: { orderId, batchId },
      data: { batchId: null },
    });

    // Recalcular saldo y reactivar lote a DISPONIBLE si estaba AGOTADO
    await syncBatchStatusBidirectional(tx, batchId);

    return {
      message: `Pedido #${order.orderNumber} desvinculado exitosamente del lote ${batch.batchCode}. El pedido regresó a pre-venta.`,
      batchId,
      orderId,
    };
  });
};

/**
 * Registrar retiro directo de socio
 */
export const recordPartnerWithdrawal = async (batchId: number, input: PartnerWithdrawalInput) => {
  return await createBatchDischarge(batchId, {
    bottleSize: input.bottleSize || '1L',
    quantityBottles: input.quantityBottles,
    staffMemberId: input.staffMemberId,
    reasonType: 'CONSUMO_SOCIO',
    notes: input.notes,
    registeredBy: input.registeredBy || 'Edier',
    dischargeDate: input.dischargeDate,
  });
};

/**
 * Obtener auditoría y resumen detallado del lote
 */
export const getBatchSummary = async (batchId: number) => {
  const batch = await prisma.productionBatch.findUnique({
    where: { id: batchId },
    include: {
      packagings: {
        orderBy: { packagedAt: 'desc' },
      },
      orders: {
        where: { deliveryStatus: { not: 'CANCELLED' } },
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true },
          },
          items: true,
        },
        orderBy: { orderDate: 'desc' },
      },
      orderItems: {
        where: { order: { deliveryStatus: { not: 'CANCELLED' } } },
        include: {
          order: {
            include: {
              customer: { select: { id: true, fullName: true } },
            },
          },
        },
      },
      discharges: {
        include: {
          staffMember: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { dischargeDate: 'desc' },
      },
      itemsUsed: {
        include: {
          rawMaterial: true,
        },
      },
    },
  });

  if (!batch) {
    throw new NotFoundError('Lote no encontrado');
  }

  const soldFromItems = batch.orderItems.reduce((sum, it) => sum + it.totalLiters, 0);
  const legacySold = batch.orders
    .filter((o) => !batch.orderItems.some((it) => it.orderId === o.id))
    .reduce((sum, o) => sum + o.totalLiters, 0);
  const totalSoldLiters = soldFromItems + legacySold;

  const totalSoldBottles1L = batch.orderItems
    .filter((it) => it.bottleSize === '1L')
    .reduce((sum, it) => sum + it.quantity, 0);
  const totalSoldBottles2L = batch.orderItems
    .filter((it) => it.bottleSize === '2L')
    .reduce((sum, it) => sum + it.quantity, 0);

  const totalDischargedLiters = batch.discharges.reduce((sum, d) => sum + d.totalLiters, 0);
  const partnerDischarges = batch.discharges.filter((d) => d.reasonType === 'CONSUMO_SOCIO');
  const partnerDischargedLiters = partnerDischarges.reduce((sum, d) => sum + d.totalLiters, 0);

  const remainingAvailableLiters = Math.max(0, batch.totalLitersProduced - totalSoldLiters - totalDischargedLiters);
  const unpackagedLiters = Math.max(0, batch.totalLitersProduced - (batch.packagedLiters || 0));

  const totalBottles1LProduced = batch.bottles1LProduced || 0;
  const totalBottles2LProduced = batch.bottles2LProduced || 0;
  const dischargedBottles1L = batch.discharges
    .filter((d) => d.bottleSize === '1L')
    .reduce((sum, d) => sum + d.quantityBottles, 0);
  const dischargedBottles2L = batch.discharges
    .filter((d) => d.bottleSize === '2L')
    .reduce((sum, d) => sum + d.quantityBottles, 0);

  const freeBottles1L = Math.max(0, totalBottles1LProduced - totalSoldBottles1L - dischargedBottles1L);
  const freeBottles2L = Math.max(0, totalBottles2LProduced - totalSoldBottles2L - dischargedBottles2L);

  return {
    batch: {
      id: batch.id,
      batchCode: batch.batchCode,
      flavor: batch.flavor,
      status: batch.status,
      isActive: batch.isActive,
      preparationDate: batch.preparationDate,
      expirationDate: batch.expirationDate,
      notes: batch.notes,
      registeredBy: batch.registeredBy,
      cultureType: batch.cultureType,
    },
    rawMaterialsBalance: {
      milkUsedLiters: batch.milkUsedLiters,
      totalLitersProduced: batch.totalLitersProduced,
      packagedLiters: batch.packagedLiters || 0,
      unpackagedLiters,
      yieldPercentage: batch.yieldPercentage,
      totalCost: batch.totalCost,
      costPerLiter: batch.costPerLiter,
    },
    bottlesBreakdown: {
      total1L: totalBottles1LProduced,
      total2L: totalBottles2LProduced,
      sold1L: totalSoldBottles1L,
      sold2L: totalSoldBottles2L,
      discharged1L: dischargedBottles1L,
      discharged2L: dischargedBottles2L,
      free1L: freeBottles1L,
      free2L: freeBottles2L,
    },
    volumeBalance: {
      totalProduced: batch.totalLitersProduced,
      totalSold: totalSoldLiters,
      totalDischarged: totalDischargedLiters,
      partnerConsumed: partnerDischargedLiters,
      remainingAvailable: remainingAvailableLiters,
    },
    packagings: batch.packagings,
    linkedOrders: batch.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      totalAmount: o.totalAmount,
      totalLiters: o.totalLiters,
      quantityBottles: o.quantityBottles,
      deliveryStatus: o.deliveryStatus,
      paymentStatus: o.paymentStatus,
      orderDate: o.orderDate,
      items: o.items,
    })),
    discharges: batch.discharges,
    itemsUsed: batch.itemsUsed,
  };
};
