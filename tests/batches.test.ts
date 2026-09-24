import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Production Batches - Fase A Fermentación, Fase B Envasado, Preventas, Agotamiento y Paginación', () => {
  const adminToken = getAdminAuthToken();

  let testMilkId: number;
  let testBottle1LId: number;
  let testBottle2LId: number;
  let testCapId: number;
  let testStaffId: number;
  let testCustomerId: number;
  let testOrderId: number;
  let createdBatchId: number;

  beforeAll(async () => {
    // 1. Asegurar insumos base con stock
    const milk = await prisma.rawMaterial.upsert({
      where: { code: 'LECHE_TEST' },
      update: { currentStock: 1000, avgCost: 2800, isActive: true },
      create: {
        code: 'LECHE_TEST',
        name: 'Leche Cruda Entera Test',
        unit: 'Litros',
        currentStock: 1000,
        avgCost: 2800,
        category: 'LACTEOS',
        isActive: true,
      },
    });
    testMilkId = milk.id;

    // Asegurar insumo de leche reconocido por búsqueda
    await prisma.rawMaterial.updateMany({
      where: { code: 'LECHE' },
      data: { currentStock: 1000 },
    });

    const b1 = await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_1L' },
      update: { currentStock: 500, avgCost: 650, isActive: true },
      create: {
        code: 'BOTELLA_1L',
        name: 'Botella Pet 1 Litro',
        unit: 'Unidades',
        currentStock: 500,
        avgCost: 650,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testBottle1LId = b1.id;

    const b2 = await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_2L' },
      update: { currentStock: 500, avgCost: 1100, isActive: true },
      create: {
        code: 'BOTELLA_2L',
        name: 'Botella Pet 2 Litros',
        unit: 'Unidades',
        currentStock: 500,
        avgCost: 1100,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testBottle2LId = b2.id;

    const cap = await prisma.rawMaterial.upsert({
      where: { code: 'TAPA' },
      update: { currentStock: 1000, avgCost: 120, isActive: true },
      create: {
        code: 'TAPA',
        name: 'Tapa de Seguridad 38mm',
        unit: 'Unidades',
        currentStock: 1000,
        avgCost: 120,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testCapId = cap.id;

    // 2. Asegurar socio para retiro
    const staff = await prisma.staffMember.upsert({
      where: { id: 888 },
      update: { fullName: 'Socio Test Producción', isActive: true },
      create: {
        id: 888,
        fullName: 'Socio Test Producción',
        role: 'SOCIO',
        type: 'SOCIO',
        isActive: true,
      },
    });
    testStaffId = staff.id;

    // 3. Asegurar cliente y pedido en preventa (batchId: null)
    let customer = await prisma.customer.findFirst({ where: { phone: '3009990011' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: 'Cliente Preventa Test',
          phone: '3009990011',
          address: 'Calle 10 # 5-20',
        },
      });
    }
    testCustomerId = customer.id;

    const orderNumber = `TEST-ORD-${Date.now()}`;
    const preOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId: testCustomerId,
        batchId: null,
        bottleSize: '1L',
        quantityBottles: 2,
        totalLiters: 2.0,
        flavor: 'Mora Silvestre',
        unitPrice: 12000,
        totalAmount: 24000,
        paidAmount: 0,
        pendingAmount: 24000,
        paymentStatus: 'PENDING',
        deliveryStatus: 'PENDING',
        items: {
          create: [
            {
              batchId: null,
              bottleSize: '1L',
              flavor: 'Mora Silvestre',
              quantity: 2,
              unitPrice: 12000,
              totalPrice: 24000,
              totalLiters: 2.0,
              litersPerUnit: 1.0,
            },
          ],
        },
      },
    });
    testOrderId = preOrder.id;
  });

  it('GET /api/batches sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/batches');
    expect(res.status).toBe(401);
  });

  it('GET /api/batches con autenticación debe retornar estructura paginada a 5 por defecto', async () => {
    const res = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 5,
      totalPages: expect.any(Number),
    });
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/batches?page=1&limit=5&status=ALL debe respetar los parámetros de paginación', async () => {
    const res = await request(app)
      .get('/api/batches?page=1&limit=5&status=ALL')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('POST /api/batches con leche negativa o cero debe fallar validación con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: -5,
        flavor: 'Mora',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/batches solicitando una cantidad enorme de leche sin stock debe rechazar con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 999999,
        flavor: 'Arequipe',
        totalLitersProduced: 999999,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Stock insuficiente');
  });

  it('Fase A (Fermentación): POST /api/batches debe crear lote base sin requerir botellas en estado EN_FERMENTACION', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 30,
        totalLitersProduced: 29,
        flavor: 'Base Fermentada Natural',
        cultureType: 'Cultivo Probiótico Activo',
        initialSugarGrams: 0,
        useSugar: false,
        usePowderedMilk: false,
        status: 'EN_FERMENTACION',
        notes: 'Inoculación tina 1 - pH 6.6',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('EN_FERMENTACION');
    expect(res.body.packagedLiters).toBe(0);
    expect(res.body.bottles1LProduced).toBe(0);
    expect(res.body.bottles2LProduced).toBe(0);
    expect(res.body.cultureType).toBe('Cultivo Probiótico Activo');

    createdBatchId = res.body.id;
  });

  it('Fase B (Envasado y Fraccionamiento): POST /api/batches/:id/packaging fracciona lote y pasa a DISPONIBLE', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Mora Silvestre',
        bottles1L: 10,
        bottles2L: 5, // 10*1 + 5*2 = 20 Litros
        notes: 'Envasado lote fraccionario 1',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('packaging');
    expect(res.body.packaging.flavor).toBe('Mora Silvestre');
    expect(res.body.packaging.totalLiters).toBe(20);
    expect(res.body.batch.packagedLiters).toBe(20);
    expect(res.body.batch.status).toBe('DISPONIBLE');
  });

  it('Fase B con Pre-venta: POST /api/batches/:id/packaging vincula pedidos pendientes de forma atómica', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Mora Silvestre',
        bottles1L: 5,
        bottles2L: 2, // 5 + 4 = 9 Litros adicionales (total 29L envasados)
        linkOrderIds: [testOrderId],
      });

    expect(res.status).toBe(201);
    expect(res.body.batch.packagedLiters).toBe(29);

    // Verificar que el pedido quedó vinculado
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { items: true },
    });
    expect(updatedOrder?.batchId).toBe(createdBatchId);
    expect(updatedOrder?.items[0].batchId).toBe(createdBatchId);
  });

  it('Auditoría Completa: GET /api/batches/:id/summary retorna balance lácteo, botellas y pedidos vinculados', async () => {
    const res = await request(app)
      .get(`/api/batches/${createdBatchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rawMaterialsBalance');
    expect(res.body).toHaveProperty('bottlesBreakdown');
    expect(res.body).toHaveProperty('volumeBalance');
    expect(res.body).toHaveProperty('packagings');
    expect(res.body).toHaveProperty('linkedOrders');

    expect(res.body.rawMaterialsBalance.milkUsedLiters).toBe(30);
    expect(res.body.rawMaterialsBalance.totalLitersProduced).toBe(29);
    expect(res.body.rawMaterialsBalance.packagedLiters).toBe(29);
    expect(res.body.rawMaterialsBalance.unpackagedLiters).toBe(0);

    expect(res.body.linkedOrders.length).toBeGreaterThanOrEqual(1);
    expect(res.body.linkedOrders[0].id).toBe(testOrderId);
  });

  it('Retiro de Socio: POST /api/batches/:id/partner-withdrawal descuenta botellas del lote', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/partner-withdrawal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottleSize: '1L',
        quantityBottles: 2,
        staffMemberId: testStaffId,
        notes: 'Consumo personal de socio test',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('discharge');
    expect(res.body.discharge.reasonType).toBe('CONSUMO_SOCIO');
    expect(res.body.discharge.quantityBottles).toBe(2);
  });

  it('Transición y Reactivación Bidireccional: Agotamiento al consumir saldo y reactivación al desvincular pedido', async () => {
    // 1. Obtener litros restantes y agotarlo intencionalmente con un descargo
    const summaryBefore = await request(app)
      .get(`/api/batches/${createdBatchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    const remaining = summaryBefore.body.volumeBalance.remainingAvailable;
    expect(remaining).toBeGreaterThan(0);

    // Descargar el saldo exacto restante para llevarlo a 0
    await request(app)
      .post(`/api/batches/${createdBatchId}/discharges`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottleSize: '1L',
        quantityBottles: Math.floor(remaining),
        totalLiters: remaining,
        reasonType: 'MERMA_DANO',
        notes: 'Agotamiento inducido para test de reactivación',
      });

    // Validar que el lote pasó automáticamente a AGOTADO
    const batchDepleted = await prisma.productionBatch.findUnique({
      where: { id: createdBatchId },
    });
    expect(batchDepleted?.status).toBe('AGOTADO');

    // 2. Desvincular el pedido de prueba mediante DELETE /api/batches/:id/orders/:orderId
    const unlinkRes = await request(app)
      .delete(`/api/batches/${createdBatchId}/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unlinkRes.status).toBe(200);
    expect(unlinkRes.body.message).toContain('desvinculado exitosamente');

    // El pedido debe haber regresado a preventa (batchId: null)
    const unlinkedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { items: true },
    });
    expect(unlinkedOrder?.batchId).toBeNull();
    expect(unlinkedOrder?.items[0].batchId).toBeNull();

    // El lote recuperó saldo (2L) y debe reactivarse automáticamente a DISPONIBLE
    const batchReactivated = await prisma.productionBatch.findUnique({
      where: { id: createdBatchId },
    });
    expect(batchReactivated?.status).toBe('DISPONIBLE');
  });
});
