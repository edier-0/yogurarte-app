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
