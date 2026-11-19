import prisma from '../../prisma.js';
import { AppError } from '../../shared/errors/appError.js';
import { CreateRecipeInput, UpdateRecipeInput, RecipeQueryInput } from './recipes.schema.js';

/**
 * Obtiene el costo de referencia por litro de Base Láctea para Fase B
 * Jerarquía unívoca (RF-5):
 * 1. Costo por litro del último lote de Fase A COMPLETADO.
 * 2. Costo unitario teórico de la receta activa de Fase A.
 * 3. $0 COP con warning.
 */
export async function getBaseLitersCostReference(): Promise<{ costPerLiter: number; warning?: string }> {
  // 1. Buscar último lote de Fase A completado
  const lastBatch = await prisma.productionBatch.findFirst({
    where: {
      status: 'COMPLETADO',
      isActive: true,
      costPerLiter: { gt: 0 },
    },
    orderBy: { preparationDate: 'desc' },
  });

  if (lastBatch && lastBatch.costPerLiter > 0) {
    return { costPerLiter: lastBatch.costPerLiter };
  }

  // 2. Buscar receta activa de Fase A
  const faseARecipe = await prisma.recipe.findFirst({
    where: {
      category: 'FASE_A',
      status: 'ACTIVA',
    },
    include: {
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
    },
  });

  if (faseARecipe && faseARecipe.baseYield > 0) {
    let totalIngCost = 0;
    for (const ing of faseARecipe.ingredients) {
      const unitCost = ing.rawMaterial?.avgCost || 0;
      totalIngCost += ing.quantity * unitCost;
    }
    const costPerLiter = totalIngCost / faseARecipe.baseYield;
    return { costPerLiter: Math.round(costPerLiter * 100) / 100 };
  }

  // 3. Fallback a 0
  return {
    costPerLiter: 0,
    warning: 'No hay lotes completados de Fase A ni receta activa de base láctea para calcular el costo de referencia.',
  };
}

/**
 * Calcula los costos teóricos de una receta (ingredientes, base láctea, total y unitario)
 */
export async function enrichRecipeWithCosts(recipe: any) {
  let ingredientsCost = 0;
  const enrichedIngredients = [];

  for (const ing of recipe.ingredients || []) {
    let unitCost = ing.rawMaterial?.avgCost || 0;

    // Si es un compuesto (ej. mermelada) con avgCost == 0, buscar costo de última preparación (RF-6)
    if (unitCost === 0 && ing.rawMaterial?.isCompound) {
      const lastPrep = await prisma.supplyPreparation.findFirst({
        where: { outputMaterialId: ing.rawMaterialId, isActive: true },
        orderBy: { preparationDate: 'desc' },
      });
      if (lastPrep && lastPrep.costPerUnit > 0) {
        unitCost = lastPrep.costPerUnit;
      }
    }

    const itemTotalCost = Math.round(ing.quantity * unitCost * 100) / 100;
    ingredientsCost += itemTotalCost;

    enrichedIngredients.push({
      ...ing,
      unitCost,
      avgCost: unitCost,
      totalCost: itemTotalCost,
    });
  }

  let baseLitersCost = 0;
  let baseCostWarning: string | undefined = undefined;

  if (recipe.category === 'FASE_B' && recipe.baseLiters > 0) {
    const baseRef = await getBaseLitersCostReference();
    baseLitersCost = Math.round(recipe.baseLiters * baseRef.costPerLiter * 100) / 100;
    baseCostWarning = baseRef.warning;
  }

  const totalCost = Math.round((baseLitersCost + ingredientsCost) * 100) / 100;
  const baseYield = recipe.baseYield > 0 ? recipe.baseYield : 1;
  const theoreticalUnitCost = Math.round((totalCost / baseYield) * 100) / 100;

  return {
    ...recipe,
    ingredients: enrichedIngredients,
    baseLitersCost,
    ingredientsCost,
    totalCost,
    theoreticalUnitCost,
    ...(baseCostWarning ? { baseCostWarning } : {}),
  };
}

/**
 * Lista recetas con filtros
 */
export async function listRecipes(query: RecipeQueryInput) {
  const where: any = {};

  if (query.category) {
    where.category = query.category;
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.flavor) {
    where.flavor = { contains: query.flavor, mode: 'insensitive' };
  }
  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { code: { contains: s, mode: 'insensitive' } },
      { flavor: { contains: s, mode: 'insensitive' } },
    ];
  }

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
      outputMaterial: true,
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  const enrichedList = [];
  for (const r of recipes) {
    enrichedList.push(await enrichRecipeWithCosts(r));
  }
  return enrichedList;
}

