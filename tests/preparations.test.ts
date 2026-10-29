import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken } from './setup.js';

describe('Supply Preparations Endpoints', () => {
  const adminToken = getAdminAuthToken();
  let testRawMaterialId: number;
  let testOutputMaterialId: number;
  let testPrepId: number;

  it('GET /api/preparations sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/preparations');
    expect(res.status).toBe(401);
  });

  it('GET /api/preparations con autenticación debe retornar listado', async () => {
    const res = await request(app)
      .get('/api/preparations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/preparations/:id con ID inexistente debe responder 404', async () => {
    const res = await request(app)
      .get('/api/preparations/999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('POST /api/preparations con cantidad inválida debe responder 400', async () => {
    const res = await request(app)
      .post('/api/preparations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        quantityProduced: 0,
        ingredients: [],
      });

    expect(res.status).toBe(400);
  });

  it('POST /api/preparations debe crear una elaboración con nuevo insumo y descontar stock', async () => {
    // 1. Crear insumo base con stock suficiente
    const ingredient = await prisma.rawMaterial.create({
      data: {
        code: `TEST_ING_${Date.now()}`,
        name: 'Insumo Test Fresa',
        category: 'MATERIA_PRIMA',
        unit: 'Kg',
        currentStock: 10,
        avgCost: 5000,
        minStockAlert: 2,
        isActive: true,
      },
    });
    testRawMaterialId = ingredient.id;

    // 2. Crear preparación
    const res = await request(app)
      .post('/api/preparations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newMaterialName: `Mermelada Test ${Date.now()}`,
        quantityProduced: 2,
        unit: 'Kilogramos',
        notes: 'Lote de prueba automatizada',
        ingredients: [
          {
            rawMaterialId: ingredient.id,
            quantityUsed: 2,
            unitUsed: 'Kg',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('code');
    expect(res.body.quantityProduced).toBe(2);
    expect(res.body.totalCost).toBe(10000); // 2 * 5000
    testPrepId = res.body.id;
    testOutputMaterialId = res.body.outputMaterialId;

    // 3. Verificar descuento de stock del ingrediente
    const updatedIngredient = await prisma.rawMaterial.findUnique({
      where: { id: testRawMaterialId },
    });
    expect(updatedIngredient?.currentStock).toBe(8); // 10 - 2
  });

  it('PUT /api/preparations/:id debe actualizar fecha y notas de la elaboración sin alterar stock', async () => {
    if (!testPrepId) return;

    const res = await request(app)
      .put(`/api/preparations/${testPrepId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Notas actualizadas Spec 003',
        registeredBy: 'Supervisor Test',
      });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Notas actualizadas Spec 003');
    expect(res.body.registeredBy).toBe('Supervisor Test');

    // Verificar que el stock de insumos e ingrediente permanezca intacto
    const ingredient = await prisma.rawMaterial.findUnique({
      where: { id: testRawMaterialId },
    });
    expect(ingredient?.currentStock).toBe(8);
  });

  it('DELETE /api/preparations/:id debe revertir el stock y eliminar la preparación', async () => {
    if (!testPrepId) return;

    const res = await request(app)
      .delete(`/api/preparations/${testPrepId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verificar que el stock se haya revertido
    const revertedIngredient = await prisma.rawMaterial.findUnique({
      where: { id: testRawMaterialId },
    });
    expect(revertedIngredient?.currentStock).toBe(10);
  });

  it('RF-10: DELETE /api/preparations/:id debe rechazar la anulación si el stock del producto elaborado es insuficiente', async () => {
    const baseMat = await prisma.rawMaterial.create({
      data: {
        code: `RF10_BASE_${Date.now()}`,
        name: 'Insumo Base RF10',
        category: 'MATERIA_PRIMA',
        unit: 'Kg',
        currentStock: 10,
        avgCost: 2000,
        isActive: true,
      },
    });

    const prepRes = await request(app)
      .post('/api/preparations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newMaterialName: `Mermelada RF10 ${Date.now()}`,
        quantityProduced: 5,
        unit: 'Kilogramos',
        ingredients: [{ rawMaterialId: baseMat.id, quantityUsed: 5, unitUsed: 'Kg' }],
      });
    expect(prepRes.status).toBe(201);
    const prepId = prepRes.body.id;
    const outputMatId = prepRes.body.outputMaterialId;

    await prisma.rawMaterial.update({
      where: { id: outputMatId },
      data: { currentStock: 1 },
    });

    const delRes = await request(app)
      .delete(`/api/preparations/${prepId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.error).toContain('No es posible anular la elaboración');

    await prisma.supplyPreparationItem.deleteMany({ where: { preparationId: prepId } });
    await prisma.supplyPreparation.delete({ where: { id: prepId } });
    await prisma.rawMaterial.deleteMany({ where: { id: { in: [baseMat.id, outputMatId] } } });
  });

  it('Spec 001: Preparación de mermelada con fruta base + azúcar rinde mayor cantidad y calcula costo unitario exacto', async () => {
    // 1. Crear insumos: Fruta Mora (10 kg a $8.000) y Azúcar (10 kg a $4.000)
    const fruit = await prisma.rawMaterial.create({
      data: {
        code: `FRUTA_MORA_${Date.now()}`,
        name: 'Mora Cruda Test Spec001',
        category: 'MATERIA_PRIMA',
        unit: 'Kg',
        currentStock: 10,
        avgCost: 8000,
        isActive: true,
      },
    });

    const sugar = await prisma.rawMaterial.create({
      data: {
        code: `AZUCAR_PREP_${Date.now()}`,
        name: 'Azúcar Prep Test Spec001',
        category: 'MATERIA_PRIMA',
        unit: 'Kg',
        currentStock: 10,
        avgCost: 4000,
        isActive: true,
      },
    });

    // 2. Preparar mermelada: usa 1.7 kg de mora ($13.600) + 0.5 kg de azúcar ($2.000) = $15.600
    // Rendimiento real obtenido: 2.2 kg de mermelada
    const res = await request(app)
      .post('/api/preparations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newMaterialName: `Mermelada de Mora Spec001 ${Date.now()}`,
        quantityProduced: 2.2,
        unit: 'Kilogramos',
        notes: 'Preparación de mora con expansión de rendimiento real',
        ingredients: [
          {
            rawMaterialId: fruit.id,
            quantityUsed: 1.7,
            unitUsed: 'Kg',
          },
          {
            rawMaterialId: sugar.id,
            quantityUsed: 0.5,
            unitUsed: 'Kg',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.quantityProduced).toBe(2.2);
    expect(res.body.totalCost).toBe(15600); // 1.7*8000 + 0.5*4000
    expect(res.body.costPerUnit).toBe(Math.round(15600 / 2.2)); // 7091

    // 3. Verificar stocks descontados
    const updatedFruit = await prisma.rawMaterial.findUnique({ where: { id: fruit.id } });
    expect(updatedFruit?.currentStock).toBeCloseTo(8.3, 2); // 10 - 1.7

    const updatedSugar = await prisma.rawMaterial.findUnique({ where: { id: sugar.id } });
    expect(updatedSugar?.currentStock).toBeCloseTo(9.5, 2); // 10 - 0.5

    // 4. Verificar stock y costo unitario en el insumo generado
    const outputMat = await prisma.rawMaterial.findUnique({ where: { id: res.body.outputMaterialId } });
    expect(outputMat?.currentStock).toBe(2.2);
    expect(outputMat?.avgCost).toBe(Math.round(15600 / 2.2));

    // Limpieza
    await prisma.supplyPreparation.delete({ where: { id: res.body.id } });
    await prisma.rawMaterial.deleteMany({ where: { id: { in: [fruit.id, sugar.id, res.body.outputMaterialId] } } });
  });

  afterAll(async () => {
    // Limpieza de datos de prueba
    if (testOutputMaterialId) {
      await prisma.rawMaterial.deleteMany({
        where: { id: testOutputMaterialId },
      });
    }
    if (testRawMaterialId) {
      await prisma.rawMaterial.deleteMany({
        where: { id: testRawMaterialId },
      });
    }
  });
});
