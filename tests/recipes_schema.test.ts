import { describe, it, expect } from 'vitest';
import {
  createRecipeSchema,
  updateRecipeSchema,
  simulatePresentationSchema,
} from '../src/modules/recipes/recipes.schema.js';

describe('Spec 015 — Esquemas Zod de Recetas (recipes.schema.ts)', () => {
  describe('createRecipeSchema', () => {
    it('debe rechazar categorías no autorizadas', () => {
      const data = {
        name: 'Receta Inválida',
        code: 'REC-INV-01',
        category: 'OTRA_COSA',
        baseYield: 10,
        yieldUnit: 'Litros',
        ingredients: [{ rawMaterialId: 1, quantity: 5, unit: 'Litros' }],
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/categoría|invalid option|expected one of/i);
      }
    });

    it('debe validar exitosamente una receta de ELABORACION con outputMaterialId e ingredientes', () => {
      const data = {
        name: 'Mermelada de Mora',
        code: 'REC-MERM-MORA',
        category: 'ELABORACION',
        flavor: 'Mora',
        outputMaterialId: 4,
        baseYield: 5.0,
        yieldUnit: 'Kilogramos',
        ingredients: [
          { rawMaterialId: 2, quantity: 4.0, unit: 'Kilogramos' },
          { rawMaterialId: 3, quantity: 2.0, unit: 'Kilogramos' },
        ],
        steps: [
          { stepNumber: 1, title: 'Lavado', description: 'Lavar mora fresca' },
        ],
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('REC-MERM-MORA');
        expect(result.data.outputMaterialId).toBe(4);
      }
    });

    it('debe rechazar una receta de ELABORACION sin outputMaterialId', () => {
      const data = {
        name: 'Mermelada sin salida',
        code: 'REC-MERM-TEST',
        category: 'ELABORACION',
        baseYield: 5.0,
        yieldUnit: 'Kilogramos',
        ingredients: [{ rawMaterialId: 1, quantity: 1, unit: 'Kg' }],
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('outputMaterialId'));
        expect(issue).toBeDefined();
      }
    });

    it('debe rechazar recetas de ELABORACION o FASE_A sin ingredientes de almacén', () => {
      const dataElab = {
        name: 'Mermelada Vacía',
        code: 'REC-MERM-VACIA',
        category: 'ELABORACION',
        outputMaterialId: 1,
        baseYield: 5,
        yieldUnit: 'Kilogramos',
        ingredients: [],
      };

      const resultElab = createRecipeSchema.safeParse(dataElab);
      expect(resultElab.success).toBe(false);

      const dataFaseA = {
        name: 'Base Láctea Vacía',
        code: 'REC-FASEA-VACIA',
        category: 'FASE_A',
        baseYield: 100,
        yieldUnit: 'Litros',
        ingredients: [],
      };

      const resultFaseA = createRecipeSchema.safeParse(dataFaseA);
      expect(resultFaseA.success).toBe(false);
    });

    it('debe validar exitosamente una receta de FASE_B de yogur natural con 0 ingredientes crudos', () => {
      const dataNatural = {
        name: 'Yogur Natural',
        code: 'REC-FASEB-NAT',
        category: 'FASE_B',
        flavor: 'Natural',
        baseLiters: 10.0,
        baseYield: 10.0,
        yieldUnit: 'Litros',
        ingredients: [],
      };

      const result = createRecipeSchema.safeParse(dataNatural);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flavor).toBe('Natural');
        expect(result.data.baseLiters).toBe(10.0);
      }
    });

    it('debe rechazar una receta de FASE_B sin sabor (flavor obligatorio)', () => {
      const data = {
        name: 'Yogur Sin Sabor Declarado',
        code: 'REC-FASEB-ERR1',
        category: 'FASE_B',
        baseLiters: 10.0,
        baseYield: 10.0,
        yieldUnit: 'Litros',
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('flavor'));
        expect(issue).toBeDefined();
      }
    });

    it('debe rechazar una receta de FASE_B sin baseLiters o con baseLiters <= 0', () => {
      const data = {
        name: 'Yogur Sin Base',
        code: 'REC-FASEB-ERR2',
        category: 'FASE_B',
        flavor: 'Fresa',
        baseLiters: 0,
        baseYield: 10.0,
        yieldUnit: 'Litros',
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('baseLiters'));
        expect(issue).toBeDefined();
      }
    });

    it('debe rechazar una receta de FASE_B con incoherencia física de volumen (baseYield < baseLiters)', () => {
      const data = {
        name: 'Yogur Imposible',
        code: 'REC-FASEB-ERR3',
        category: 'FASE_B',
        flavor: 'Fresa',
        baseLiters: 10.0,
        baseYield: 8.0, // Error: 8L final < 10L base
        yieldUnit: 'Litros',
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/rendimiento final.*no puede ser menor.*base láctea/i);
      }
    });

    it('debe aceptar una receta de FASE_B con expansión volumétrica legítima (baseYield >= baseLiters)', () => {
      const data = {
        name: 'Yogur Fresa Tradicional',
        code: 'REC-FASEB-FRESA-OK',
        category: 'FASE_B',
        flavor: 'Fresa',
        baseLiters: 10.0,
        baseYield: 11.2, // Expansión legítima por mermelada
        yieldUnit: 'Litros',
        ingredients: [{ rawMaterialId: 5, quantity: 1.5, unit: 'Kilogramos' }],
      };

      const result = createRecipeSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('simulatePresentationSchema', () => {
    it('debe validar un presentationId entero positivo', () => {
      expect(simulatePresentationSchema.safeParse({ presentationId: '1' }).success).toBe(true);
      expect(simulatePresentationSchema.safeParse({ presentationId: 2 }).success).toBe(true);
      expect(simulatePresentationSchema.safeParse({ presentationId: -1 }).success).toBe(false);
      expect(simulatePresentationSchema.safeParse({ presentationId: 'abc' }).success).toBe(false);
    });
  });
});
