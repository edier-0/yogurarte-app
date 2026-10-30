import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken } from './setup.js';

describe('Spec 010 — Fidelización 10+1 y Auditoría Dinámica de Fase B', () => {
  const adminToken = getAdminAuthToken();
  const cleanupIds: {
    customerIds: number[];
    orderIds: number[];
    batchIds: number[];
    packagingIds: number[];
  } = {
    customerIds: [],
    orderIds: [],
    batchIds: [],
    packagingIds: [],
  };

  afterAll(async () => {
    if (cleanupIds.packagingIds.length > 0) {
      await prisma.batchDischarge.deleteMany({
        where: { packagingId: { in: cleanupIds.packagingIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { packagingId: { in: cleanupIds.packagingIds } },
      });
      await prisma.batchPackaging.deleteMany({
        where: { id: { in: cleanupIds.packagingIds } },
      });
    }
    if (cleanupIds.orderIds.length > 0) {
      await prisma.orderPayment.deleteMany({
        where: { orderId: { in: cleanupIds.orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: cleanupIds.orderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: cleanupIds.orderIds } },
      });
    }
    if (cleanupIds.batchIds.length > 0) {
      await prisma.productionBatch.deleteMany({
        where: { id: { in: cleanupIds.batchIds } },
      });
    }
    if (cleanupIds.customerIds.length > 0) {
      await prisma.customer.deleteMany({
        where: { id: { in: cleanupIds.customerIds } },
      });
    }
  });

  it('RF-1 & RF-2: GET /api/crm/loyalty?customerId=:id retorna de forma instantánea el saldo de fidelización de un cliente específico', async () => {
    // 1. Crear cliente con pedidos entregados que sumen 10 litros exactos
    const customer = await prisma.customer.create({
      data: {
        fullName: `Cliente Fidelización Test ${Date.now()}`,
        phone: `300${Date.now().toString().slice(-7)}`,
        address: 'Calle 10 # 5-20, Fonseca',
      },
    });
    cleanupIds.customerIds.push(customer.id);

    const order = await prisma.order.create({
      data: {
        orderNumber: `PED-TEST-${Date.now()}`,
        customerId: customer.id,
        orderDate: new Date(),
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        totalLiters: 10.0,
        quantityBottles: 10,
        totalAmount: 120000,
        paidAmount: 120000,
        pendingAmount: 0,
      },
    });
    cleanupIds.orderIds.push(order.id);

    // 2. Consultar fidelización filtrada por customerId
    const res = await request(app)
      .get(`/api/crm/loyalty?customerId=${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('customers');
    expect(res.body.customers.length).toBe(1);

    const custData = res.body.customers[0];
    expect(custData.id).toBe(customer.id);
    expect(custData.totalBottles).toBe(10);
    expect(custData.rewardsAvailable).toBe(1);
    expect(custData.hasAvailableReward).toBe(true);
    expect(custData.currentCycleBottles).toBe(0);
  });

  it('Restricción Innegociable: Canje de fidelización no puede exceder 1.0 Litro y se descuenta a $0 COP', async () => {
    const customer = await prisma.customer.create({
      data: {
        fullName: `Cliente Canje 1L Max ${Date.now()}`,
        phone: `301${Date.now().toString().slice(-7)}`,
        address: 'Calle Principal # 1-2, Fonseca',
      },
    });
    cleanupIds.customerIds.push(customer.id);

    const order = await prisma.order.create({
      data: {
        orderNumber: `PED-TEST-2-${Date.now()}`,
        customerId: customer.id,
        deliveryStatus: 'DELIVERED',
        paymentStatus: 'PAID',
        totalLiters: 10.0,
        quantityBottles: 10,
        totalAmount: 120000,
        paidAmount: 120000,
        pendingAmount: 0,
      },
    });
    cleanupIds.orderIds.push(order.id);

    // Lote y Fracción envasada de prueba con presentaciones dinámicas (1L y 500ml)
    const batch = await prisma.productionBatch.create({
      data: {
        batchCode: `L-FIDEL-${Date.now().toString().slice(-4)}`,
        milkUsedLiters: 20,
        totalLitersProduced: 20,
        yieldPercentage: 100,
        flavor: 'Mora',
        status: 'DISPONIBLE',
      },
    });
    cleanupIds.batchIds.push(batch.id);

    const packaging = await prisma.batchPackaging.create({
      data: {
        batchId: batch.id,
        flavor: 'Mora',
        containers: [
          { containerName: 'Botella 1L', capacityLiters: 1.0, quantity: 10, price: 12000 },
          { containerName: 'Botella 500ml', capacityLiters: 0.5, quantity: 10, price: 7000 },
        ],
        totalLiters: 15.0,
      },
    });
    cleanupIds.packagingIds.push(packaging.id);

    // 1. Intentar canjear 2L (2 botellas de 1L) -> DEBE RECHAZARSE (400 Bad Request)
    const rejectRes = await request(app)
      .post('/api/crm/loyalty/redeem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        packagingId: packaging.id,
        items: [{ bottleSize: '1L', quantity: 2 }],
      });

    expect(rejectRes.status).toBe(400);
    expect(rejectRes.body.error).toMatch(/permite hasta 1\.0 Litro/i);

    // 2. Canjear exactamente 1.0 Litro (1 botella de 1L) -> DEBE TENER ÉXITO
    const successRes = await request(app)
      .post('/api/crm/loyalty/redeem')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        packagingId: packaging.id,
        items: [{ bottleSize: '1L', quantity: 1 }],
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.loyaltyRedeemedCount).toBe(1);
    expect(successRes.body.redeemedLiters).toBe(1.0);

    // 3. Verificar que se creó el descargo con PREMIO_FIDELIZACION a $0 COP
    const discharge = await prisma.batchDischarge.findFirst({
      where: {
        packagingId: packaging.id,
        reasonType: 'PREMIO_FIDELIZACION',
      },
    });

    expect(discharge).toBeDefined();
    expect(discharge?.totalAmount).toBe(0);
    expect(discharge?.unitPrice).toBe(0);
    expect(discharge?.totalLiters).toBe(1.0);
    expect(discharge?.quantityBottles).toBe(1);
  });

  it('RF-4 & RF-5: Auditoría de Fracción Envasada (Fase B) refleja de forma dinámica las salidas por fidelización', async () => {
    // Buscar la fracción del test anterior que ya tiene un descargo de PREMIO_FIDELIZACION
    const packagingId = cleanupIds.packagingIds[0];
    expect(packagingId).toBeDefined();

    const res = await request(app)
      .get(`/api/batches/packagings/${packagingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.status !== 200) {
      console.error('TEST 3 ERROR:', res.status, res.body);
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('packaging');
    expect(res.body).toHaveProperty('volume');
    expect(res.body).toHaveProperty('presentations');

    // 1. Métricas de volumen segregadas en Fase B
    expect(res.body.volume.loyaltyDischargedLiters).toBe(1.0);
    expect(res.body.volume.loyaltyBottlesCount).toBe(1);
    expect(res.body.volume.dischargedLiters).toBe(1.0);
    expect(res.body.volume.freeLiters).toBe(14.0); // 15L - 1L

    // 2. Desglose dinámico en las presentaciones de la fracción
    const pres1L = res.body.presentations.find((p: any) => p.containerName === 'Botella 1L');
    expect(pres1L).toBeDefined();
    expect(pres1L.loyaltyDischarged).toBe(1);
    expect(pres1L.discharged).toBe(1);
    expect(pres1L.free).toBe(9); // 10 - 1

    const pres500 = res.body.presentations.find((p: any) => p.containerName === 'Botella 500ml');
    expect(pres500).toBeDefined();
    expect(pres500.loyaltyDischarged).toBe(0);
    expect(pres500.free).toBe(10);
  });

  it('RF-6 & RF-7: Auditoría del Lote Madre (Fase A) calcula ingresos proyectados dinámicos a partir de sus fracciones', async () => {
    const batchId = cleanupIds.batchIds[0];
    expect(batchId).toBeDefined();

    const res = await request(app)
      .get(`/api/batches/${batchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rawMaterialsBalance');
    expect(res.body).toHaveProperty('financialBalance');
    expect(res.body).toHaveProperty('packagings');

    // La fracción tiene 10x 1L ($12.000) = $120.000 y 10x 500ml ($7.000) = $70.000 -> Proyectado total = $190.000
    expect(res.body.financialBalance.totalProjectedRevenue).toBe(190000);
    // En Fase A el balance lácteo conserva los litros a granel
    expect(res.body.rawMaterialsBalance.milkUsedLiters).toBe(20);
    expect(res.body.rawMaterialsBalance.totalLitersProduced).toBe(20);
  });
});
