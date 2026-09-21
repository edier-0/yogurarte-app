import prisma from '../../prisma.js';
import { getColombiaDateStr, parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  BatchesQueryInput,
  CreateBatchDischargeInput,
  CreateBatchInput,
  DeactivateBatchInput,
  LinkOrdersToBatchInput,
  UpdateBatchInput,
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
 * Obtener listado de lotes enriquecidos con balance lácteo, ventas y preventa
 */
export const getBatches = async (query: BatchesQueryInput) => {
  const { status, includeInactive, lite } = query;

  const whereClause: any = {};
  if (includeInactive !== 'true') {
    whereClause.isActive = true;
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    whereClause.status = status;
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
        totalSoldLiters,
        totalDischargedLiters,
        remainingAvailableLiters,
        bottles1LProduced: b.bottles1LProduced,
        bottles2LProduced: b.bottles2LProduced,
        preparationDate: b.preparationDate,
      };
    });
  }

  const batches = await prisma.productionBatch.findMany({
    where: whereClause,
    include: {
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
  });

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

  return batches.map((b) => {
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
    };
  });
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
 * Crear lote de producción con validación de inventario y descuento atómico ($transaction)
 */
export const createBatch = async (data: CreateBatchInput) => {
  const {
    milkUsedLiters,
    totalLitersProduced: customTotalLiters,
    bottles1LProduced,
    bottles2LProduced,
    flavor,
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

  if (totalLitersProduced <= 0 && b1L <= 0 && b2L <= 0) {
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

  // 2. Validar Stock de Botellas 1L
  if (b1L > 0) {
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

  // 3. Validar Stock de Botellas 2L
  if (b2L > 0) {
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

    // 4. Descontar Botellas 1L
    if (b1L > 0) {
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

    // 5. Descontar Botellas 2L
    if (b2L > 0) {
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

    // 6. Descontar Etiquetas si aplica
    const totalBottles = b1L + b2L;
    const shouldUseLabels = useLabels !== false;

    if (shouldUseLabels && totalBottles > 0) {
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

    const costPerLiter = totalLitersProduced > 0 ? Math.round(totalBatchCost / totalLitersProduced) : 0;

    const batch = await tx.productionBatch.create({
      data: {
        batchCode,
        milkUsedLiters: milkUsed,
        bottles1LProduced: b1L,
        bottles2LProduced: b2L,
        totalLitersProduced,
        yieldPercentage,
        flavor: flavor ? flavor.trim() : 'Natural',
        price1L: price1L !== undefined && Number(price1L) > 0 ? Number(price1L) : 12000,
        price2L: price2L !== undefined && Number(price2L) > 0 ? Number(price2L) : 24000,
        preparationDate: dateObj,
        expirationDate: expirationDate ? parseColombiaDate(expirationDate) : null,
        totalCost: totalBatchCost,
        costPerLiter,
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
        status: status || 'COMPLETADO',
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

    // 8. Auto-vincular pedidos si se solicita
    const shouldAutoLink = autoLinkPendingOrders === true;
    const hasSpecificOrders = Array.isArray(linkOrderIds) && linkOrderIds.length > 0;

    if (shouldAutoLink || hasSpecificOrders) {
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
      }
    }

    return batch;
  });
};

/**
 * Actualizar lote de producción
 */
export const updateBatch = async (id: number, data: UpdateBatchInput) => {
  const currentBatch = await prisma.productionBatch.findUnique({
    where: { id },
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
    preparationDate,
    expirationDate,
    notes,
    status,
    price1L,
    price2L,
  } = data;

  const newMilk = milkUsedLiters !== undefined ? Number(milkUsedLiters) : currentBatch.milkUsedLiters;
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
  const newCostPerLiter = newTotalLiters > 0 ? Math.round(currentBatch.totalCost / newTotalLiters) : 0;

  return prisma.productionBatch.update({
    where: { id },
    data: {
      milkUsedLiters: newMilk,
      bottles1LProduced: newB1L,
      bottles2LProduced: newB2L,
      totalLitersProduced: newTotalLiters,
      yieldPercentage: newYield,
      costPerLiter: newCostPerLiter,
      flavor: flavor !== undefined ? flavor.trim() : undefined,
      price1L: price1L !== undefined && Number(price1L) > 0 ? Number(price1L) : undefined,
      price2L: price2L !== undefined && Number(price2L) > 0 ? Number(price2L) : undefined,
      preparationDate: preparationDate ? parseColombiaDate(preparationDate) : undefined,
      expirationDate: expirationDate ? parseColombiaDate(expirationDate) : undefined,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
      status: status !== undefined ? String(status).trim() : undefined,
    },
    include: {
      itemsUsed: {
        include: { rawMaterial: true },
      },
    },
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

    const newRemaining = Math.max(0, remainingAvailableLiters - litersToDischarge);
    if (newRemaining <= 0.05 && batch.status === 'COMPLETADO') {
      await tx.productionBatch.update({
        where: { id: batch.id },
        data: { status: 'AGOTADO' },
      });
    }

    return {
      message: `Retiro de ${litersToDischarge}L registrado exitosamente en el lote #${batch.batchCode}`,
      discharge: createdDischarge,
      remainingAvailableLiters: newRemaining,
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

    if (discharge.batch.status === 'AGOTADO') {
      await tx.productionBatch.update({
        where: { id: discharge.batchId },
        data: { status: 'COMPLETADO' },
      });
    }

    return {
      message: `Retiro de ${discharge.totalLiters}L revertido y reintegrado al lote #${discharge.batch.batchCode}`,
      id: dischargeId,
      batchId: discharge.batchId,
    };
  });
};
