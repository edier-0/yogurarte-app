import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Spec 007 — Métricas de Fase B, Multi-Presentación y Despachos en Dashboard', () => {
  const adminToken = getAdminAuthToken();

  let testBatchFermentingId: number | null = null;
  let testBatchPhaseBId: number | null = null;
  let testPackagingId: number | null = null;
  let testCustomer: any = null;
  let testDeliveredOrderId: number | null = null;
  let testDischargeId: number | null = null;
  let testStaffMemberId: number | null = null;

  beforeAll(async () => {
    // 1. Crear un lote madre en fermentación (Fase A) que NO debe contar como stock vendible
    const fermentingBatch = await prisma.productionBatch.create({
      data: {
        batchCode: `TEST-FERM-${Date.now()}`,
        milkUsedLiters: 100,
        totalLitersProduced: 96,
        yieldPercentage: 96,
        flavor: 'Natural',
        status: 'EN_FERMENTACION',
        preparationDate: new Date(),
      },
    });
    testBatchFermentingId = fermentingBatch.id;

    // 2. Crear un lote madre completado con fraccionamiento en Fase B (20L envasados: 10x 1L y 20x 500ml)
    const completedBatch = await prisma.productionBatch.create({
      data: {
        batchCode: `TEST-FASEB-${Date.now()}`,
        milkUsedLiters: 25,
        totalLitersProduced: 24,
        yieldPercentage: 96,
        flavor: 'Mora Test',
        status: 'COMPLETADO',
        packagedLiters: 20,
        preparationDate: new Date(),
      },
    });
    testBatchPhaseBId = completedBatch.id;

    const packaging = await prisma.batchPackaging.create({
      data: {
        batchId: completedBatch.id,
        packagingCode: `PKG-MORA-${Date.now()}`,
        flavor: 'Mora Test',
        bottles1L: 10,
        bottles2L: 0,
        totalLiters: 20,
        baseLitersUsed: 20,
        containers: [
          { containerName: '1L', capacityLiters: 1.0, quantity: 10, price: 12000 },
          { containerName: '500ml', capacityLiters: 0.5, quantity: 20, price: 8000 },
        ],
        packagedAt: new Date(),
      },
    });
    testPackagingId = packaging.id;

    // 3. Crear cliente de prueba
    testCustomer = await prisma.customer.create({
      data: {
        fullName: 'Cliente Test Spec 007',
        phone: `300${Date.now().toString().slice(-7)}`,
        address: 'Fonseca, La Guajira',
      },
    });

    // 4. Crear pedido entregado con presentaciones mixtas (2x 500ml y 1x 1L = 2.0 L, 3 envases)
    const deliveredOrder = await prisma.order.create({
      data: {
        orderNumber: `PED-007-${Date.now().toString().slice(-4)}`,
        customerId: testCustomer.id,
        batchId: completedBatch.id,
        flavor: 'Mora Test',
        totalLiters: 2.0,
        quantityBottles: 3,
        bottleSize: 'MIXTO',
        totalAmount: 28000,
        paidAmount: 28000,
        pendingAmount: 0,
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        paymentMethod: 'EFECTIVO',
        orderDate: new Date(),
        deliveryDate: new Date(),
        items: {
          create: [
            {
              packagingId: packaging.id,
              batchId: completedBatch.id,
              bottleSize: '500ml',
              flavor: 'Mora Test',
              quantity: 2,
              litersPerUnit: 0.5,
              totalLiters: 1.0,
              unitPrice: 8000,
              totalPrice: 16000,
            },
            {
              packagingId: packaging.id,
              batchId: completedBatch.id,
              bottleSize: '1L',
              flavor: 'Mora Test',
              quantity: 1,
              litersPerUnit: 1.0,
              totalLiters: 1.0,
              unitPrice: 12000,
              totalPrice: 12000,
            },
          ],
        },
      },
    });
    testDeliveredOrderId = deliveredOrder.id;

    // 5. Crear socio y descargo de socio en presentación de cuchareable 80ml (4x 80ml = 0.32 L)
    const staff = await prisma.staffMember.create({
      data: {
        fullName: 'Socio Test Spec 007',
        phone: '3009998877',
        role: 'Socio Fundador',
        type: 'SOCIO',
      },
    });
    testStaffMemberId = staff.id;

    const discharge = await prisma.batchDischarge.create({
      data: {
        batchId: completedBatch.id,
        packagingId: packaging.id,
        bottleSize: '80ml',
        quantityBottles: 4,
        totalLiters: 0.32,
        unitPrice: 2500,
        totalAmount: 10000,
        reasonType: 'CONSUMO_SOCIO',
        staffMemberId: staff.id,
        registeredBy: 'Edier',
        dischargeDate: new Date(),
      },
    });
    testDischargeId = discharge.id;
  });

  afterAll(async () => {
    // Limpieza de datos de prueba
    if (testDischargeId) await prisma.batchDischarge.delete({ where: { id: testDischargeId } }).catch(() => {});
    if (testStaffMemberId) await prisma.staffMember.delete({ where: { id: testStaffMemberId } }).catch(() => {});
    if (testDeliveredOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testDeliveredOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: testDeliveredOrderId } }).catch(() => {});
    }
    if (testPackagingId) await prisma.batchPackaging.delete({ where: { id: testPackagingId } }).catch(() => {});
    if (testBatchPhaseBId) await prisma.productionBatch.delete({ where: { id: testBatchPhaseBId } }).catch(() => {});
    if (testBatchFermentingId) await prisma.productionBatch.delete({ where: { id: testBatchFermentingId } }).catch(() => {});
    if (testCustomer?.id) await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
  });

  it('GET /api/dashboard/summary debe calcular métricas de Fase B, multi-presentación (500ml/80ml) y desgloses (RF-1 a RF-12)', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const kpis = res.body.kpis;
    expect(kpis).toBeDefined();

    // 1. Fase B disponibilidad y stock libre (RF-1, RF-2, RF-3)
    expect(kpis.availableLiters).toBeDefined();
    expect(typeof kpis.availableLiters).toBe('number');
    expect(kpis.availableLiters).toBeGreaterThan(0);

    expect(kpis.availableBatchesCount).toBeDefined();
    expect(typeof kpis.availableBatchesCount).toBe('number');
    expect(kpis.availableBatchesCount).toBeGreaterThan(0);

    expect(Array.isArray(kpis.availableStockPresentations)).toBe(true);
    const stockPres = kpis.availableStockPresentations;
    const has1L = stockPres.some((p: any) => p.name === '1L' || p.containerName === '1L');
    const has500ml = stockPres.some((p: any) => p.name === '500ml' || p.containerName === '500ml');
    expect(has1L).toBe(true);
    expect(has500ml).toBe(true);

    // 2. Entregas a clientes y unidades vendidas (RF-7, RF-10)
    const dispatch = res.body.dispatchSummary;
    expect(dispatch).toBeDefined();
    expect(dispatch.clientDeliveries).toBeDefined();

    expect(dispatch.clientDeliveries.totalUnits).toBeDefined();
    expect(typeof dispatch.clientDeliveries.totalUnits).toBe('number');
    expect(dispatch.clientDeliveries.totalUnits).toBeGreaterThanOrEqual(3);

    expect(Array.isArray(dispatch.clientDeliveries.presentationsBreakdown)).toBe(true);
    const chips = dispatch.clientDeliveries.presentationsBreakdown;
    const chip500 = chips.find((c: any) => c.name === '500ml');
    expect(chip500).toBeDefined();
    expect(chip500.quantity).toBeGreaterThanOrEqual(2);

    expect(kpis.totalUnitsSold).toBeDefined();
    expect(kpis.totalUnitsSold).toBeGreaterThanOrEqual(3);

    // 3. Consumo de socios con cuchareable 80ml (RF-8)
    const partner = dispatch.partnerConsumptions;
    expect(partner).toBeDefined();
    expect(partner.totalUnits).toBeDefined();
    expect(partner.totalUnits).toBeGreaterThanOrEqual(4);

    expect(Array.isArray(partner.presentationsBreakdown)).toBe(true);
    const chip80 = partner.presentationsBreakdown.find((c: any) => c.name === '80ml');
    expect(chip80).toBeDefined();
    expect(chip80.quantity).toBeGreaterThanOrEqual(4);
    expect(chip80.totalLiters).toBeCloseTo(0.32, 2);

    // 4. Detalle en recentOrders (RF-12)
    const recent = res.body.recentOrders;
    expect(Array.isArray(recent)).toBe(true);
    const ourOrder = recent.find((o: any) => o.id === testDeliveredOrderId);
    expect(ourOrder).toBeDefined();
    expect(ourOrder.itemsSummary).toBeDefined();
    expect(ourOrder.itemsSummary).toContain('500ml');
    expect(ourOrder.itemsSummary).toContain('1L');
  }, 45000);
});
