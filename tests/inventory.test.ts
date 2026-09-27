import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken } from './setup.js';

describe('Inventory & Compound Recipes (Insumos Compuestos & Regla Contable)', () => {
  const adminToken = getAdminAuthToken();
  let strawberryId: number;
  let sugarId: number;
  let compoundJamId: number;

  it('Debe crear insumos simples base con stock y costo promedio', async () => {
    const strawberry = await prisma.rawMaterial.create({
      data: {
        code: `FRESA_${Date.now()}`,
        name: 'Fresa Congelada Test',
        category: 'MATERIA_PRIMA',
        unit: 'Kilogramos',
        currentStock: 20,
        avgCost: 8000,
        minStockAlert: 5,
        isActive: true,
      },
    });
    strawberryId = strawberry.id;

    const sugar = await prisma.rawMaterial.create({
      data: {
        code: `AZUCAR_${Date.now()}`,
        name: 'Azúcar Refinada Test',
        category: 'MATERIA_PRIMA',
        unit: 'Kilogramos',
        currentStock: 15,
        avgCost: 4000,
        minStockAlert: 3,
        isActive: true,
      },
    });
    sugarId = sugar.id;

    expect(strawberryId).toBeDefined();
    expect(sugarId).toBeDefined();
  });

  it('POST /api/inventory/materials debe crear un insumo compuesto con receta y calcular costo unitario PMP', async () => {
    // Receta para 5 kg de mermelada: 3 kg de fresa ($8,000 c/u = $24,000) + 2 kg de azúcar ($4,000 c/u = $8,000) = $32,000 total / 5 kg = $6,400/kg
    const res = await request(app)
      .post('/api/inventory/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Mermelada Fresa Receta ${Date.now()}`,
        category: 'INSUMO',
        unit: 'Kilogramos',
        minStockAlert: 2,
        isCompound: true,
        recipeYield: 5,
        recipeIngredients: [
          { ingredientId: strawberryId, quantity: 3, unit: 'Kilogramos' },
          { ingredientId: sugarId, quantity: 2, unit: 'Kilogramos' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.isCompound).toBe(true);
    expect(res.body.recipeYield).toBe(5);
    expect(res.body.avgCost).toBe(6400); // 32000 / 5
    expect(res.body.recipeIngredients).toHaveLength(2);

    compoundJamId = res.body.id;
  });

  it('POST /api/inventory/materials/:id/prepare debe fabricar insumo compuesto, descontar ingredientes y sumar stock', async () => {
    // Contar gastos y movimientos de caja antes de la preparación
    const expensesBefore = await prisma.expense.count();
    const cashMovementsBefore = await prisma.cashMovement.count();

    // Fabricar 10 kg de mermelada (el doble del rendimiento base de 5 kg):
    // Debe consumir: 3*2 = 6 kg de fresa, 2*2 = 4 kg de azúcar
    const res = await request(app)
      .post(`/api/inventory/materials/${compoundJamId}/prepare`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        quantityToProduce: 10,
        notes: 'Fabricación interna de prueba 10kg',
      });

    expect(res.status).toBe(201);
    expect(res.body.quantityProduced).toBe(10);

    // Verificar stocks resultantes
    const strawberry = await prisma.rawMaterial.findUnique({ where: { id: strawberryId } });
    const sugar = await prisma.rawMaterial.findUnique({ where: { id: sugarId } });
    const jam = await prisma.rawMaterial.findUnique({ where: { id: compoundJamId } });

    expect(strawberry?.currentStock).toBe(14); // 20 - 6
    expect(sugar?.currentStock).toBe(11); // 15 - 4
    expect(jam?.currentStock).toBe(10); // 0 + 10

    // REGLA CONTABLE ESTRICTA: Cero impacto en Caja y Gastos
    const expensesAfter = await prisma.expense.count();
    const cashMovementsAfter = await prisma.cashMovement.count();

    expect(expensesAfter).toBe(expensesBefore);
    expect(cashMovementsAfter).toBe(cashMovementsBefore);
  });

  it('GET /api/expenses con paginación a 10 y filtro category=INSUMOS_EXTRA', async () => {
    const res = await request(app)
      .get('/api/expenses?category=INSUMOS_EXTRA&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.page).toBe(1);
    expect(Array.isArray(res.body.expenses)).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/clients con paginación a 12 registros por página', async () => {
    const res = await request(app)
      .get('/api/clients?page=1&limit=12')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.limit).toBe(12);
    expect(res.body.pagination.page).toBe(1);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  afterAll(async () => {
    if (compoundJamId) {
      await prisma.compoundRecipeItem.deleteMany({ where: { compoundMaterialId: compoundJamId } }).catch(() => {});
      await prisma.supplyPreparationItem.deleteMany({
        where: { preparation: { outputMaterialId: compoundJamId } },
      }).catch(() => {});
      await prisma.supplyPreparation.deleteMany({ where: { outputMaterialId: compoundJamId } }).catch(() => {});
      await prisma.rawMaterial.delete({ where: { id: compoundJamId } }).catch(() => {});
    }
    if (strawberryId) {
      await prisma.rawMaterial.delete({ where: { id: strawberryId } }).catch(() => {});
    }
    if (sugarId) {
      await prisma.rawMaterial.delete({ where: { id: sugarId } }).catch(() => {});
    }
  });
});
