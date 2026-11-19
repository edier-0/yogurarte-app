import { describe, it, expect } from 'vitest';
import {
  sanitizeRecipeForRole,
  sanitizeRecipeListForRole,
  sanitizeSimulationForRole,
} from '../src/modules/recipes/recipes.serializer.js';

describe('Spec 015 — Serializador de Confidencialidad RBAC (recipes.serializer.ts)', () => {
  const mockRecipe = {
    id: 1,
    code: 'REC-FASEB-FRESA-TRAD',
    name: 'Yogur de Fresa Tradicional',
    category: 'FASE_B',
    flavor: 'Fresa',
    baseYield: 11.2,
    yieldUnit: 'Litros',
    baseLiters: 10.0,
    status: 'ACTIVA',
    createdById: 1,
    // Métricas y costos calculados
    baseLitersCost: 32000,
    ingredientsCost: 16000,
    totalCost: 48000,
    theoreticalUnitCost: 4285.71,
    ingredients: [
      {
        id: 10,
        rawMaterialId: 5,
        quantity: 2.0,
        unit: 'Kilogramos',
        rawMaterial: {
          id: 5,
          name: 'Mermelada de Fresa',
          code: 'MERM_FRESA',
          category: 'INSUMO',
          unit: 'Kilogramos',
          avgCost: 8000,
        },
        unitCost: 8000,
        totalCost: 16000,
      },
    ],
    steps: [
      {
        id: 20,
        stepNumber: 1,
        title: 'Mezcla',
        description: 'Incorporar mermelada',
        estimatedMinutes: 15,
        temperatureTarget: 10,
        qualityCheck: 'Color rosado uniforme',
      },
    ],
  };

  describe('Para roles privilegiados (ADMIN o SOCIO)', () => {
    it('debe mantener todos los costos y márgenes para ADMIN', () => {
      const sanitized = sanitizeRecipeForRole(mockRecipe, 'ADMIN');
      expect(sanitized.totalCost).toBe(48000);
      expect(sanitized.theoreticalUnitCost).toBe(4285.71);
      expect(sanitized.baseLitersCost).toBe(32000);
      expect(sanitized.ingredients[0].avgCost).toBe(8000);
      expect(sanitized.ingredients[0].totalCost).toBe(16000);
    });

    it('debe mantener todos los costos y márgenes para SOCIO', () => {
      const sanitized = sanitizeRecipeForRole(mockRecipe, 'SOCIO');
      expect(sanitized.totalCost).toBe(48000);
      expect(sanitized.theoreticalUnitCost).toBe(4285.71);
    });
  });

  describe('Para roles de planta y operación (PRODUCCION u OPERADOR)', () => {
    it('debe omitir estrictamente cualquier dato de costo en la cabecera', () => {
      const sanitized = sanitizeRecipeForRole(mockRecipe, 'PRODUCCION');
      expect((sanitized as any).totalCost).toBeUndefined();
      expect((sanitized as any).theoreticalUnitCost).toBeUndefined();
      expect((sanitized as any).baseLitersCost).toBeUndefined();
      expect((sanitized as any).ingredientsCost).toBeUndefined();
      expect((sanitized as any).marginPercentage).toBeUndefined();
      expect((sanitized as any).projectedProfit).toBeUndefined();
    });

    it('debe omitir estrictamente los costos de insumos en los ingredientes', () => {
      const sanitized = sanitizeRecipeForRole(mockRecipe, 'PRODUCCION');
      expect(sanitized.ingredients[0].quantity).toBe(2.0);
      expect(sanitized.ingredients[0].unit).toBe('Kilogramos');
      expect((sanitized.ingredients[0] as any).unitCost).toBeUndefined();
      expect((sanitized.ingredients[0] as any).avgCost).toBeUndefined();
      expect((sanitized.ingredients[0] as any).totalCost).toBeUndefined();
      if (sanitized.ingredients[0].rawMaterial) {
        expect((sanitized.ingredients[0].rawMaterial as any).avgCost).toBeUndefined();
      }
    });

    it('debe preservar intactos todos los datos técnicos y operativos', () => {
      const sanitized = sanitizeRecipeForRole(mockRecipe, 'OPERADOR');
      expect(sanitized.code).toBe('REC-FASEB-FRESA-TRAD');
      expect(sanitized.name).toBe('Yogur de Fresa Tradicional');
      expect(sanitized.category).toBe('FASE_B');
      expect(sanitized.flavor).toBe('Fresa');
      expect(sanitized.baseYield).toBe(11.2);
      expect(sanitized.baseLiters).toBe(10.0);
      expect(sanitized.steps.length).toBe(1);
      expect(sanitized.steps[0].temperatureTarget).toBe(10);
      expect(sanitized.steps[0].qualityCheck).toBe('Color rosado uniforme');
    });

    it('debe sanitizar listas completas de recetas', () => {
      const list = [mockRecipe];
      const sanitizedList = sanitizeRecipeListForRole(list, 'PRODUCCION');
      expect(sanitizedList.length).toBe(1);
      expect((sanitizedList[0] as any).totalCost).toBeUndefined();
    });

    it('debe censurar o bloquear datos de simulación comercial para roles de planta', () => {
      const simulationData = {
        presentation: { id: 1, name: '1L', label: '1 Litro', capacityLiters: 1.0 },
        liquidCost: 4285.71,
        packagingItems: [{ code: 'BOTELLA_1L', name: 'Botella 1L', cost: 1200 }],
        packagingCost: 1500,
        totalUnitCost: 5785.71,
        defaultPrice: 12000,
        projectedProfit: 6214.29,
        marginPercentage: 51.78,
        marginStatus: 'GREEN',
      };

      const adminSim = sanitizeSimulationForRole(simulationData, 'ADMIN');
      expect(adminSim.totalUnitCost).toBe(5785.71);
      expect(adminSim.marginPercentage).toBe(51.78);

      const opSim = sanitizeSimulationForRole(simulationData, 'PRODUCCION');
      expect((opSim as any).totalUnitCost).toBeUndefined();
      expect((opSim as any).defaultPrice).toBeUndefined();
      expect((opSim as any).projectedProfit).toBeUndefined();
      expect((opSim as any).marginPercentage).toBeUndefined();
    });
  });
});
