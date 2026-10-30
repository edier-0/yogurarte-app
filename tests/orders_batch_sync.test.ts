import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Spec 008 — Sincronización Integral de Pedidos, Lotes y Auditoría de Fase B', () => {
  const adminToken = getAdminAuthToken();

  let testBatch1Id: number;
  let testBatch2Id: number;
  let testPackaging1Id: number;
  let testPackaging2Id: number;
  let testOrderId: number;
  let testCustomer: any;

  beforeAll(async () => {
    // 1. Crear cliente de prueba
    testCustomer = await prisma.customer.create({
      data: {
        fullName: 'Cliente Sync Test',
        phone: '3109998877',
        address: 'Fonseca, Calle Central',
      },
    });

    // 2. Crear lote 1 (Fresa) con fracción envasada
    const batch1 = await prisma.productionBatch.create({
      data: {
        batchCode: `TEST-SYNC-B1-${Date.now()}`,
        milkUsedLiters: 30,
        totalLitersProduced: 28,
        yieldPercentage: 93.3,
        flavor: 'Natural',
        status: 'COMPLETADO',
        packagedLiters: 20,
        costPerLiter: 3000,
        preparationDate: new Date(),
      },
    });
    testBatch1Id = batch1.id;

    const pkg1 = await prisma.batchPackaging.create({
      data: {
        batchId: batch1.id,
        packagingCode: `PKG-FRESA-${Date.now()}`,
        flavor: 'Fresa Sync Test',
        bottles1L: 20,
        totalLiters: 20,
        baseLitersUsed: 20,
        containers: [
          { containerName: '1L', capacityLiters: 1.0, quantity: 20, price: 12000 },
        ],
      },
    });
    testPackaging1Id = pkg1.id;

    // 3. Crear lote 2 (Mora) con fracción envasada
    const batch2 = await prisma.productionBatch.create({
      data: {
        batchCode: `TEST-SYNC-B2-${Date.now()}`,
        milkUsedLiters: 30,
        totalLitersProduced: 28,
        yieldPercentage: 93.3,
        flavor: 'Natural',
        status: 'COMPLETADO',
        packagedLiters: 15,
        costPerLiter: 3000,
        preparationDate: new Date(),
      },
    });
    testBatch2Id = batch2.id;

    const pkg2 = await prisma.batchPackaging.create({
      data: {
        batchId: batch2.id,
        packagingCode: `PKG-MORA-${Date.now()}`,
        flavor: 'Mora Sync Test',
        bottles1L: 15,
        totalLiters: 15,
        baseLitersUsed: 15,
        containers: [
          { containerName: '1L', capacityLiters: 1.0, quantity: 15, price: 12000 },
        ],
      },
    });
    testPackaging2Id = pkg2.id;
  });

  afterAll(async () => {
    // Limpieza en orden
    if (testOrderId) {
      await prisma.orderPayment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
    }
    if (testCustomer?.id) {
      await prisma.customer.deleteMany({ where: { id: testCustomer.id } });
    }
    if (testPackaging1Id) {
      await prisma.batchPackagingItem.deleteMany({ where: { packagingId: testPackaging1Id } });
      await prisma.batchPackaging.deleteMany({ where: { id: testPackaging1Id } });
    }
    if (testPackaging2Id) {
      await prisma.batchPackagingItem.deleteMany({ where: { packagingId: testPackaging2Id } });
      await prisma.batchPackaging.deleteMany({ where: { id: testPackaging2Id } });
    }
    if (testBatch1Id) {
      await prisma.productionBatch.deleteMany({ where: { id: testBatch1Id } });
    }
    if (testBatch2Id) {
      await prisma.productionBatch.deleteMany({ where: { id: testBatch2Id } });
    }
  });

  it('POST /api/orders debe crear comanda con packagingId asignado a Fase B', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomer.id,
        items: [
          {
            packagingId: testPackaging1Id,
            bottleSize: '1L',
            flavor: 'Fresa Sync Test',
            quantity: 2,
            unitPrice: 12000,
          },
          {
            packagingId: testPackaging2Id,
            bottleSize: '1L',
            flavor: 'Mora Sync Test',
            quantity: 1,
            unitPrice: 12000,
          },
        ],
        totalAmount: 36000,
        deliveryStatus: 'PENDING',
      });

    expect(res.status).toBe(201);
    testOrderId = res.body.id;
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].packagingId).toBe(testPackaging1Id);
    expect(res.body.items[1].packagingId).toBe(testPackaging2Id);
    // Al ser multi-lote, el batchId de cabecera debe ser null
    expect(res.body.batchId).toBeNull();
  });

  it('GET /api/orders debe proyectar packagingId y objeto packaging en cada ítem (RF-1)', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'Cliente Sync Test' });

    expect(res.status).toBe(200);
    const orders = res.body.data || res.body.items || res.body;
    const found = orders.find((o: any) => o.id === testOrderId);
    expect(found).toBeDefined();
    expect(found.items).toHaveLength(2);

    const fresaItem = found.items.find((it: any) => it.flavor === 'Fresa Sync Test');
    expect(fresaItem).toBeDefined();
    expect(fresaItem.packagingId).toBe(testPackaging1Id);
    expect(fresaItem.packaging).toBeDefined();
    expect(fresaItem.packaging.id).toBe(testPackaging1Id);
  });

  it('GET /api/orders/:id debe incluir packagingId y relación packaging (RF-1)', async () => {
    const res = await request(app)
      .get(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testOrderId);
    const fresaItem = res.body.items.find((it: any) => it.flavor === 'Fresa Sync Test');
    expect(fresaItem.packagingId).toBe(testPackaging1Id);
    expect(fresaItem.packaging.id).toBe(testPackaging1Id);
  });

  it('PUT /api/orders/:id debe preservar packagingId al actualizar cantidades (RF-3)', async () => {
    const res = await request(app)
      .put(`/api/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            packagingId: testPackaging1Id,
            bottleSize: '1L',
            flavor: 'Fresa Sync Test',
            quantity: 3, // incrementado de 2 a 3
            unitPrice: 12000,
          },
          {
            packagingId: testPackaging2Id,
            bottleSize: '1L',
            flavor: 'Mora Sync Test',
            quantity: 1,
            unitPrice: 12000,
          },
        ],
        notes: 'Cantidad de fresa editada',
      });

    expect(res.status).toBe(200);
    const fresaItem = res.body.items.find((it: any) => it.flavor === 'Fresa Sync Test');
    expect(fresaItem.quantity).toBe(3);
    expect(fresaItem.packagingId).toBe(testPackaging1Id);
  });

  it('GET /api/batches/:id/summary debe consolidar y listar el pedido en linkedOrders aunque order.batchId sea null (RF-4)', async () => {
    const res = await request(app)
      .get(`/api/batches/${testBatch1Id}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.linkedOrders).toBeDefined();
    const foundOrder = res.body.linkedOrders.find((o: any) => o.id === testOrderId);
    expect(foundOrder).toBeDefined();
    expect(foundOrder.orderNumber).toBeDefined();

    // El volumen vendido debe reflejar los 3 litros de fresa
    expect(res.body.volumeBalance.totalSold).toBeGreaterThanOrEqual(3);
  });
});
