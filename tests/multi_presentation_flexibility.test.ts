import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/prisma.js';
import { getAdminAuthToken } from './setup.js';
import {
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
  redeemLoyaltySchema,
} from '../src/modules/crm/crm.schema.js';

describe('Spec 013 — Flexibilidad Integral Multi-Presentación (T1: Esquemas Prisma y Zod)', () => {
  const adminToken = getAdminAuthToken();
  let testCustomerId: number;

  beforeAll(async () => {
    const cust = await prisma.customer.create({
      data: {
        fullName: 'Cliente T1 Multi-Presentación ' + Date.now(),
        phone: `315${Date.now().toString().slice(-7)}`,
        address: 'Fonseca, Calle Central',
      },
    });
    testCustomerId = cust.id;
  });

  afterAll(async () => {
    if (testCustomerId) {
      await prisma.recurringSchedule.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
  });

  describe('1. Validación Zod de Presentaciones Dinámicas en CRM (RF-11)', () => {
    it('createRecurringScheduleSchema debe aceptar presentaciones distintas a 1L y 2L (ej. 500ml, 80ml, Vaso)', () => {
      const validPayload = {
        customerId: testCustomerId,
        frequencyDays: 15,
        preferredFlavor: 'Fresa',
        bottleSize: '500ml',
        quantity: 3,
        nextDate: '2026-11-20',
      };

      const result = createRecurringScheduleSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.bottleSize).toBe('500ml');
      }
    });

    it('createRecurringScheduleSchema debe aceptar canastas multi-ítem configuradas en items', () => {
      const multiItemPayload = {
        customerId: testCustomerId,
        frequencyDays: 7,
        nextDate: '2026-11-25',
        items: [
          { flavor: 'Fresa', bottleSize: '500ml', quantity: 2 },
          { flavor: 'Melocotón', bottleSize: '1L', quantity: 1 },
          { flavor: 'Arequipe', bottleSize: '80ml', quantity: 4 },
        ],
      };

      const result = createRecurringScheduleSchema.safeParse(multiItemPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(3);
        expect(result.data.items?.[0].bottleSize).toBe('500ml');
      }
    });

    it('updateRecurringScheduleSchema debe permitir actualizar con presentaciones dinámicas y canasta mixta', () => {
      const updatePayload = {
        bottleSize: '250ml',
        items: [
          { flavor: 'Mora', bottleSize: '250ml', quantity: 6 },
        ],
      };

      const result = updateRecurringScheduleSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
    });

    it('redeemLoyaltySchema debe aceptar desglose de ítems con packagingId individual', () => {
      const redeemPayload = {
        customerId: testCustomerId,
        items: [
          { packagingId: 101, bottleSize: '500ml', quantity: 1, flavor: 'Fresa' },
          { packagingId: 102, bottleSize: '500ml', quantity: 1, flavor: 'Melocotón' },
        ],
      };

      const result = redeemLoyaltySchema.safeParse(redeemPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(2);
        expect(result.data.items?.[0].packagingId).toBe(101);
      }
    });
  });

  describe('2. Endpoint POST /api/crm/recurring con presentaciones dinámicas y canasta multi-ítem', () => {
    it('Debe crear una suscripción recurrente con presentación 500ml exitosamente (no rechazada con 400)', async () => {
      const res = await request(app)
        .post('/api/crm/recurring')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          frequencyDays: 15,
          preferredFlavor: 'Melocotón',
          bottleSize: '500ml',
          quantity: 4,
          nextDate: new Date().toISOString().split('T')[0],
          notes: 'Test suscripción 500ml',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.bottleSize).toBe('500ml');

      // Limpieza
      await prisma.recurringSchedule.delete({ where: { id: res.body.id } });
    });

    it('Debe crear una suscripción recurrente con canasta multi-ítem persistida en items Json', async () => {
      const res = await request(app)
        .post('/api/crm/recurring')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          frequencyDays: 14,
          nextDate: new Date().toISOString().split('T')[0],
          items: [
            { flavor: 'Fresa', bottleSize: '500ml', quantity: 2 },
            { flavor: 'Mora', bottleSize: '1L', quantity: 1 },
          ],
          notes: 'Canasta mixta familiar',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(2);

      // Limpieza
      await prisma.recurringSchedule.delete({ where: { id: res.body.id } });
    });
  });
  describe('3. Validación Estricta de Lotes y Control de Stock en Pedidos (RF-4, RF-5, RF-7, T2)', () => {
    let testBatchId: number;
    let testPackagingId: number;
    let createdOrderId: number | null = null;

    beforeAll(async () => {
      const batch = await prisma.productionBatch.create({
        data: {
          batchCode: 'TEST-BATCH-T2-' + Date.now(),
          milkUsedLiters: 10,
          totalLitersProduced: 10,
          yieldPercentage: 100,
          flavor: 'Fresa',
        },
      });
      testBatchId = batch.id;

      // Fracción mono-presentación de 1L con 4 botellas
      const pkg = await prisma.batchPackaging.create({
        data: {
          batchId: batch.id,
          packagingCode: 'LOTE-T2-1L-' + Date.now(),
          flavor: 'Fresa',
          bottles1L: 4,
          bottles2L: 0,
          totalLiters: 4,
          containers: [
            { containerName: '1L', capacityLiters: 1.0, quantity: 4, price: 12000 },
          ],
        },
      });
      testPackagingId = pkg.id;
    });

    afterAll(async () => {
      if (createdOrderId) {
        await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
        await prisma.order.deleteMany({ where: { id: createdOrderId } });
      }
      if (testPackagingId) {
        await prisma.orderItem.deleteMany({ where: { packagingId: testPackagingId } });
        await prisma.batchPackaging.deleteMany({ where: { id: testPackagingId } });
      }
      if (testBatchId) {
        await prisma.productionBatch.deleteMany({ where: { id: testBatchId } });
      }
    });

    it('POST /api/orders debe rechazar con HTTP 400 si el ítem (500ml) intenta asignarse a un lote de presentación diferente (1L)', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          deliveryAddress: 'Calle 10 # 5-20',
          items: [
            {
              packagingId: testPackagingId,
              flavor: 'Fresa',
              bottleSize: '500ml',
              quantity: 1,
              unitPrice: 8000,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/presentaci[oó]n/i);
    });

    it('POST /api/orders debe rechazar con HTTP 400 si la cantidad solicitada supera las unidades libres del lote', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          deliveryAddress: 'Calle 10 # 5-20',
          items: [
            {
              packagingId: testPackagingId,
              flavor: 'Fresa',
              bottleSize: '1L',
              quantity: 10, // Solo hay 4 unidades
              unitPrice: 12000,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/capacidad|excedid[ao]|insuficiente/i);
    });

    it('PUT /api/orders/:id debe rechazar si el incremento neto supera el stock libre remanente, y aceptar si está dentro del saldo', async () => {
      // 1. Crear comanda con 2 unidades (quedan 2 libres)
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          deliveryAddress: 'Calle 10 # 5-20',
          items: [
            {
              packagingId: testPackagingId,
              flavor: 'Fresa',
              bottleSize: '1L',
              quantity: 2,
              unitPrice: 12000,
            },
          ],
        });

      expect(createRes.status).toBe(201);
      createdOrderId = createRes.body.id;

      // 2. Incrementar a 5 unidades (incremento neto Delta = +3 > 2 libres): debe rechazar con 400
      const rejectRes = await request(app)
        .put(`/api/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              packagingId: testPackagingId,
              flavor: 'Fresa',
              bottleSize: '1L',
              quantity: 5,
              unitPrice: 12000,
            },
          ],
        });

      expect(rejectRes.status).toBe(400);
      expect(rejectRes.body.error).toMatch(/capacidad|excedid[ao]|insuficiente/i);

      // 3. Incrementar a 3 unidades (incremento neto Delta = +1 <= 2 libres): debe aceptar con 200
      const acceptRes = await request(app)
        .put(`/api/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              packagingId: testPackagingId,
              flavor: 'Fresa',
              bottleSize: '1L',
              quantity: 3,
              unitPrice: 12000,
            },
          ],
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.quantityBottles).toBe(3);
    });
  });
  describe('4. Suscripciones Recurrentes Mixtas y Cotización Dinámica (RF-9, RF-10, RF-12, RF-13, T3)', () => {
    let recurringScheduleId: number | null = null;
    let generatedOrderId: number | null = null;
    let inactiveFlavorId: number | null = null;

    afterEach(async () => {
      if (generatedOrderId) {
        await prisma.orderItem.deleteMany({ where: { orderId: generatedOrderId } });
        await prisma.order.deleteMany({ where: { id: generatedOrderId } });
        generatedOrderId = null;
      }
      if (recurringScheduleId) {
        await prisma.recurringSchedule.deleteMany({ where: { id: recurringScheduleId } });
        recurringScheduleId = null;
      }
      if (inactiveFlavorId) {
        await prisma.productFlavor.deleteMany({ where: { id: inactiveFlavorId } });
        inactiveFlavorId = null;
      }
    });

    it('POST /api/crm/recurring/:id/create-order debe generar comanda multi-ítem con precios y volúmenes oficiales vigentes', async () => {
      // 1. Crear suscripción recurrente con 2x 1L Fresa ($12.000 c/u) y 2x 500ml Mora ($8.000 c/u)
      const scheduleRes = await request(app)
        .post('/api/crm/recurring')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          frequencyDays: 15,
          nextDate: new Date().toISOString().split('T')[0],
          items: [
            { flavor: 'Fresa', bottleSize: '1L', quantity: 2 },
            { flavor: 'Mora', bottleSize: '500ml', quantity: 2 },
          ],
          notes: 'Canasta familiar quincenal',
        });

      expect(scheduleRes.status).toBe(201);
      recurringScheduleId = scheduleRes.body.id;

      // 2. Generar comanda comercial oficial desde la suscripción
      const triggerRes = await request(app)
        .post(`/api/crm/recurring/${recurringScheduleId}/create-order`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(triggerRes.status);
      expect(triggerRes.body.success).toBe(true);
      const order = triggerRes.body.order;
      generatedOrderId = order.id;

      // 3. Validar totales y desglose
      expect(order.items).toHaveLength(2);
      expect(order.bottleSize).toBe('MIXTO');
      expect(order.quantityBottles).toBe(4);
      expect(order.totalLiters).toBe(3.0); // 2x 1L (2L) + 2x 0.5L (1L) = 3L
      expect(order.totalAmount).toBe(40000); // 2x 12.000 (24.000) + 2x 8.000 (16.000) = 40.000
      expect(order.deliveryStatus).toBe('PENDING');
      expect(order.paymentStatus).toBe('PENDING');

      // Verificar que los ítems están en pre-venta (sin lote asignado para alistamiento)
      expect(order.items[0].packagingId).toBeNull();
      expect(order.items[1].packagingId).toBeNull();
    });

    it('POST /api/crm/recurring/:id/create-order debe detener la generación con HTTP 400 si un producto está descontinuado en catálogo', async () => {
      // 1. Crear un sabor inactivo
      const inactiveFlavor = await prisma.productFlavor.upsert({
        where: { name: 'SaborDescontinuadoTest' },
        update: { isActive: false },
        create: { name: 'SaborDescontinuadoTest', isActive: false },
      });
      inactiveFlavorId = inactiveFlavor.id;

      // 2. Crear suscripción recurrente con el sabor inactivo
      const scheduleRes = await request(app)
        .post('/api/crm/recurring')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          frequencyDays: 7,
          nextDate: new Date().toISOString().split('T')[0],
          items: [
            { flavor: 'SaborDescontinuadoTest', bottleSize: '1L', quantity: 1 },
          ],
        });

      expect(scheduleRes.status).toBe(201);
      recurringScheduleId = scheduleRes.body.id;

      // 3. Intentar generar comanda comercial: debe fallar con 400
      const triggerRes = await request(app)
        .post(`/api/crm/recurring/${recurringScheduleId}/create-order`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(triggerRes.status).toBe(400);
      expect(triggerRes.body.error).toMatch(/descontinuado|inactiv[oa]/i);
    });
  });
  describe('5. Canje Transaccional de Fidelización 10+1 y Control de Cartera (RF-14 a RF-19, T4)', () => {
    let loyaltyCustomerId: number;
    let loyaltyOrderId: number;
    let debtOrderId: number;
    let pkgFresa500: any;
    let pkgMeloc500: any;
    let testBatch: any;

    beforeAll(async () => {
      // 1. Crear cliente para fidelización
      const cust = await prisma.customer.create({
        data: {
          fullName: 'Cliente Fidelizacion T4 ' + Date.now(),
          phone: `316${Date.now().toString().slice(-7)}`,
          address: 'Barrio El Carmen',
        },
      });
      loyaltyCustomerId = cust.id;

      // 2. Crear pedido entregado y pagado de 10L (10 botellas de 1L)
      const paidOrder = await prisma.order.create({
        data: {
          orderNumber: 'PED-LOYALTY-PAID-' + Date.now(),
          customerId: loyaltyCustomerId,
          bottleSize: '1L',
          flavor: 'Fresa',
          quantityBottles: 10,
          totalLiters: 10.0,
          unitPrice: 12000,
          totalAmount: 120000,
          paidAmount: 120000,
          pendingAmount: 0,
          paymentStatus: 'PAID',
          deliveryStatus: 'DELIVERED',
        },
      });
      loyaltyOrderId = paidOrder.id;

      // 3. Crear pedido entregado con deuda pendiente ($20.000)
      const debtOrder = await prisma.order.create({
        data: {
          orderNumber: 'PED-LOYALTY-DEBT-' + Date.now(),
          customerId: loyaltyCustomerId,
          bottleSize: '1L',
          flavor: 'Mora',
          quantityBottles: 2,
          totalLiters: 2.0,
          unitPrice: 12000,
          totalAmount: 24000,
          paidAmount: 4000,
          pendingAmount: 20000,
          paymentStatus: 'PARTIAL',
          deliveryStatus: 'DELIVERED',
        },
      });
      debtOrderId = debtOrder.id;

      // 4. Crear lote y fracciones de 500ml para canje
      testBatch = await prisma.productionBatch.create({
        data: {
          batchCode: 'LOTE-LOYALTY-BATCH-' + Date.now(),
          flavor: 'MIXTO',
          milkUsedLiters: 20,
          totalLitersProduced: 20,
          yieldPercentage: 100,
          status: 'COMPLETADO',
        },
      });

      // Fracción Fresa 500ml con 2 unidades
      pkgFresa500 = await prisma.batchPackaging.create({
        data: {
          batchId: testBatch.id,
          packagingCode: 'PKG-FRESA-500-' + Date.now(),
          flavor: 'Fresa',
          totalLiters: 1.0,
          containers: [
            { containerName: '500ml', capacityLiters: 0.5, quantity: 2, price: 8000 },
          ],
        },
      });

      // Fracción Melocotón 500ml con 0 unidades (agotado)
      pkgMeloc500 = await prisma.batchPackaging.create({
        data: {
          batchId: testBatch.id,
          packagingCode: 'PKG-MELOC-500-' + Date.now(),
          flavor: 'Melocotón',
          totalLiters: 0,
          containers: [
            { containerName: '500ml', capacityLiters: 0.5, quantity: 0, price: 8000 },
          ],
        },
      });
    });

    afterAll(async () => {
      if (loyaltyCustomerId) {
        await prisma.batchDischarge.deleteMany({ where: { packagingId: { in: [pkgFresa500.id, pkgMeloc500.id] } } });
        await prisma.orderPayment.deleteMany({ where: { order: { customerId: loyaltyCustomerId } } });
        await prisma.orderItem.deleteMany({ where: { order: { customerId: loyaltyCustomerId } } });
        await prisma.order.deleteMany({ where: { customerId: loyaltyCustomerId } });
        await prisma.customer.deleteMany({ where: { id: loyaltyCustomerId } });
      }
      if (testBatch) {
        await prisma.batchPackaging.deleteMany({ where: { batchId: testBatch.id } });
        await prisma.productionBatch.deleteMany({ where: { id: testBatch.id } });
      }
    });

    it('POST /api/crm/loyalty/redeem debe rechazar con HTTP 400 si el cliente tiene cartera pendiente de pago (RF-15)', async () => {
      const res = await request(app)
        .post('/api/crm/loyalty/redeem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: loyaltyCustomerId,
          items: [
            { packagingId: pkgFresa500.id, bottleSize: '500ml', quantity: 2, flavor: 'Fresa' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cartera|saldo pendiente|paz y salvo/i);
    });

    it('POST /api/crm/loyalty/redeem debe abortar atómicamente si una fracción de 500ml carece de stock suficiente (CL-3)', async () => {
      // Saldar la deuda del pedido para dejarlo a paz y salvo
      await prisma.order.update({
        where: { id: debtOrderId },
        data: { paidAmount: 24000, pendingAmount: 0, paymentStatus: 'PAID' },
      });

      // Intentar canje mixto: 1 Fresa (hay 2) y 1 Melocotón (hay 0)
      const res = await request(app)
        .post('/api/crm/loyalty/redeem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: loyaltyCustomerId,
          items: [
            { packagingId: pkgFresa500.id, bottleSize: '500ml', quantity: 1, flavor: 'Fresa' },
            { packagingId: pkgMeloc500.id, bottleSize: '500ml', quantity: 1, flavor: 'Melocotón' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/insuficiente/i);

      // Verificar que NO se descargó la unidad de Fresa (atomicidad)
      const discharges = await prisma.batchDischarge.findMany({
        where: { packagingId: pkgFresa500.id },
      });
      expect(discharges).toHaveLength(0);
    });

    it('POST /api/crm/loyalty/redeem debe canjear exitosamente 2x 500ml multi-sabor a $0 COP cuando hay stock y está a paz y salvo (RF-17, RF-19)', async () => {
      // Darle stock a la fracción de Melocotón (1 unidad)
      await prisma.batchPackaging.update({
        where: { id: pkgMeloc500.id },
        data: {
          totalLiters: 0.5,
          containers: [
            { containerName: '500ml', capacityLiters: 0.5, quantity: 1, price: 8000 },
          ],
        },
      });

      const res = await request(app)
        .post('/api/crm/loyalty/redeem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: loyaltyCustomerId,
          items: [
            { packagingId: pkgFresa500.id, bottleSize: '500ml', quantity: 1, flavor: 'Fresa' },
            { packagingId: pkgMeloc500.id, bottleSize: '500ml', quantity: 1, flavor: 'Melocotón' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.loyaltyRedeemedCount).toBe(1);

      // Verificar que se registraron los descargos a $0 COP
      const dischargesFresa = await prisma.batchDischarge.findMany({
        where: { packagingId: pkgFresa500.id, reasonType: 'PREMIO_FIDELIZACION' },
      });
      expect(dischargesFresa).toHaveLength(1);
      expect(dischargesFresa[0].unitPrice).toBe(0);
      expect(dischargesFresa[0].totalAmount).toBe(0);

      const dischargesMeloc = await prisma.batchDischarge.findMany({
        where: { packagingId: pkgMeloc500.id, reasonType: 'PREMIO_FIDELIZACION' },
      });
      expect(dischargesMeloc).toHaveLength(1);
      expect(dischargesMeloc[0].unitPrice).toBe(0);
      expect(dischargesMeloc[0].totalAmount).toBe(0);
    });
  });
  describe('6. Vinculación Masiva Filtrada por Presentación y Sabor (RF-11, RF-12, RF-13, T5)', () => {
    let t5CustomerId: number;
    let t5OrderId: number;
    let item1LId: number;
    let item500Id: number;
    let t5Batch: any;
    let pkgFresa1LOnly: any;

    beforeAll(async () => {
      const cust = await prisma.customer.create({
        data: {
          fullName: 'Cliente Vinculacion T5 ' + Date.now(),
          phone: `317${Date.now().toString().slice(-7)}`,
          address: 'Barrio Centro',
        },
      });
      t5CustomerId = cust.id;

      // Crear pedido en preventa con 2 items: 1x 1L Fresa y 2x 500ml Fresa
      const order = await prisma.order.create({
        data: {
          orderNumber: 'PED-T5-' + Date.now(),
          customerId: t5CustomerId,
          bottleSize: 'MIXTO',
          flavor: 'Fresa',
          quantityBottles: 3,
          totalLiters: 2.0,
          unitPrice: 0,
          totalAmount: 28000,
          paidAmount: 0,
          pendingAmount: 28000,
          paymentStatus: 'PENDING',
          deliveryStatus: 'PREPARING',
          items: {
            create: [
              {
                flavor: 'Fresa',
                bottleSize: '1L',
                quantity: 1,
                unitPrice: 12000,
                totalLiters: 1.0,
                totalPrice: 12000,
                packagingId: null,
                batchId: null,
              },
              {
                flavor: 'Fresa',
                bottleSize: '500ml',
                quantity: 2,
                unitPrice: 8000,
                totalLiters: 1.0,
                totalPrice: 16000,
                packagingId: null,
                batchId: null,
              },
            ],
          },
        },
        include: { items: true },
      });
      t5OrderId = order.id;
      item1LId = order.items.find((i) => i.bottleSize === '1L')!.id;
      item500Id = order.items.find((i) => i.bottleSize === '500ml')!.id;

      // Crear lote madre y fracción exclusiva de 1L Fresa con containers explícitos
      t5Batch = await prisma.productionBatch.create({
        data: {
          batchCode: 'LOTE-T5-' + Date.now(),
          flavor: 'Fresa',
          milkUsedLiters: 20,
          totalLitersProduced: 20,
          yieldPercentage: 100,
          status: 'COMPLETADO',
        },
      });

      pkgFresa1LOnly = await prisma.batchPackaging.create({
        data: {
          batchId: t5Batch.id,
          packagingCode: 'PKG-FRESA-1L-ONLY-' + Date.now(),
          flavor: 'Fresa',
          totalLiters: 5.0,
          containers: [
            { containerName: '1L', capacityLiters: 1.0, quantity: 5, price: 12000 },
          ],
        },
      });
    });

    afterAll(async () => {
      if (t5CustomerId) {
        await prisma.orderItem.deleteMany({ where: { order: { customerId: t5CustomerId } } });
        await prisma.order.deleteMany({ where: { customerId: t5CustomerId } });
        await prisma.customer.deleteMany({ where: { id: t5CustomerId } });
      }
      if (t5Batch) {
        await prisma.batchPackaging.deleteMany({ where: { batchId: t5Batch.id } });
        await prisma.productionBatch.deleteMany({ where: { id: t5Batch.id } });
      }
    });

    it('linkOrdersToPackaging debe vincular solo los items cuya presentación coincida con la fracción (1L) y dejar los de 500ml sin vincular', async () => {
      const { linkOrdersToPackaging } = await import('../src/modules/batches/batches.service.js');

      const result = await linkOrdersToPackaging(pkgFresa1LOnly.id, {
        orderIds: [t5OrderId],
      });

      expect(result.linkedCount).toBeGreaterThanOrEqual(1);

      // Verificar item de 1L: DEBE estar vinculado a pkgFresa1LOnly
      const updatedItem1L = await prisma.orderItem.findUnique({ where: { id: item1LId } });
      expect(updatedItem1L?.packagingId).toBe(pkgFresa1LOnly.id);

      // Verificar item de 500ml: DEBE PERMANECER SIN VINCULAR (null)
      const updatedItem500 = await prisma.orderItem.findUnique({ where: { id: item500Id } });
      expect(updatedItem500?.packagingId).toBeNull();
    });
  });
});
