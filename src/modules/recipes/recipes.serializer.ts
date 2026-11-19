/**
 * Serializador RBAC de Seguridad y Confidencialidad Financiera
 * src/modules/recipes/recipes.serializer.ts
 *
 * Garantiza que cuando un operario de planta (PRODUCCION u OPERADOR) consulte el recetario,
 * la API omita estricta y físicamente del JSON resultante todos los costos promedio, costos
 * unitarios, costos totales, costos de empaque, precios de venta, utilidades y márgenes,
 * protegiendo la confidencialidad de la empresa incluso ante inspección en DevTools.
 */

export function isPrivilegedRole(role?: string | null): boolean {
  if (!role) return false;
  const upper = role.toUpperCase().trim();
  return upper === 'ADMIN' || upper === 'SOCIO';
}

/**
 * Sanitiza un objeto de receta censurando costos para roles no privilegiados
 */
export function sanitizeRecipeForRole<T extends Record<string, any>>(recipe: T, role?: string | null): any {
  if (!recipe) return recipe;
  const isPrivileged = isPrivilegedRole(role);

  if (isPrivileged) {
    return {
      ...recipe,
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        ...ing,
        avgCost: ing.rawMaterial?.avgCost ?? ing.avgCost ?? ing.unitCost ?? 0,
      })),
    };
  }

  // Desestructuración excluyendo todos los campos monetarios
  const {
    baseLitersCost,
    ingredientsCost,
    totalCost,
    theoreticalUnitCost,
    packagingCost,
    marginPercentage,
    projectedProfit,
    ...cleanRecipe
  } = recipe as any;

  return {
    ...cleanRecipe,
    ingredients: (recipe.ingredients || []).map((ing: any) => {
      const { unitCost, avgCost, totalCost, rawMaterial, ...cleanIng } = ing;
      let cleanRawMaterial = undefined;
      if (rawMaterial) {
        const { avgCost: rawAvgCost, ...rmRest } = rawMaterial;
        cleanRawMaterial = rmRest;
      }

      return {
        ...cleanIng,
        ...(cleanRawMaterial ? { rawMaterial: cleanRawMaterial } : {}),
      };
    }),
  };
}

/**
 * Sanitiza una lista completa de recetas
 */
export function sanitizeRecipeListForRole(recipes: any[], role?: string | null): any[] {
  if (!Array.isArray(recipes)) return [];
  return recipes.map((r) => sanitizeRecipeForRole(r, role));
}

/**
 * Sanitiza el cálculo de simulación comercial de presentación
 */
export function sanitizeSimulationForRole(simulation: any, role?: string | null): any {
  if (!simulation) return simulation;
  const isPrivileged = isPrivilegedRole(role);

  if (isPrivileged) {
    return simulation;
  }

  // Para roles no autorizados, censurar precios y costos devolviendo solo datos técnicos de la presentación
  const {
    liquidCost,
    packagingCost,
    totalUnitCost,
    defaultPrice,
    projectedProfit,
    marginPercentage,
    marginStatus,
    ...cleanSim
  } = simulation;

  return {
    ...cleanSim,
    packagingItems: (simulation.packagingItems || []).map((item: any) => {
      const { cost, avgCost, ...cleanItem } = item;
      return cleanItem;
    }),
  };
}
