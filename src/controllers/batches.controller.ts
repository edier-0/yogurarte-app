import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getBatches = async (req: Request, res: Response) => {
  try {
    const { status, includeInactive } = req.query;

    const whereClause: any = {};
    if (includeInactive !== 'true') {
      whereClause.isActive = true;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status;
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
      },
      orderBy: { preparationDate: 'desc' },
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Error al obtener lotes de producción' });
  }
};

export const getBatchById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const batch = await prisma.productionBatch.findUnique({
      where: { id: Number(id) },
      include: {
        itemsUsed: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    res.json(batch);
  } catch (error) {
    console.error('Error fetching batch by id:', error);
    res.status(500).json({ error: 'Error al obtener detalle del lote' });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    const {
      milkUsedLiters,
      bottles1LProduced,
      bottles2LProduced,
      flavor,
      preparationDate,
      expirationDate,
      notes,
      registeredBy,
      extraItems, // Array opcional de { rawMaterialId: number, quantityUsed: number }
    } = req.body;

    const milkUsed = Number(milkUsedLiters);
    const b1L = Number(bottles1LProduced || 0);
    const b2L = Number(bottles2LProduced || 0);

    if (isNaN(milkUsed) || milkUsed <= 0) {
      return res.status(400).json({ error: 'Debe ingresar la cantidad de litros de leche utilizados' });
    }

    if (b1L <= 0 && b2L <= 0) {
      return res.status(400).json({ error: 'Debe ingresar al menos una botella producida (1L o 2L)' });
    }

    const totalLitersProduced = b1L * 1.0 + b2L * 2.0;
    const yieldPercentage = Math.round((totalLitersProduced / milkUsed) * 10000) / 100;

    // 1. Validar Stock Obligatorio de Leche
    const milkMaterial = await prisma.rawMaterial.findFirst({
      where: {
        OR: [
          { code: 'LECHE' },
          { category: 'MATERIA_PRIMA' },
          { name: { contains: 'leche', mode: 'insensitive' } },
        ],
        isActive: true,
      },
    });

    const currentMilkStock = milkMaterial ? milkMaterial.currentStock : 0;
    if (!milkMaterial || currentMilkStock < milkUsed) {
      return res.status(400).json({
        error: `Stock insuficiente de leche. Tienes ${currentMilkStock} L en inventario y estás intentando usar ${milkUsed} L. Registra compras de leche primero.`,
      });
    }

    // 2. Validar Stock Obligatorio de Botellas 1L (si se envasaron botellas de 1L)
    let bottle1L = null;
    if (b1L > 0) {
      bottle1L = await prisma.rawMaterial.findFirst({
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
        return res.status(400).json({
          error: `Stock insuficiente de botellas de 1L. Tienes ${currentB1Stock} und en inventario y requieres ${b1L} und. Registra compra de envases primero.`,
        });
      }
    }

    // 3. Validar Stock Obligatorio de Botellas 2L (si se envasaron botellas de 2L)
    let bottle2L = null;
    if (b2L > 0) {
      bottle2L = await prisma.rawMaterial.findFirst({
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
        return res.status(400).json({
          error: `Stock insuficiente de botellas de 2L. Tienes ${currentB2Stock} und en inventario y requieres ${b2L} und. Registra compra de envases primero.`,
        });
      }
    }

    // Generar código de lote secuencial único para el día
    const dateObj = preparationDate ? new Date(`${String(preparationDate).split('T')[0]}T12:00:00.000Z`) : new Date();
    const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
    
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

    const [createdBatch] = await prisma.$transaction(async (tx) => {
      let totalBatchCost = 0;
      const usageRecords: Array<{
        rawMaterialId: number;
        quantityUsed: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      // 1. Descontar Leche automáticamente
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

      // 2. Descontar Botellas 1L automáticamente
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

      // 3. Descontar Botellas 2L automáticamente
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

      // 4. Descontar Etiquetas solo si el usuario las utilizó y existen en stock
      const totalBottles = b1L + b2L;
      const shouldUseLabels = req.body.useLabels !== false && req.body.useLabels !== 'false';

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

      // 5. Descontar insumos extras (frutas, azúcar, cultivo, etc.) si se especificaron
      if (Array.isArray(extraItems) && extraItems.length > 0) {
        for (const item of extraItems) {
          const matId = Number(item.rawMaterialId);
          const qty = Number(item.quantityUsed);

          if (matId && qty > 0) {
            const material = await tx.rawMaterial.findUnique({ where: { id: matId } });
            if (material) {
              const unitCost = material.avgCost || 0;
              const cost = qty * unitCost;
              totalBatchCost += cost;

              usageRecords.push({
                rawMaterialId: matId,
                quantityUsed: qty,
                unitCost,
                totalCost: cost,
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

      // Crear el lote con sus registros de uso
      const batch = await tx.productionBatch.create({
        data: {
          batchCode,
          milkUsedLiters: milkUsed,
          bottles1LProduced: b1L,
          bottles2LProduced: b2L,
          totalLitersProduced,
          yieldPercentage,
          flavor: flavor ? flavor.trim() : 'Natural',
          preparationDate: dateObj,
          expirationDate: expirationDate ? new Date(`${String(expirationDate).split('T')[0]}T12:00:00.000Z`) : null,
          totalCost: totalBatchCost,
          costPerLiter,
          notes: notes ? notes.trim() : null,
          registeredBy: registeredBy || 'Edier',
          status: 'COMPLETADO',
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

      return [batch];
    });

    res.status(201).json(createdBatch);
  } catch (error) {
    console.error('Error creating production batch:', error);
    res.status(500).json({ error: 'Error al registrar lote de producción' });
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      milkUsedLiters,
      bottles1LProduced,
      bottles2LProduced,
      flavor,
      preparationDate,
      expirationDate,
      notes,
      status,
    } = req.body;

    const currentBatch = await prisma.productionBatch.findUnique({
      where: { id: Number(id) },
    });

    if (!currentBatch) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const newMilk = milkUsedLiters !== undefined ? Number(milkUsedLiters) : currentBatch.milkUsedLiters;
    const newB1L = bottles1LProduced !== undefined ? Number(bottles1LProduced) : currentBatch.bottles1LProduced;
    const newB2L = bottles2LProduced !== undefined ? Number(bottles2LProduced) : currentBatch.bottles2LProduced;

    const newTotalLiters = newB1L * 1.0 + newB2L * 2.0;
    const newYield = newMilk > 0 ? Math.round((newTotalLiters / newMilk) * 10000) / 100 : 0;
    const newCostPerLiter = newTotalLiters > 0 ? Math.round(currentBatch.totalCost / newTotalLiters) : 0;

    const updated = await prisma.productionBatch.update({
      where: { id: Number(id) },
      data: {
        milkUsedLiters: newMilk,
        bottles1LProduced: newB1L,
        bottles2LProduced: newB2L,
        totalLitersProduced: newTotalLiters,
        yieldPercentage: newYield,
        costPerLiter: newCostPerLiter,
        flavor: flavor !== undefined ? flavor.trim() : undefined,
        preparationDate: preparationDate ? new Date(`${String(preparationDate).split('T')[0]}T12:00:00.000Z`) : undefined,
        expirationDate: expirationDate ? new Date(`${String(expirationDate).split('T')[0]}T12:00:00.000Z`) : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        status: status !== undefined ? status : undefined,
      },
      include: {
        itemsUsed: {
          include: { rawMaterial: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: 'Error al actualizar lote' });
  }
};

export const deactivateBatch = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, restoreStock } = req.body;

    const batch = await prisma.productionBatch.findUnique({
      where: { id: Number(id) },
      include: { itemsUsed: true },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      // Restaurar inventario si se solicita
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

      await tx.productionBatch.update({
        where: { id: Number(id) },
        data: {
          isActive: false,
          deactivationReason: reason ? reason.trim() : 'Desactivado por el usuario',
          status: 'DESACTIVADO',
        },
      });
    });

    res.json({ message: 'Lote desactivado correctamente', id: Number(id) });
  } catch (error) {
    console.error('Error deactivating batch:', error);
    res.status(500).json({ error: 'Error al desactivar lote' });
  }
};
