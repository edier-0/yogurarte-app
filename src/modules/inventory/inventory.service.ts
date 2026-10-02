import prisma from '../../prisma.js';
import { parseColombiaDate } from '../../utils/date.utils.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/appError.js';
import {
  AdjustStockInput,
  AdjustmentsQueryInput,
  InventoryMovementsQueryInput,
  CreateMaterialInput,
  CreatePurchaseInput,
  MaterialsQueryInput,
  PurchasesQueryInput,
  UpdateMaterialInput,
  UpdatePurchaseInput,
} from './inventory.schema.js';

import { createPreparation } from '../preparations/preparations.service.js';

// ============================================================================
// 1. GESTIÓN DE MATERIAS PRIMAS E INSUMOS (RAW MATERIALS)
// ============================================================================

/**
 * Obtener listado de insumos enriquecidos con alerta de bajo stock y recetas
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
    include: {
      recipeIngredients: {
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true,
              avgCost: true,
              currentStock: true,
            },
          },
        },
      },
    },
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
      data: materialsWithAlert,
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
 * Crear un nuevo insumo o materia prima (Simple o Compuesto por receta)
 */
export const createMaterial = async (data: CreateMaterialInput) => {
  const {
    code,
    name,
    category,
    unit,
    minStockAlert,
    avgCost,
    currentStock,
    isCompound,
    recipeYield,
    recipeIngredients,
  } = data;

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

  const cleanYield = Number(recipeYield) > 0 ? Number(recipeYield) : 1;
  let finalAvgCost = avgCost !== undefined ? Number(avgCost) : 0;

  // Si es un insumo compuesto con receta, calcular el costo de fabricación automáticamente en base al PMP
  if (isCompound && Array.isArray(recipeIngredients) && recipeIngredients.length > 0) {
    let totalRecipeCost = 0;
    for (const item of recipeIngredients) {
      const ing = await prisma.rawMaterial.findUnique({
        where: { id: Number(item.ingredientId) },
      });
      if (ing) {
        let qty = Number(item.quantity);
        const isIngKg = ing.unit.toLowerCase().includes('k') || ing.unit.toLowerCase().includes('kg');
        const isItemGram =
          (item.unit || '').toLowerCase().includes('g') && !(item.unit || '').toLowerCase().includes('k');
        if (isIngKg && isItemGram) {
          qty = qty / 1000;
        } else if (!isIngKg && (item.unit || '').toLowerCase().includes('k')) {
          qty = qty * 1000;
        }
        totalRecipeCost += qty * ing.avgCost;
      }
    }
    finalAvgCost = Math.round(totalRecipeCost / cleanYield);
  }

  return prisma.rawMaterial.create({
    data: {
      code: generatedCode,
      name: name.trim(),
      category: category || (isCompound ? 'INSUMO' : 'MATERIA_PRIMA'),
      unit: unit.trim(),
      minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : 10,
      avgCost: finalAvgCost,
      currentStock: currentStock !== undefined ? Number(currentStock) : 0,
      isCompound: Boolean(isCompound),
      recipeYield: cleanYield,
      isActive: true,
      recipeIngredients:
        isCompound && Array.isArray(recipeIngredients) && recipeIngredients.length > 0
          ? {
              create: recipeIngredients.map((item) => ({
                ingredientId: Number(item.ingredientId),
                quantity: Number(item.quantity),
                unit: item.unit || 'Kilogramos',
              })),
            }
          : undefined,
    },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });
};

/**
 * Actualizar datos de un insumo existente (incluyendo receta compuesta)
 */
