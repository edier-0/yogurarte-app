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

  it('DELETE /api/inventory/materials/:id debe eliminar permanentemente si el insumo NO tiene registros asociados', async () => {
    // Crear un insumo temporal sin compras, movimientos ni usos
    const orphanMat = await prisma.rawMaterial.create({
      data: {
        code: `ORPHAN_${Date.now()}`,
        name: 'Insumo Huérfano Test',
        category: 'INSUMO',
        unit: 'Unidades',
        currentStock: 0,
        avgCost: 100,
        isActive: true,
      },
    });

    const res = await request(app)
      .delete(`/api/inventory/materials/${orphanMat.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('DELETED');

    const check = await prisma.rawMaterial.findUnique({ where: { id: orphanMat.id } });
    expect(check).toBeNull();
  });

  it('DELETE /api/inventory/materials/:id debe desactivar (soft-delete) si tiene registros asociados', async () => {
    // strawberryId ya fue usado en la fabricación de compoundJamId (tiene supplyPreparationsUsed)
    const res = await request(app)
      .delete(`/api/inventory/materials/${strawberryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.action).toBe('DEACTIVATED');

    // Verificar en BD que sigue existiendo pero isActive: false
    const check = await prisma.rawMaterial.findUnique({ where: { id: strawberryId } });
    expect(check).not.toBeNull();
    expect(check?.isActive).toBe(false);

    // Verificar que GET /api/inventory/materials (sin includeInactive) NO lo retorna
    const listActive = await request(app)
      .get('/api/inventory/materials')
      .set('Authorization', `Bearer ${adminToken}`);
    const activeMaterials = Array.isArray(listActive.body) ? listActive.body : listActive.body.items;
    const found = activeMaterials.find((m: any) => m.id === strawberryId);
    expect(found).toBeUndefined();

    // Verificar que con includeInactive=true SÍ lo retorna
    const listAll = await request(app)
      .get('/api/inventory/materials?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`);
    const allMaterials = Array.isArray(listAll.body) ? listAll.body : listAll.body.items;
    const foundInactive = allMaterials.find((m: any) => m.id === strawberryId);
    expect(foundInactive).toBeDefined();
    expect(foundInactive.isActive).toBe(false);
  });

  it('PUT /api/inventory/materials/:id debe permitir reactivar un insumo desactivado', async () => {
    const res = await request(app)
      .put(`/api/inventory/materials/${strawberryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(true);

    const check = await prisma.rawMaterial.findUnique({ where: { id: strawberryId } });
    expect(check?.isActive).toBe(true);
  });

  describe('Kardex Movements - Edición, Eliminación y Restablecimiento de Stock', () => {
    let testMaterialId: number;
    let adjustmentId: number;

    it('Debe crear un insumo base y registrar un movimiento inicial de Kardex (SALIDA)', async () => {
      const mat = await prisma.rawMaterial.create({
        data: {
          code: `KARDEX_TEST_${Date.now()}`,
          name: 'Envase PET 1L Test',
          category: 'EMPAQUE',
          unit: 'Unidades',
          currentStock: 100,
          avgCost: 500,
          minStockAlert: 10,
          isActive: true,
        },
      });
      testMaterialId = mat.id;

      // Registrar salida de 20 unidades
      const res = await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rawMaterialId: testMaterialId,
          newStock: 80, // delta = -20
          type: 'MERMA_CONSUMO',
          reason: 'Prueba de merma inicial',
          registeredBy: 'Tester',
        });

      expect(res.status).toBe(201);
      expect(res.body.adjustment).toBeDefined();
      expect(res.body.adjustment.deltaQuantity).toBe(-20);
      expect(res.body.material.currentStock).toBe(80);

      adjustmentId = res.body.adjustment.id;
    });

    it('PUT /api/inventory/adjustments/:id debe editar el movimiento modificando cantidad y recalcular el stock', async () => {
      // Modificar salida de 20 a salida de 15: el stock debe pasar de 80 a 85
      const res = await request(app)
        .put(`/api/inventory/adjustments/${adjustmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 15,
          movementType: 'SALIDA',
          reason: 'Corrección: sólo se mermaron 15 unidades',
        });

      expect(res.status).toBe(200);
      expect(res.body.adjustment.deltaQuantity).toBe(-15);
      expect(res.body.adjustment.reason).toBe('Corrección: sólo se mermaron 15 unidades');
      expect(res.body.newCurrentStock).toBe(85);

      const mat = await prisma.rawMaterial.findUnique({ where: { id: testMaterialId } });
      expect(mat?.currentStock).toBe(85);
    });

    it('PUT /api/inventory/movements/:id (alias) debe cambiar el tipo a ENTRADA y recalcular stock correspondientemente', async () => {
      // Cambiar de salida de 15 a entrada de 10:
      // Stock anterior era 85 (con delta de -15).
      // Al cambiar a delta de +10, la diferencia es +10 - (-15) = +25.
      // El stock debe pasar de 85 a 110 (100 base + 10 entrada)
      const res = await request(app)
        .put(`/api/inventory/movements/${adjustmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 10,
          movementType: 'ENTRADA',
          reason: 'Corrección: era reposición de stock',
        });

      expect(res.status).toBe(200);
      expect(res.body.adjustment.deltaQuantity).toBe(10);
      expect(res.body.newCurrentStock).toBe(110);

      const mat = await prisma.rawMaterial.findUnique({ where: { id: testMaterialId } });
      expect(mat?.currentStock).toBe(110);
    });

    it('DELETE /api/inventory/adjustments/:id debe eliminar el movimiento y restablecer el stock original', async () => {
      // El movimiento actual tiene deltaQuantity = +10 y stock actual = 110.
      // Al eliminarlo, restoredStock = 110 - (+10) = 100.
      const res = await request(app)
        .delete(`/api/inventory/adjustments/${adjustmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restoredStock).toBe(100);

      const mat = await prisma.rawMaterial.findUnique({ where: { id: testMaterialId } });
      expect(mat?.currentStock).toBe(100);

      const adj = await prisma.inventoryAdjustment.findUnique({ where: { id: adjustmentId } });
      expect(adj).toBeNull();
    });

    it('PUT y DELETE en movimientos inexistentes deben retornar 404', async () => {
      const putRes = await request(app)
        .put('/api/inventory/adjustments/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5 });

      expect(putRes.status).toBe(404);

      const delRes = await request(app)
        .delete('/api/inventory/adjustments/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(404);
    });

    afterAll(async () => {
      if (testMaterialId) {
        await prisma.inventoryAdjustment.deleteMany({ where: { rawMaterialId: testMaterialId } }).catch(() => {});
        await prisma.rawMaterial.delete({ where: { id: testMaterialId } }).catch(() => {});
      }
    });
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
