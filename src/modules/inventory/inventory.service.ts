import prisma from '../../prisma.js';
import { parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  AdjustStockInput,
  AdjustmentsQueryInput,
  CreateMaterialInput,
  CreatePurchaseInput,
  MaterialsQueryInput,
  PurchasesQueryInput,
  UpdateMaterialInput,
  UpdatePurchaseInput,
} from './inventory.schema.js';

// ============================================================================
// 1. GESTIÓN DE MATERIAS PRIMAS E INSUMOS (RAW MATERIALS)
// ============================================================================

/**
 * Obtener listado de insumos enriquecidos con alerta de bajo stock
 */
export const getMaterials = async (query: MaterialsQueryInput) => {
  const { includeInactive, search, category, page, limit, paginate } = query;

  const whereClause: any = {};
  if (includeInactive !== 'true') {
    whereClause.isActive = true;
  }

  if (category && category !== 'ALL') {
    whereClause.category = category;
  }

  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ];
  }

  const isPaginated = page !== undefined || paginate === 'true';
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || (isPaginated ? 20 : 200)));

  const totalItems = await prisma.rawMaterial.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  const materials = await prisma.rawMaterial.findMany({
    where: whereClause,
    orderBy: { category: 'asc' },
    skip: isPaginated ? (pageNum - 1) * limitNum : undefined,
    take: limitNum,
  });

  const materialsWithAlert = materials.map((m) => ({
    ...m,
    isLowStock: m.currentStock <= m.minStockAlert,
  }));

  if (isPaginated) {
    return {
      items: materialsWithAlert,
      pagination: {
        totalItems,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    };
  }

  return materialsWithAlert;
};

/**
 * Crear un nuevo insumo o materia prima con código normalizado
 */
export const createMaterial = async (data: CreateMaterialInput) => {
  const { code, name, category, unit, minStockAlert, avgCost, currentStock } = data;

  if (!name || !unit) {
    throw new BadRequestError('El nombre y la unidad son obligatorios');
  }

  const generatedCode = code
    ? code.toUpperCase().trim()
    : name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 20);

  return prisma.rawMaterial.create({
    data: {
      code: generatedCode,
      name: name.trim(),
      category: category || 'INSUMO',
      unit: unit.trim(),
      minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : 10,
      avgCost: avgCost !== undefined ? Number(avgCost) : 0,
      currentStock: currentStock !== undefined ? Number(currentStock) : 0,
      isActive: true,
    },
  });
};

/**
 * Actualizar datos de un insumo existente
 */
export const updateMaterial = async (id: number, data: UpdateMaterialInput) => {
  const existing = await prisma.rawMaterial.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Insumo no encontrado');
  }

  const { name, category, unit, minStockAlert, avgCost, currentStock } = data;

  return prisma.rawMaterial.update({
    where: { id },
    data: {
      name: name ? name.trim() : undefined,
      category: category ? category : undefined,
      unit: unit ? unit.trim() : undefined,
      minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : undefined,
      avgCost: avgCost !== undefined ? Number(avgCost) : undefined,
      currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
    },
  });
};

/**
 * Desactivación lógica (soft-delete) para preservar integridad con compras y lotes
 */
export const deleteMaterial = async (id: number) => {
  const existing = await prisma.rawMaterial.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Insumo no encontrado');
  }

  await prisma.rawMaterial.update({
    where: { id },
    data: { isActive: false },
  });

  return { message: 'Insumo eliminado/desactivado correctamente' };
};

// ============================================================================
// 2. COMPRAS DE INSUMOS Y COSTEO PROMEDIO PONDERADO (PURCHASES)
// ============================================================================

/**
 * Registrar compra de materia prima y actualizar stock y avgCost de forma atómica ($transaction)
 */