export const updateMaterial = async (id: number, data: UpdateMaterialInput) => {
  const existing = await prisma.rawMaterial.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Insumo no encontrado');
  }

  const {
    name,
    category,
    unit,
    minStockAlert,
    avgCost,
    currentStock,
    isCompound,
    recipeYield,
    recipeIngredients,
  } = data;

  const cleanYield = Number(recipeYield) > 0 ? Number(recipeYield) : (existing.recipeYield || 1);
  let finalAvgCost = avgCost !== undefined ? Number(avgCost) : existing.avgCost;

  if (isCompound && Array.isArray(recipeIngredients) && recipeIngredients.length > 0) {
    let totalRecipeCost = 0;
    for (const item of recipeIngredients) {
      const ing = await prisma.rawMaterial.findUnique({
        where: { id: Number(item.ingredientId) },
      });
      if (ing) {
        let qty = Number(item.quantity);
        const isIngKg = ing.unit.toLowerCase().includes('k') || ing.unit.toLowerCase().includes('kg');
        const isItemGram =
          (item.unit || '').toLowerCase().includes('g') && !(item.unit || '').toLowerCase().includes('k');
        if (isIngKg && isItemGram) {
          qty = qty / 1000;
        } else if (!isIngKg && (item.unit || '').toLowerCase().includes('k')) {
          qty = qty * 1000;
        }
        totalRecipeCost += qty * ing.avgCost;
      }
    }
    finalAvgCost = Math.round(totalRecipeCost / cleanYield);
  }

  return prisma.$transaction(async (tx) => {
    if (isCompound !== undefined && Array.isArray(recipeIngredients)) {
      await tx.compoundRecipeItem.deleteMany({
        where: { compoundMaterialId: id },
      });

      if (recipeIngredients.length > 0) {
        await tx.compoundRecipeItem.createMany({
          data: recipeIngredients.map((item) => ({
            compoundMaterialId: id,
            ingredientId: Number(item.ingredientId),
            quantity: Number(item.quantity),
            unit: item.unit || 'Kilogramos',
          })),
        });
      }
    }

    return tx.rawMaterial.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        category: category ? category : undefined,
        unit: unit ? unit.trim() : undefined,
        minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : undefined,
        avgCost: finalAvgCost,
        currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
        isCompound: isCompound !== undefined ? Boolean(isCompound) : undefined,
        recipeYield: recipeYield !== undefined ? cleanYield : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });
  });
};

/**
 * Fabricación o preparación interna de un insumo compuesto
 * Descuenta ingredientes del inventario, suma stock producido y actualiza PMP.
 * REGLA CONTABLE: NO genera movimiento de egreso en Caja/Gastos.
 */
