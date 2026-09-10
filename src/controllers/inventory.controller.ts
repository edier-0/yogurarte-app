import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { parseColombiaDate } from '../utils/date.utils.js';

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;

    const whereClause: any = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    const materials = await prisma.rawMaterial.findMany({
      where: whereClause,
      orderBy: { category: 'asc' },
    });

    const enriched = materials.map((m) => ({
      ...m,
      isLowStock: m.currentStock <= m.minStockAlert,
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Error al obtener inventario de insumos' });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { code, name, category, unit, minStockAlert, avgCost, currentStock } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ error: 'El nombre y la unidad son obligatorios' });
    }

    const generatedCode = code
      ? code.toUpperCase().trim()
      : name
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 20);

    const created = await prisma.rawMaterial.create({
      data: {
        code: generatedCode,
        name: name.trim(),
        category: category || 'INSUMO',
        unit: unit.trim(),
        minStockAlert: minStockAlert ? Number(minStockAlert) : 10,
        avgCost: avgCost ? Number(avgCost) : 0,
        currentStock: currentStock ? Number(currentStock) : 0,
        isActive: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Error al crear insumo o materia prima' });
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, unit, minStockAlert, avgCost, currentStock } = req.body;

    const updated = await prisma.rawMaterial.update({
      where: { id: Number(id) },
      data: {
        name: name ? name.trim() : undefined,
        category: category ? category : undefined,
        unit: unit ? unit.trim() : undefined,
        minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : undefined,
        avgCost: avgCost !== undefined ? Number(avgCost) : undefined,
        currentStock: currentStock !== undefined ? Number(currentStock) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Error al actualizar insumo' });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Desactivación lógica (soft delete) para proteger integridad referencial con compras y lotes
    await prisma.rawMaterial.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    res.json({ message: 'Insumo eliminado/desactivado correctamente' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
};

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const { rawMaterialId, quantity, unitCost, totalCost, supplier, purchaseDate, paymentMethod, notes, registeredBy } = req.body;

    const parsedQty = Number(quantity);
    let parsedUnitCost = Number(unitCost);
    let parsedTotalCost = Number(totalCost);

    if (!rawMaterialId || isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'Debe ingresar una cantidad válida mayor a 0' });
    }

    if ((isNaN(parsedUnitCost) || parsedUnitCost < 0) && (isNaN(parsedTotalCost) || parsedTotalCost < 0)) {
      return res.status(400).json({ error: 'Debe ingresar el costo unitario o el costo total de la compra' });
    }

    // Si ingresó costo total, calcular unitario exacto dividiendo entre cantidad
    if (parsedTotalCost > 0 && (!parsedUnitCost || parsedUnitCost <= 0)) {
      parsedUnitCost = parsedTotalCost / parsedQty;
    } else if (parsedUnitCost >= 0 && (!parsedTotalCost || parsedTotalCost <= 0)) {
      parsedTotalCost = parsedQty * parsedUnitCost;
    } else if (parsedTotalCost > 0 && parsedUnitCost > 0) {
      // Si ambos vienen, asegurar consistencia exacta
      parsedUnitCost = parsedTotalCost / parsedQty;
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id: Number(rawMaterialId) },
    });

    if (!material) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    // Calcular nuevo costo promedio ponderado
    const newStock = material.currentStock + parsedQty;
    const currentTotalValue = material.currentStock * material.avgCost;
    const newTotalValue = currentTotalValue + parsedTotalCost;
    const newAvgCost = newStock > 0 ? Math.round(newTotalValue / newStock) : Math.round(parsedUnitCost);

    // Parse date keeping accurate Colombia timestamp
    const dateObj = parseColombiaDate(purchaseDate);

    // Transacción: registrar compra y actualizar stock
    const [purchase] = await prisma.$transaction([
      prisma.purchase.create({
        data: {
          rawMaterialId: Number(rawMaterialId),
          quantity: parsedQty,
          unitCost: Math.round(parsedUnitCost * 100) / 100, // guardar con 2 decimales de precisión
          totalCost: Math.round(parsedTotalCost),
          supplier: supplier ? supplier.trim() : null,
          purchaseDate: dateObj,
          paymentMethod: paymentMethod ? paymentMethod.trim() : 'EFECTIVO',
          notes: notes ? notes.trim() : null,
          registeredBy: registeredBy || 'Edier',
        },
      }),
      prisma.rawMaterial.update({
        where: { id: Number(rawMaterialId) },
        data: {
          currentStock: newStock,
          avgCost: newAvgCost,
        },
      }),
    ]);

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error registering purchase:', error);
    res.status(500).json({ error: 'Error al registrar compra de insumos' });
  }
};

export const updatePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplier, invoiceNumber, quantity, unitCost, totalCost, purchaseDate, paymentMethod, notes } = req.body;

    const currentPurchase = await prisma.purchase.findUnique({
      where: { id: Number(id) },
      include: { rawMaterial: true },
    });

    if (!currentPurchase) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const newQty = quantity !== undefined ? Number(quantity) : currentPurchase.quantity;
    let newUnitCost = unitCost !== undefined ? Number(unitCost) : currentPurchase.unitCost;
    let newTotalCost = totalCost !== undefined ? Number(totalCost) : (newQty * newUnitCost);

    if (totalCost !== undefined && Number(totalCost) > 0 && newQty > 0) {
      newTotalCost = Number(totalCost);
      newUnitCost = newTotalCost / newQty;
    } else if (unitCost !== undefined && Number(unitCost) > 0 && newQty > 0) {
      newUnitCost = Number(unitCost);
      newTotalCost = newQty * newUnitCost;
    }

    const qtyDiff = newQty - currentPurchase.quantity;

    // Actualizar compra y ajustar el stock
    const [updatedPurchase] = await prisma.$transaction([
      prisma.purchase.update({
        where: { id: Number(id) },
        data: {
          supplier: supplier !== undefined ? supplier.trim() : currentPurchase.supplier,
          quantity: newQty,
          unitCost: Math.round(newUnitCost * 100) / 100,
          totalCost: Math.round(newTotalCost),
          purchaseDate: purchaseDate ? parseColombiaDate(purchaseDate) : currentPurchase.purchaseDate,
          paymentMethod: paymentMethod !== undefined ? paymentMethod.trim() : currentPurchase.paymentMethod,
          notes: notes !== undefined ? notes.trim() : currentPurchase.notes,
        },
        include: {
          rawMaterial: true,
        },
      }),
      prisma.rawMaterial.update({
        where: { id: currentPurchase.rawMaterialId },
        data: {
          currentStock: Math.max(0, currentPurchase.rawMaterial.currentStock + qtyDiff),
          avgCost: Math.round(newUnitCost),
        },
      }),
    ]);

    res.json(updatedPurchase);
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: 'Error al actualizar compra' });
  }
};

