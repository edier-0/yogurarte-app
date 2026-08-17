import { Request, Response } from 'express';
import prisma from '../prisma.js';

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

export const getPreparations = async (req: Request, res: Response) => {
  try {
    const preparations = await prisma.supplyPreparation.findMany({
      where: { isActive: true },
      include: {
        outputMaterial: true,
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: { preparationDate: 'desc' },
    });

    res.json(preparations);
  } catch (error) {
    console.error('Error fetching supply preparations:', error);
    res.status(500).json({ error: 'Error al obtener historial de elaboraciones' });
  }
};

export const getPreparationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preparation = await prisma.supplyPreparation.findUnique({
      where: { id: Number(id) },
      include: {
        outputMaterial: true,
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });

    if (!preparation) {
      return res.status(404).json({ error: 'Elaboración no encontrada' });
    }

    res.json(preparation);
  } catch (error) {
    console.error('Error fetching preparation by id:', error);
    res.status(500).json({ error: 'Error al obtener detalle de la elaboración' });
  }
};

export const createPreparation = async (req: Request, res: Response) => {
  try {
    const {
      outputMaterialId,
      newMaterialName,
      quantityProduced,
      unit = 'Kilogramos',
      preparationDate,
      notes,
      registeredBy,
      ingredients, // Array de { rawMaterialId, quantityUsed, unitUsed }
    } = req.body;

    const producedQty = Number(quantityProduced);
    if (!producedQty || producedQty <= 0) {
      return res.status(400).json({ error: 'Debe ingresar una cantidad producida mayor a 0' });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Debe agregar al menos un ingrediente o insumo a la receta' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Determinar o crear el insumo resultante
      let destinationMaterial = null;

      if (outputMaterialId) {
        destinationMaterial = await tx.rawMaterial.findUnique({
          where: { id: Number(outputMaterialId) },
        });
      } else if (newMaterialName && typeof newMaterialName === 'string' && newMaterialName.trim()) {
        const cleanName = newMaterialName.trim();
        const baseCode = cleanName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .slice(0, 20);

        // Buscar si ya existe por nombre
        destinationMaterial = await tx.rawMaterial.findFirst({
          where: { name: { equals: cleanName, mode: 'insensitive' } },
        });

        if (!destinationMaterial) {
          destinationMaterial = await tx.rawMaterial.create({
            data: {
              code: `${baseCode}_${Date.now().toString().slice(-4)}`,
              name: cleanName,
              category: 'INSUMO',
              unit: unit || 'Kilogramos',
              currentStock: 0,
              avgCost: 0,
              minStockAlert: 1,
              isActive: true,
            },
          });
        }
      }

      if (!destinationMaterial) {
        throw new Error('Debe especificar el insumo resultante (seleccionar existente o ingresar nuevo nombre)');
      }

      // 2. Generar código de preparación (ej. PREP-YYYYMMDD-01)
      const dateObj = preparationDate ? new Date(`${String(preparationDate).split('T')[0]}T12:00:00.000Z`) : new Date();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const datePrefix = `PREP-${year}${month}${day}`;

      const countToday = await tx.supplyPreparation.count({
        where: {
          code: { startsWith: datePrefix },
        },
      });
      const seq = String(countToday + 1).padStart(2, '0');
      const prepCode = `${datePrefix}-${seq}`;

      // 3. Procesar y descontar cada ingrediente
      let totalRecipeCost = 0;
      const ingredientRecords: any[] = [];

      for (const item of ingredients) {
        const rawMatId = Number(item.rawMaterialId);
        const qtyUsed = Number(item.quantityUsed);
        const unitUsed = (item.unitUsed || 'g').trim();

        if (!rawMatId || isNaN(qtyUsed) || qtyUsed <= 0) {
          throw new Error('Ingrediente inválido en la lista de insumos');
        }

        const mat = await tx.rawMaterial.findUnique({
          where: { id: rawMatId },
        });

        if (!mat || !mat.isActive) {
          throw new Error(`Insumo #${rawMatId} no encontrado o inactivo`);
        }

        // Convertir unidades para el descuento del inventario
        let deductQty = qtyUsed;
        const isMatKg = isKgUnit(mat.unit);
        const isMatGram = isGramUnit(mat.unit);

        let itemCost = 0;

        if (isMatKg && (unitUsed === 'g' || unitUsed === 'gramos' || unitUsed === 'gr')) {
          deductQty = qtyUsed / 1000;
          itemCost = deductQty * mat.avgCost;
        } else if (isMatGram && (unitUsed === 'kg' || unitUsed === 'kilos')) {
          deductQty = qtyUsed * 1000;
          itemCost = (qtyUsed) * (mat.avgCost * 1000);
        } else {
          deductQty = qtyUsed;
          itemCost = deductQty * mat.avgCost;
        }

        // Validar stock disponible
        if (mat.currentStock < deductQty) {
          const formattedCurrent = isMatKg ? `${mat.currentStock} kg (${Math.round(mat.currentStock * 1000)} g)` : `${mat.currentStock} ${mat.unit}`;
          const formattedNeeded = unitUsed === 'g' ? `${qtyUsed} g (${(qtyUsed/1000).toFixed(2)} kg)` : `${qtyUsed} ${unitUsed}`;
          throw new Error(`Stock insuficiente de "${mat.name}". Tienes ${formattedCurrent} y requieres ${formattedNeeded}.`);
        }

        totalRecipeCost += itemCost;

        // Descontar del stock del ingrediente
        await tx.rawMaterial.update({
          where: { id: mat.id },
          data: {
            currentStock: Math.max(0, mat.currentStock - deductQty),
          },
        });

        ingredientRecords.push({
          rawMaterialId: mat.id,
          quantityUsed: deductQty,
          unitUsed,
          unitCost: mat.avgCost,
          totalCost: itemCost,
        });
      }

      // 4. Calcular costo unitario resultante ($/kg o $/L)
      const costPerUnit = producedQty > 0 ? Math.round(totalRecipeCost / producedQty) : 0;

      // 5. Aumentar stock del insumo preparado y recalcular costo promedio ponderado
      const prevStock = destinationMaterial.currentStock || 0;
      const prevAvgCost = destinationMaterial.avgCost || 0;
      const newStock = prevStock + producedQty;
      const newAvgCost = newStock > 0 ? Math.round((prevStock * prevAvgCost + totalRecipeCost) / newStock) : costPerUnit;

      await tx.rawMaterial.update({
        where: { id: destinationMaterial.id },
        data: {
          currentStock: newStock,
          avgCost: newAvgCost,
        },
      });

      // 6. Crear el registro de preparación
      const preparation = await tx.supplyPreparation.create({
        data: {
          code: prepCode,
          name: destinationMaterial.name,
          outputMaterialId: destinationMaterial.id,
          quantityProduced: producedQty,
          unit: destinationMaterial.unit,
          totalCost: totalRecipeCost,
          costPerUnit,
          preparationDate: dateObj,
          notes: notes ? notes.trim() : null,
          registeredBy: registeredBy || 'Edier',
          ingredients: {
            create: ingredientRecords,
          },
        },
        include: {
          outputMaterial: true,
          ingredients: {
            include: {
              rawMaterial: true,
            },
          },
        },
      });

      return preparation;
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating supply preparation:', error);
    res.status(400).json({ error: error.message || 'Error al registrar la elaboración del insumo' });
  }
};

export const deletePreparation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prepId = Number(id);

    await prisma.$transaction(async (tx) => {
      const preparation = await tx.supplyPreparation.findUnique({
        where: { id: prepId },
        include: {
          ingredients: true,
          outputMaterial: true,
        },
      });

      if (!preparation) {
        throw new Error('Elaboración no encontrada');
      }

      // 1. Revertir stock del insumo producido
      if (preparation.outputMaterial) {
        const currentProdStock = preparation.outputMaterial.currentStock;
        await tx.rawMaterial.update({
          where: { id: preparation.outputMaterialId },
          data: {
            currentStock: Math.max(0, currentProdStock - preparation.quantityProduced),
          },
        });
      }

      // 2. Devolver stock a cada ingrediente utilizado
      for (const item of preparation.ingredients) {
        const mat = await tx.rawMaterial.findUnique({ where: { id: item.rawMaterialId } });
        if (mat) {
          await tx.rawMaterial.update({
            where: { id: mat.id },
            data: {
              currentStock: mat.currentStock + item.quantityUsed,
            },
          });
        }
      }

      // 3. Eliminar preparación
      await tx.supplyPreparation.delete({
        where: { id: prepId },
      });
    });

    res.json({ message: 'Elaboración eliminada y stock revertido correctamente' });
  } catch (error: any) {
    console.error('Error deleting preparation:', error);
    res.status(400).json({ error: error.message || 'Error al eliminar la elaboración' });
  }
};