/**
 * Obtiene una receta por ID
 */
export async function getRecipeById(id: number) {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
      outputMaterial: true,
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      createdBy: {
        select: { id: true, name: true, username: true, role: true },
      },
    },
  });

  if (!recipe) {
    throw new AppError('Receta no encontrada', 404, 'RECIPE_NOT_FOUND');
  }

  return await enrichRecipeWithCosts(recipe);
}

/**
 * Crea una receta atómicamente con sus ingredientes y pasos (prisma.$transaction)
 */
export async function createRecipe(data: CreateRecipeInput, userId: number) {
  const existing = await prisma.recipe.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new AppError(`Ya existe una receta registrada con el código ${data.code}`, 400, 'RECIPE_CODE_EXISTS');
  }

  return await prisma.$transaction(async (tx) => {
    const { ingredients = [], steps = [], ...headerData } = data;

    const created = await tx.recipe.create({
      data: {
        ...headerData,
        createdById: userId,
        ingredients: {
          create: ingredients.map((ing) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
          })),
        },
        steps: {
          create: steps.map((s, idx) => ({
            stepNumber: s.stepNumber || idx + 1,
            title: s.title,
            description: s.description,
            estimatedMinutes: s.estimatedMinutes || null,
            temperatureMin: s.temperatureMin ?? null,
            temperatureMax: s.temperatureMax ?? null,
            temperatureTarget: s.temperatureTarget ?? null,
            qualityCheck: s.qualityCheck || null,
          })),
        },
      },
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        outputMaterial: true,
      },
    });

    return await enrichRecipeWithCosts(created);
  });
}

/**
 * Actualiza una receta atómicamente
 */
export async function updateRecipe(id: number, data: UpdateRecipeInput) {
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true, steps: true },
  });

  if (!existing) {
    throw new AppError('Receta no encontrada', 404, 'RECIPE_NOT_FOUND');
  }

  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.recipe.findUnique({ where: { code: data.code } });
    if (duplicate) {
      throw new AppError(`El código ${data.code} ya está en uso por otra receta`, 400, 'RECIPE_CODE_EXISTS');
    }
  }

  return await prisma.$transaction(async (tx) => {
    const { ingredients, steps, ...headerData } = data;

    // Si se enviaron ingredientes, reemplazar la lista
    if (ingredients !== undefined) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      if (ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: ingredients.map((ing) => ({
            recipeId: id,
            rawMaterialId: ing.rawMaterialId,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes || null,
          })),
        });
      }
    }

    // Si se enviaron pasos, reemplazar la lista
    if (steps !== undefined) {
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
      if (steps.length > 0) {
        await tx.recipeStep.createMany({
          data: steps.map((s, idx) => ({
            recipeId: id,
            stepNumber: s.stepNumber || idx + 1,
            title: s.title,
            description: s.description,
            estimatedMinutes: s.estimatedMinutes || null,
            temperatureMin: s.temperatureMin ?? null,
            temperatureMax: s.temperatureMax ?? null,
            temperatureTarget: s.temperatureTarget ?? null,
            qualityCheck: s.qualityCheck || null,
          })),
        });
      }
    }

    const updated = await tx.recipe.update({
      where: { id },
      data: headerData,
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        outputMaterial: true,
      },
    });

    return await enrichRecipeWithCosts(updated);
  });
}

/**
 * Conmuta entre ACTIVA y ARCHIVADA
 */
export async function toggleArchiveRecipe(id: number) {
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Receta no encontrada', 404, 'RECIPE_NOT_FOUND');
  }

  const nextStatus = existing.status === 'ACTIVA' ? 'ARCHIVADA' : 'ACTIVA';
  const updated = await prisma.recipe.update({
    where: { id },
    data: { status: nextStatus },
    include: {
      ingredients: { include: { rawMaterial: true } },
      steps: { orderBy: { stepNumber: 'asc' } },
      outputMaterial: true,
    },
  });

  return await enrichRecipeWithCosts(updated);
}

/**
 * Eliminación de receta:
 * Si tiene uso histórico en lotes o preparaciones, prohíbe el borrado y exige archivar
 */
export async function deleteRecipe(id: number) {
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          batchesUsing: true,
          packagingsUsing: true,
          preparationsUsing: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError('Receta no encontrada', 404, 'RECIPE_NOT_FOUND');
  }

  const hasHistoricalUsage =
    existing._count.batchesUsing > 0 ||
    existing._count.packagingsUsing > 0 ||
    existing._count.preparationsUsing > 0;

  if (hasHistoricalUsage) {
    throw new AppError(
      'La receta tiene registros históricos asociados en lotes o preparaciones pasadas; utiliza la opción de Archivar para ocultarla de producción.',
      400,
      'RECIPE_HAS_HISTORICAL_DEPENDENCIES'
    );
  }

  return await prisma.$transaction(async (tx) => {
    await tx.recipeStep.deleteMany({ where: { recipeId: id } });
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    return await tx.recipe.delete({ where: { id } });
  });
}