export const createPurchase = async (data: CreatePurchaseInput) => {
  const {
    rawMaterialId,
    quantity,
    unitCost,
    totalCost,
    supplier,
    purchaseDate,
    paymentMethod,
    notes,
    registeredBy,
  } = data;

  const parsedQty = Number(quantity);
  let parsedUnitCost = Number(unitCost);
  let parsedTotalCost = Number(totalCost);

  if (!rawMaterialId || isNaN(parsedQty) || parsedQty <= 0) {
    throw new BadRequestError('Debe ingresar una cantidad válida mayor a 0');
  }

  if (
    (isNaN(parsedUnitCost) || parsedUnitCost < 0) &&
    (isNaN(parsedTotalCost) || parsedTotalCost < 0)
  ) {
    throw new BadRequestError('Debe ingresar el costo unitario o el costo total de la compra');
  }

  if (parsedTotalCost > 0 && (!parsedUnitCost || parsedUnitCost <= 0)) {
    parsedUnitCost = parsedTotalCost / parsedQty;
  } else if (parsedUnitCost >= 0 && (!parsedTotalCost || parsedTotalCost <= 0)) {
    parsedTotalCost = parsedQty * parsedUnitCost;
  } else if (parsedTotalCost > 0 && parsedUnitCost > 0) {
    parsedUnitCost = parsedTotalCost / parsedQty;
  }

  const material = await prisma.rawMaterial.findUnique({
    where: { id: Number(rawMaterialId) },
  });

  if (!material) {
    throw new NotFoundError('Insumo no encontrado');
  }

  // Costo promedio ponderado (PMP)
  const newStock = material.currentStock + parsedQty;
  const currentTotalValue = material.currentStock * material.avgCost;
  const newTotalValue = currentTotalValue + parsedTotalCost;
  const newAvgCost =
    newStock > 0 ? Math.round(newTotalValue / newStock) : Math.round(parsedUnitCost);

  const dateObj = parseColombiaDate(purchaseDate);

  return await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        rawMaterialId: Number(rawMaterialId),
        quantity: parsedQty,
        unitCost: Math.round(parsedUnitCost * 100) / 100,
        totalCost: Math.round(parsedTotalCost),
        supplier: supplier ? supplier.trim() : null,
        purchaseDate: dateObj,
        paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
        notes: notes ? notes.trim() : null,
        registeredBy: registeredBy || 'Edier',
      },
    });

    await tx.rawMaterial.update({
      where: { id: Number(rawMaterialId) },
      data: {
        currentStock: newStock,
        avgCost: newAvgCost,
      },
    });

    return purchase;
  });
};

/**
 * Actualizar compra existente y recalcular stock de forma atómica ($transaction)
 */
export const updatePurchase = async (id: number, data: UpdatePurchaseInput) => {
  const currentPurchase = await prisma.purchase.findUnique({
    where: { id },
    include: { rawMaterial: true },
  });

  if (!currentPurchase) {
    throw new NotFoundError('Compra no encontrada');
  }

  const {
    supplier,
    quantity,
    unitCost,
    totalCost,
    purchaseDate,
    paymentMethod,
    notes,
  } = data;

  const newQty = quantity !== undefined ? Number(quantity) : currentPurchase.quantity;
  let newUnitCost = unitCost !== undefined ? Number(unitCost) : currentPurchase.unitCost;
  let newTotalCost =
    totalCost !== undefined ? Number(totalCost) : newQty * newUnitCost;

  if (totalCost !== undefined && Number(totalCost) > 0 && newQty > 0) {
    newTotalCost = Number(totalCost);
    newUnitCost = newTotalCost / newQty;
  } else if (unitCost !== undefined && Number(unitCost) > 0 && newQty > 0) {
    newUnitCost = Number(unitCost);
    newTotalCost = newQty * newUnitCost;
  }

  const qtyDiff = newQty - currentPurchase.quantity;

  return await prisma.$transaction(async (tx) => {
    const updatedPurchase = await tx.purchase.update({
      where: { id },
      data: {
        supplier: supplier !== undefined ? (supplier ? supplier.trim() : null) : currentPurchase.supplier,
        quantity: newQty,
        unitCost: Math.round(newUnitCost * 100) / 100,
        totalCost: Math.round(newTotalCost),
        purchaseDate: purchaseDate ? parseColombiaDate(purchaseDate) : currentPurchase.purchaseDate,
        paymentMethod:
          paymentMethod !== undefined ? paymentMethod.trim() : currentPurchase.paymentMethod,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : currentPurchase.notes,
      },
      include: {
        rawMaterial: true,
      },
    });

    await tx.rawMaterial.update({
      where: { id: currentPurchase.rawMaterialId },
      data: {
        currentStock: Math.max(0, currentPurchase.rawMaterial.currentStock + qtyDiff),
        avgCost: Math.round(newUnitCost),
      },
    });

    return updatedPurchase;
  });
};

/**
 * Eliminar compra y revertir stock atómicamente ($transaction)
 */
export const deletePurchase = async (id: number) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { rawMaterial: true },
  });

  if (!purchase) {
    throw new NotFoundError('Compra no encontrada');
  }

  await prisma.$transaction(async (tx) => {
    await tx.rawMaterial.update({
      where: { id: purchase.rawMaterialId },
      data: {
        currentStock: Math.max(0, purchase.rawMaterial.currentStock - purchase.quantity),
      },
    });

    await tx.purchase.delete({
      where: { id },
    });
  });

  return { message: 'Compra eliminada y stock revertido correctamente' };
};

/**
 * Obtener historial de compras con filtros
 */