export const prepareCompoundMaterial = async (id: number, data: any) => {
  const { quantityToProduce, preparationDate, notes, registeredBy } = data;
  const producedQty = Number(quantityToProduce);
  if (!producedQty || producedQty <= 0) {
    throw new BadRequestError('La cantidad a preparar debe ser mayor a 0');
  }

  const compoundMaterial = await prisma.rawMaterial.findUnique({
    where: { id },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!compoundMaterial) {
    throw new NotFoundError('Insumo no encontrado');
  }

  if (!compoundMaterial.isCompound || compoundMaterial.recipeIngredients.length === 0) {
    throw new BadRequestError('Este insumo no tiene una receta de fabricación configurada');
  }

  const baseYield = compoundMaterial.recipeYield || 1;
  const ratio = producedQty / baseYield;

  const ingredients = compoundMaterial.recipeIngredients.map((ri) => ({
    rawMaterialId: ri.ingredientId,
    quantityUsed: ri.quantity * ratio,
    unitUsed: ri.unit,
  }));

  return createPreparation({
    outputMaterialId: compoundMaterial.id,
    quantityProduced: producedQty,
    unit: compoundMaterial.unit,
    preparationDate,
    notes: notes || `Fabricación interna de ${compoundMaterial.name}`,
    registeredBy,
    ingredients,
  });
};

/**
 * Eliminación híbrida de insumo:
 * - Si no tiene registros asociados: se elimina permanentemente de la base de datos.
 * - Si ya tiene registros históricos vinculados (compras, lotes, mermas, recetas): se desactiva (isActive: false)
 *   para preservar la trazabilidad contable y asegurar que no aparezca en ningún formulario del sistema.
 */
export const deleteMaterial = async (id: number) => {
  const existing = await prisma.rawMaterial.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          purchases: true,
          batchUsages: true,
          packagingUsages: true,
          adjustments: true,
          supplyPreparationsOutput: true,
          supplyPreparationsUsed: true,
          usedInRecipes: true,
        },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError('Insumo no encontrado');
  }

  // Verificar si está referenciado en fracciones de envasado
  const batchPackagingRef = await prisma.batchPackaging.findFirst({
    where: {
      OR: [
        { bottle1LRawMaterialId: id },
        { bottle2LRawMaterialId: id },
        { labelRawMaterialId: id },
        { fruitRawMaterialId: id },
      ],
    },
  });

  const hasAssociatedRecords =
    existing._count.purchases > 0 ||
    existing._count.batchUsages > 0 ||
    existing._count.packagingUsages > 0 ||
    existing._count.adjustments > 0 ||
    existing._count.supplyPreparationsOutput > 0 ||
    existing._count.supplyPreparationsUsed > 0 ||
    existing._count.usedInRecipes > 0 ||
    !!batchPackagingRef;

  if (hasAssociatedRecords) {
    // Desactivación lógica (soft-delete): ya no aparecerá en formularios
    await prisma.rawMaterial.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      action: 'DEACTIVATED',
      message: `El insumo "${existing.name}" tiene registros históricos asociados y ha sido desactivado para que no aparezca en los formularios.`,
    };
  }

  // Si no tiene ningún registro asociado, se elimina físicamente
  await prisma.compoundRecipeItem.deleteMany({
    where: { compoundMaterialId: id },
  });

  await prisma.rawMaterial.delete({
    where: { id },
  });

  return {
    success: true,
    action: 'DELETED',
    message: `El insumo "${existing.name}" ha sido eliminado permanentemente del sistema.`,
  };
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
    registerExpense,
    expenseCategory,
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

    let expense = null;
    if (registerExpense) {
      expense = await tx.expense.create({
        data: {
          category: expenseCategory || 'INSUMOS_EXTRA',
          description: `Compra de ${material.name} (${parsedQty} ${material.unit})`,
          amount: Math.round(parsedTotalCost),
          expenseDate: dateObj,
          paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
          supplier: supplier ? supplier.trim() : null,
          notes: notes ? notes.trim() : null,
          registeredBy: registeredBy || 'Edier',
        },
      });
    }

    return {
      ...purchase,
      expense,
      material: {
        id: material.id,
        name: material.name,
        currentStock: newStock,
        avgCost: newAvgCost,
      },
    };
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
    // 1. Revertir el stock en inventario
    await tx.rawMaterial.update({
      where: { id: purchase.rawMaterialId },
      data: {
        currentStock: Math.max(0, purchase.rawMaterial.currentStock - purchase.quantity),
      },
    });

    // 2. Buscar y eliminar gasto vinculado si se registró automáticamente en caja
    const pDate = purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : '';
    const matchingExpense = await tx.expense.findFirst({
      where: {
        amount: purchase.totalCost,
        category: { in: ['INSUMOS_EXTRA', 'MATERIA_PRIMA'] },
        ...(pDate
          ? {
              expenseDate: {
                gte: new Date(`${pDate}T00:00:00.000Z`),
                lte: new Date(`${pDate}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      orderBy: { id: 'desc' },
    });

    if (matchingExpense) {
      await tx.expense.delete({
        where: { id: matchingExpense.id },
      });
    }

    // 3. Eliminar el registro de compra
    await tx.purchase.delete({
      where: { id },
    });
  });

  return { message: 'Compra eliminada, stock revertido y egreso de caja cancelado correctamente' };
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
  const { startDate, endDate, rawMaterialId, type, search, paginate } = query;
  const pageNum = Math.max(1, Number(query.page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {};

  if (rawMaterialId) {
    whereClause.rawMaterialId = Number(rawMaterialId);
  }

  if (type) {
    whereClause.type = String(type).trim();
  }

  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { reason: { contains: q, mode: 'insensitive' } },
      { registeredBy: { contains: q, mode: 'insensitive' } },
      { rawMaterial: { name: { contains: q, mode: 'insensitive' } } },
    ];
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

  const [total, items] = await Promise.all([
    prisma.inventoryAdjustment.count({ where: whereClause }),
    prisma.inventoryAdjustment.findMany({
      where: whereClause,
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
            code: true,
            currentStock: true,
            avgCost: true,
          },
        },
      },
      orderBy: { adjustmentDate: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  if (paginate === true) {
    return {
      data: items,
      items,
      pagination: {
        total,
        totalItems: total,
        page: pageNum,
        currentPage: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  return items;
};

/**
 * Obtener historial de movimientos de inventario / Kardex (Paginado estricto a 10 por defecto)
 * Endpoint: GET /api/inventory/movements?rawMaterialId=X&page=1&limit=10
 */
export const getInventoryMovements = async (query: InventoryMovementsQueryInput) => {
  const { startDate, endDate, rawMaterialId, type, search } = query;
  const pageNum = Math.max(1, Number(query.page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {};

  if (rawMaterialId) {
    whereClause.rawMaterialId = Number(rawMaterialId);
  }

  if (type) {
    whereClause.type = String(type).trim();
  }

  if (search && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { reason: { contains: q, mode: 'insensitive' } },
      { registeredBy: { contains: q, mode: 'insensitive' } },
      { rawMaterial: { name: { contains: q, mode: 'insensitive' } } },
    ];
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

  const [total, items] = await Promise.all([
    prisma.inventoryAdjustment.count({ where: whereClause }),
    prisma.inventoryAdjustment.findMany({
      where: whereClause,
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
            code: true,
            currentStock: true,
            avgCost: true,
          },
        },
      },
      orderBy: { adjustmentDate: 'desc' },
      skip,
      take: limitNum,
    }),
  ]);

  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    data: items,
    items,
    pagination: {
      total,
      totalItems: total,
      page: pageNum,
      currentPage: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
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
