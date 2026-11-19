import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Spec 015 — Optimización de Preparación de Insumos Compuestos (/api/inventory/materials/:id/prepare)', () => {
  const adminToken = getAdminAuthToken();
  let fruitMaterial: any;
  let sugarMaterial: any;
  let compoundMaterial: any;
  let createdPrepId: number;

  beforeAll(async () => {
    // 1. Materias primas base
    fruitMaterial = await prisma.rawMaterial.upsert({
      where: { code: 'TEST_FRUIT_PREP_01' },
      update: { currentStock: 100, avgCost: 8000 },
      create: {
        code: 'TEST_FRUIT_PREP_01',
        name: 'Fruta Test Prep',
        category: 'INSUMO',
        unit: 'Kilogramos',
        currentStock: 100,
        avgCost: 8000,
      },
    });

    sugarMaterial = await prisma.rawMaterial.upsert({
      where: { code: 'TEST_SUGAR_PREP_01' },
      update: { currentStock: 50, avgCost: 3500 },
      create: {
        code: 'TEST_SUGAR_PREP_01',
        name: 'Azúcar Test Prep',
        category: 'INSUMO',
        unit: 'Kilogramos',
        currentStock: 50,
        avgCost: 3500,
      },
    });

    // 2. Insumo compuesto con receta base teórica (3kg fruta + 1.5kg azúcar = 3.5kg mermelada cocida)
    compoundMaterial = await prisma.rawMaterial.upsert({
      where: { code: 'TEST_MERM_COMP_01' },
      update: { currentStock: 0, isCompound: true, recipeYield: 3.5 },
      create: {
        code: 'TEST_MERM_COMP_01',
        name: 'Mermelada Compuesta Test',
        category: 'INSUMO',
        unit: 'Kilogramos',
        currentStock: 0,
        isCompound: true,
        recipeYield: 3.5,
      },
    });

    // Vincular receta estática base
    await prisma.compoundRecipeItem.deleteMany({ where: { compoundMaterialId: compoundMaterial.id } });
    await prisma.compoundRecipeItem.createMany({
      data: [
        { compoundMaterialId: compoundMaterial.id, ingredientId: fruitMaterial.id, quantity: 3.0, unit: 'Kilogramos' },
        { compoundMaterialId: compoundMaterial.id, ingredientId: sugarMaterial.id, quantity: 1.5, unit: 'Kilogramos' },
      ],
    });
  });

  afterAll(async () => {
    if (createdPrepId) {
      await prisma.supplyPreparationItem.deleteMany({ where: { preparationId: createdPrepId } });
      await prisma.supplyPreparation.deleteMany({ where: { id: createdPrepId } });
    }
    if (compoundMaterial) {
      await prisma.compoundRecipeItem.deleteMany({ where: { compoundMaterialId: compoundMaterial.id } });
    }
  });

  it('debe permitir enviar insumos reales ajustados in situ (ej. 3.8kg en vez de 3.0kg teóricos)', async () => {
    // El operario pesó 3.8 kg de fruta real en la paila y 1.6 kg de azúcar
    const customIngredients = [
      { rawMaterialId: fruitMaterial.id, quantityUsed: 3.8, unitUsed: 'Kilogramos' },
      { rawMaterialId: sugarMaterial.id, quantityUsed: 1.6, unitUsed: 'Kilogramos' },
    ];

    const res = await request(app)
      .post(`/api/inventory/materials/${compoundMaterial.id}/prepare`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        quantityToProduce: 4.0, // Rindió 4.0 kg cocidos
        preparationDate: new Date().toISOString(),
        notes: 'Tanda con pesaje real in situ',
        ingredients: customIngredients,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdPrepId = res.body.id;

    // Verificar en base de datos que se guardaron las cantidades reales (3.8 y 1.6) y no las teóricas
    const savedPrep = await prisma.supplyPreparation.findUnique({
      where: { id: createdPrepId },
      include: { ingredients: true },
    });

    expect(savedPrep).toBeDefined();
    expect(savedPrep?.quantityProduced).toBe(4.0);

    const fruitUsed = savedPrep?.ingredients.find((i) => i.rawMaterialId === fruitMaterial.id);
    const sugarUsed = savedPrep?.ingredients.find((i) => i.rawMaterialId === sugarMaterial.id);

    expect(fruitUsed?.quantityUsed).toBe(3.8);
    expect(sugarUsed?.quantityUsed).toBe(1.6);

    // Costo total = (3.8 * 8000) + (1.6 * 3500) = 30400 + 5600 = 36000
    expect(savedPrep?.totalCost).toBe(36000);
    // Costo unitario = 36000 / 4.0 = 9000
    expect(savedPrep?.costPerUnit).toBe(9000);
  });
});