export const getPurchasesHistory = async (query: PurchasesQueryInput) => {
  const { startDate, endDate, rawMaterialId } = query;

  const whereClause: any = {};

  if (rawMaterialId) {
    whereClause.rawMaterialId = Number(rawMaterialId);
  }

  if (startDate || endDate) {
    whereClause.purchaseDate = {};
    if (startDate && typeof startDate === 'string') {
      whereClause.purchaseDate.gte = new Date(`${startDate.split('T')[0]}T00:00:00.000Z`);
    }
    if (endDate && typeof endDate === 'string') {
      whereClause.purchaseDate.lte = new Date(`${endDate.split('T')[0]}T23:59:59.999Z`);
    }
  }

  return prisma.purchase.findMany({
    where: whereClause,
    include: {
      rawMaterial: {
        select: {
          name: true,
          unit: true,
          category: true,
        },
      },
    },
    orderBy: { purchaseDate: 'desc' },
    take: 100,
  });
};

// ============================================================================
// 3. AJUSTES DE INVENTARIO Y CONTROL DE KARDEX
// ============================================================================

/**
 * Registrar ajuste físico de stock con trazabilidad atómica ($transaction)
 */
export const adjustStock = async (id: number, data: AdjustStockInput) => {
  const materialId = Number(id || data.rawMaterialId);
  if (!materialId || isNaN(materialId)) {
    throw new BadRequestError('ID de insumo no válido');
  }

  const { newStock, type, reason, registeredBy, adjustmentDate } = data;

  const parsedStock = Number(newStock);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new BadRequestError('El stock debe ser un número válido mayor o igual a 0');
  }

  const material = await prisma.rawMaterial.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    throw new NotFoundError('Insumo no encontrado');
  }

  const previousStock = material.currentStock;
  const deltaQuantity = Math.round((parsedStock - previousStock) * 1000) / 1000;
  const unitCost = material.avgCost || 0;
  const totalCostImpact = Math.round(deltaQuantity * unitCost);
  const dateObj = parseColombiaDate(adjustmentDate);

  return await prisma.$transaction(async (tx) => {
    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        rawMaterialId: materialId,
        type: type ? String(type).trim() : deltaQuantity < 0 ? 'MERMA_DANO' : 'CONTEO_FISICO',
        previousStock,
        newStock: parsedStock,
        deltaQuantity,
        unit: material.unit,
        unitCost,
        totalCostImpact,
        reason: reason ? String(reason).trim() : null,
        registeredBy: registeredBy ? String(registeredBy).trim() : 'Edier',
        adjustmentDate: dateObj,
      },
      include: {
        rawMaterial: true,
      },
    });

    const updatedMaterial = await tx.rawMaterial.update({
      where: { id: materialId },
      data: {
        currentStock: parsedStock,
      },
    });

    return {
      message: 'Ajuste de inventario registrado correctamente',
      adjustment,
      material: updatedMaterial,
    };
  });
};

/**
 * Obtener historial de ajustes físicos de inventario
 */
export const getAdjustmentsHistory = async (query: AdjustmentsQueryInput) => {
  const { startDate, endDate, rawMaterialId, type } = query;

  const whereClause: any = {};

  if (rawMaterialId) {
    whereClause.rawMaterialId = Number(rawMaterialId);
  }

  if (type) {
    whereClause.type = String(type).trim();
  }

  if (startDate || endDate) {
    whereClause.adjustmentDate = {};
    if (startDate && typeof startDate === 'string') {
      whereClause.adjustmentDate.gte = new Date(`${startDate.split('T')[0]}T00:00:00.000Z`);
    }
    if (endDate && typeof endDate === 'string') {
      whereClause.adjustmentDate.lte = new Date(`${endDate.split('T')[0]}T23:59:59.999Z`);
    }
  }

  return prisma.inventoryAdjustment.findMany({
    where: whereClause,
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
    orderBy: { adjustmentDate: 'desc' },
    take: 150,
  });
};

/**
 * Eliminar ajuste de inventario y restaurar stock anterior ($transaction)
 */
export const deleteAdjustment = async (id: number) => {
  const adjustment = await prisma.inventoryAdjustment.findUnique({
    where: { id },
    include: { rawMaterial: true },
  });

  if (!adjustment) {
    throw new NotFoundError('Ajuste de inventario no encontrado');
  }

  const restoredStock = Math.max(
    0,
    Math.round((adjustment.rawMaterial.currentStock - adjustment.deltaQuantity) * 1000) / 1000
  );

  await prisma.$transaction(async (tx) => {
    await tx.rawMaterial.update({
      where: { id: adjustment.rawMaterialId },
      data: {
        currentStock: restoredStock,
      },
    });

    await tx.inventoryAdjustment.delete({
      where: { id },
    });
  });

  return {
    message: 'Ajuste eliminado y stock restaurado exitosamente',
    restoredStock,
    materialId: adjustment.rawMaterialId,
  };
};