export const deletePurchase = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: Number(id) },
      include: { rawMaterial: true },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    // Revertir el stock agregado por esa compra
    await prisma.$transaction([
      prisma.rawMaterial.update({
        where: { id: purchase.rawMaterialId },
        data: {
          currentStock: Math.max(0, purchase.rawMaterial.currentStock - purchase.quantity),
        },
      }),
      prisma.purchase.delete({
        where: { id: Number(id) },
      }),
    ]);

    res.json({ message: 'Compra eliminada y stock revertido correctamente' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ error: 'Error al eliminar compra' });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newStock, type, reason, registeredBy, adjustmentDate } = req.body;

    const materialId = Number(id || req.body.rawMaterialId);
    if (!materialId || isNaN(materialId)) {
      return res.status(400).json({ error: 'ID de insumo no válido' });
    }

    const parsedStock = Number(newStock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: 'El stock debe ser un número válido mayor o igual a 0' });
    }

    const material = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const previousStock = material.currentStock;
    const deltaQuantity = Math.round((parsedStock - previousStock) * 1000) / 1000;
    const unitCost = material.avgCost || 0;
    const totalCostImpact = Math.round(deltaQuantity * unitCost);
    const dateObj = parseColombiaDate(adjustmentDate);

    const [adjustment, updatedMaterial] = await prisma.$transaction([
      prisma.inventoryAdjustment.create({
        data: {
          rawMaterialId: materialId,
          type: type ? String(type).trim() : (deltaQuantity < 0 ? 'MERMA_DANO' : 'CONTEO_FISICO'),
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
      }),
      prisma.rawMaterial.update({
        where: { id: materialId },
        data: {
          currentStock: parsedStock,
        },
      }),
    ]);

    res.status(201).json({
      message: 'Ajuste de inventario registrado correctamente',
      adjustment,
      material: updatedMaterial,
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Error al registrar ajuste de inventario' });
  }
};

export const getAdjustmentsHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, rawMaterialId, type } = req.query;

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

    const adjustments = await prisma.inventoryAdjustment.findMany({
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

    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching adjustments history:', error);
    res.status(500).json({ error: 'Error al obtener historial de ajustes' });
  }
};

export const deleteAdjustment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adjId = Number(id);

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id: adjId },
      include: { rawMaterial: true },
    });

    if (!adjustment) {
      return res.status(404).json({ error: 'Ajuste de inventario no encontrado' });
    }

    // Revertir el stock al valor previo
    const restoredStock = Math.max(0, Math.round((adjustment.rawMaterial.currentStock - adjustment.deltaQuantity) * 1000) / 1000);

    await prisma.$transaction([
      prisma.rawMaterial.update({
        where: { id: adjustment.rawMaterialId },
        data: {
          currentStock: restoredStock,
        },
      }),
      prisma.inventoryAdjustment.delete({
        where: { id: adjId },
      }),
    ]);

    res.json({
      message: 'Ajuste eliminado y stock restaurado exitosamente',
      restoredStock,
      materialId: adjustment.rawMaterialId,
    });
  } catch (error) {
    console.error('Error deleting adjustment:', error);
    res.status(500).json({ error: 'Error al eliminar / revertir ajuste de inventario' });
  }
};

export const getPurchasesHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, rawMaterialId } = req.query;

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

    const purchases = await prisma.purchase.findMany({
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

    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases history:', error);
    res.status(500).json({ error: 'Error al obtener historial de compras' });
  }
};