/**
 * Normaliza nombres de presentaciones para búsqueda de empaques
 * ej: "500 ml" -> "500ML", "1 Litro" -> "1LITRO", "1L" -> "1L"
 */
function normalizePresentationCode(name: string): string {
  return name.toUpperCase().replace(/[\s\-_.]/g, '');
}

/**
 * Simula la rentabilidad de una presentación comercial para una receta de Fase B
 */
export async function simulateRecipePresentation(recipeId: number, presentationId: number) {
  const recipe = await getRecipeById(recipeId);

  if (recipe.category !== 'FASE_B') {
    throw new AppError('La simulación de presentaciones solo aplica a recetas de Fase B (saborización)', 400, 'ONLY_FASE_B_SIMULATION');
  }

  const presentation = await prisma.productPresentation.findUnique({
    where: { id: presentationId },
  });

  if (!presentation || !presentation.isActive || presentation.capacityLiters <= 0) {
    throw new AppError('Presentación comercial no encontrada o inactiva', 404, 'PRESENTATION_NOT_FOUND');
  }

  // 1. Costo líquido proporcional
  const liquidCostPerLiter = recipe.theoreticalUnitCost;
  const liquidCost = Math.round(liquidCostPerLiter * presentation.capacityLiters * 100) / 100;

  // 2. Mapeo de empaques sin tapas separadas (RF-13.2)
  const normName = normalizePresentationCode(presentation.name);
  const bottleCodeCanonical = `BOTELLA_${normName}`;
  const bottleCodeAlternative = `ENVASE_${normName}`;
  const labelCode = `ETIQUETA_${normName}`;

  const packagingMaterials = await prisma.rawMaterial.findMany({
    where: {
      category: 'EMPAQUE',
      isActive: true,
      OR: [
        { code: bottleCodeCanonical },
        { code: bottleCodeAlternative },
        { code: labelCode },
      ],
    },
  });

  const bottleItem = packagingMaterials.find(
    (m) => m.code === bottleCodeCanonical || m.code === bottleCodeAlternative
  );
  const labelItem = packagingMaterials.find((m) => m.code === labelCode);

  const packagingItems = [];
  let packagingCost = 0;

  if (bottleItem) {
    packagingCost += bottleItem.avgCost;
    packagingItems.push({
      code: bottleItem.code,
      name: bottleItem.name,
      cost: bottleItem.avgCost,
      type: 'BOTELLA',
    });
  } else {
    packagingItems.push({
      code: bottleCodeCanonical,
      name: `Botella ${presentation.label} (No configurada en almacén)`,
      cost: 0,
      type: 'BOTELLA',
      warning: 'Insumo de botella no encontrado en almacén',
    });
  }

  if (labelItem) {
    packagingCost += labelItem.avgCost;
    packagingItems.push({
      code: labelItem.code,
      name: labelItem.name,
      cost: labelItem.avgCost,
      type: 'ETIQUETA',
    });
  } else {
    packagingItems.push({
      code: labelCode,
      name: `Etiqueta ${presentation.label} (No configurada en almacén)`,
      cost: 0,
      type: 'ETIQUETA',
      warning: 'Insumo de etiqueta no encontrado en almacén',
    });
  }

  const totalUnitCost = Math.round((liquidCost + packagingCost) * 100) / 100;
  const defaultPrice = presentation.defaultPrice;
  const projectedProfit = Math.round((defaultPrice - totalUnitCost) * 100) / 100;
  const marginPercentage =
    defaultPrice > 0 ? Math.round((projectedProfit / defaultPrice) * 10000) / 100 : 0;

  let marginStatus: 'GREEN' | 'YELLOW' | 'RED' = 'RED';
  if (marginPercentage >= 40) {
    marginStatus = 'GREEN';
  } else if (marginPercentage >= 25) {
    marginStatus = 'YELLOW';
  }

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    flavor: recipe.flavor,
    presentation: {
      id: presentation.id,
      name: presentation.name,
      label: presentation.label,
      capacityLiters: presentation.capacityLiters,
    },
    liquidCost,
    packagingItems,
    packagingCost: Math.round(packagingCost * 100) / 100,
    totalUnitCost,
    defaultPrice,
    projectedProfit,
    marginPercentage,
    marginStatus,
  };
}
