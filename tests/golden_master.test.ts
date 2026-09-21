import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken, getDriverAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Golden Master Characterization Suite — Comportamiento Base Inmutable', () => {
  const adminToken = getAdminAuthToken();
  const driverToken = getDriverAuthToken();

  let testOrderId: number;
  let testBatchId: number;
  let testStaffId: number;
  let testCashMovementId: number;

  beforeAll(async () => {
    // 1. Garantizar insumo de Leche con stock suficiente
    await prisma.rawMaterial.upsert({
      where: { code: 'LECHE' },
      update: { currentStock: 200, avgCost: 2500, isActive: true },
      create: {
        code: 'LECHE',
        name: 'Leche Entera Líquida',
        category: 'MATERIA_PRIMA',
        unit: 'Litros',
        currentStock: 200,
        minStockAlert: 20,
        avgCost: 2500,
        isActive: true,
      },
    });

    // 2. Garantizar botellas de 1L con stock
    await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_1L' },
      update: { currentStock: 100, avgCost: 800, isActive: true },
      create: {
        code: 'BOTELLA_1L',
        name: 'Botella 1 Litro Pet',
        category: 'EMPAQUE',
        unit: 'Unidades',
        currentStock: 100,
        minStockAlert: 10,
        avgCost: 800,
        isActive: true,
      },
    });

    // 3. Garantizar botellas de 2L con stock
    await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_2L' },
      update: { currentStock: 100, avgCost: 1400, isActive: true },
      create: {
        code: 'BOTELLA_2L',
        name: 'Botella 2 Litros Pet',
        category: 'EMPAQUE',
        unit: 'Unidades',
        currentStock: 100,
        minStockAlert: 10,
        avgCost: 1400,
        isActive: true,
      },
    });
  });

  // ============================================================================
  // 1. AUTENTICACIÓN Y SEGURIDAD DE ROLES
  // ============================================================================
  describe('1. Autenticación y Control de Roles', () => {
    it('Endpoint público /api/health debe responder 200 con estado ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('app', 'YogurArte API');
    });

    it('Rutas protegidas deben rechazar llamadas sin token con 401 AUTH_REQUIRED', async () => {
      const endpoints = ['/api/orders', '/api/batches', '/api/staff', '/api/cash-movements', '/api/dashboard/summary'];
      for (const ep of endpoints) {
        const res = await request(app).get(ep);
        expect(res.status).toBe(401);
      }
    });

    it('Rutas de administración deben rechazar usuarios con rol DOMICILIARIO con 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('code', 'FORBIDDEN_ROLE');
    });
  });

  // ============================================================================
  // 2. CREACIÓN DE PEDIDOS, CLIENTES Y PAGOS (GOLDEN MASTER)
  // ============================================================================
  describe('2. Ciclo de Pedidos y Reglas de Negocio Comerciales', () => {
    it('POST /api/orders debe registrar un pedido completo con ítems mixtos, flete y abono parcial', async () => {
      const payload = {
        customerName: 'Cliente Golden Master Vitest',
        customerPhone: '3009998877',
        customerAddress: 'Calle 10 # 5-20 Barrio Centro',
        customerNeighborhood: 'Centro',
        items: [
          { bottleSize: '1L', flavor: 'Fresa', quantity: 2, unitPrice: 12000 },
          { bottleSize: '2L', flavor: 'Melocotón', quantity: 1, unitPrice: 24000 },
        ],
        deliveryFee: 4000,
        discount: 2000,
        paidAmount: 25000,
        paymentMethod: 'TRANSFERENCIA_NEQUI',
        deliveryType: 'DOMICILIARIO',
        deliveryStatus: 'PENDING',
        notes: 'Pedido de caracterización Golden Master',
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      const order = res.body;

      // Congelar estructura del contrato JSON
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('orderNumber');
      expect(order.orderNumber).toMatch(/^PED-\d{8}-\d{3}$/);
      expect(order).toHaveProperty('customerId');
      expect(order).toHaveProperty('customer');
      expect(order.customer.fullName).toBe('Cliente Golden Master Vitest');
      expect(order.customer.phone).toBe('3009998877');

      // Congelar cálculos matemáticos de facturación
      // Subtotal ítems = (2 * 12000) + (1 * 24000) = 48000
      // Total = 48000 + 4000 (flete) - 2000 (descuento) = 50000
      expect(order.totalAmount).toBe(50000);
      expect(order.paidAmount).toBe(25000);
      expect(order.pendingAmount).toBe(25000);
      expect(order.paymentStatus).toBe('PARTIAL');
      expect(order.deliveryStatus).toBe('PENDING');

      // Congelar ítems y pagos vinculados
      expect(order.items).toHaveLength(2);
      expect(order.totalLiters).toBe(4); // 2L de 1L + 2L de 2L = 4L
      expect(order.payments).toHaveLength(1);
      expect(order.payments[0].amount).toBe(25000);

      testOrderId = order.id;
    });

    it('GET /api/orders/:id debe retornar el pedido con todas sus relaciones congeladas', async () => {
      const res = await request(app)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testOrderId);
      expect(res.body.items).toBeDefined();
      expect(res.body.payments).toBeDefined();
      expect(res.body.customer).toBeDefined();
    });

    it('POST /api/orders/:id/payments debe registrar abono y actualizar estado a PAID cuando se cubre la totalidad', async () => {
      const res = await request(app)
        .post(`/api/orders/${testOrderId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 25000,
          paymentMethod: 'EFECTIVO',
          notes: 'Abono final que liquida la deuda',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('order');
      expect(res.body.order.paidAmount).toBe(50000);
      expect(res.body.order.pendingAmount).toBe(0);
      expect(res.body.order.paymentStatus).toBe('PAID');
    });
  });

  // ============================================================================
  // 3. CÁLCULO DE LOTES Y DESCARGAS (MERMAS / CONSUMO DE SOCIO)
  // ============================================================================
  describe('3. Lotes de Producción y Descargas', () => {
    it('POST /api/batches debe permitir crear un lote de producción con rendimiento calculado', async () => {
      const res = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          flavor: 'Mora Artesanal GM',
          milkUsedLiters: 20,
          bottles1LProduced: 10,
          bottles2LProduced: 5,
          totalLitersProduced: 20,
          price1L: 13000,
          price2L: 26000,
          useSugar: false,
          usePowderedMilk: false,
          notes: 'Lote de caracterización Golden Master',
        });

      expect(res.status).toBe(201);
      const batch = res.body;
      expect(batch).toHaveProperty('id');
      expect(batch).toHaveProperty('batchCode');
      expect(batch.flavor).toBe('Mora Artesanal GM');
      expect(batch.totalLitersProduced).toBe(20);
      expect(batch.status).toBe('COMPLETADO');
      expect(batch.yieldPercentage).toBe(100); // 20L producidos / 20L leche = 100%

      testBatchId = batch.id;
    });

    it('POST /api/batches/:id/discharges debe registrar una descarga/merma y descontar litros', async () => {
      const res = await request(app)
        .post(`/api/batches/${testBatchId}/discharges`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bottleSize: '1L',
          quantityBottles: 2,
          reasonType: 'MUESTRA_DEGUSTACION',
          notes: 'Muestra comercial degustación',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('discharge');
      expect(res.body.discharge.quantityBottles).toBe(2);
      expect(res.body.discharge.totalLiters).toBe(2);
      expect(res.body.discharge.reasonType).toBe('MUESTRA_DEGUSTACION');
    });
  });

  // ============================================================================
  // 4. FINANZAS: MOVIMIENTOS DE CAJA Y PERSONAL / NÓMINA
  // ============================================================================
  describe('4. Finanzas, Caja Menor y Personal', () => {
    it('POST /api/cash-movements debe registrar una inyección de base inicial de caja', async () => {
      const res = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'BASE_INICIAL',
          amount: 60000,
          concept: 'Base inicial de caja para vuelto GM',
          paymentMethod: 'EFECTIVO',
          notes: 'Prueba Golden Master',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('BASE_INICIAL');
      expect(res.body.amount).toBe(60000);
      expect(res.body.concept).toBe('Base inicial de caja para vuelto GM');

      testCashMovementId = res.body.id;
    });

    it('GET /api/cash-movements debe calcular balance neto de caja', async () => {
      const res = await request(app)
        .get('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalInjections');
      expect(res.body).toHaveProperty('totalWithdrawals');
      expect(res.body).toHaveProperty('netCashMovement');
      expect(res.body).toHaveProperty('movements');
      expect(Array.isArray(res.body.movements)).toBe(true);
    });

    it('POST /api/staff debe registrar un colaborador y permitir liquidar un pago', async () => {
      // 1. Crear colaborador de prueba
      const staffRes = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Colaborador Test Golden Master',
          phone: '3012223344',
          role: 'PRODUCCION',
          type: 'EMPLEADO',
          paymentScheme: 'POR_DIA',
          defaultRate: 45000,
        });

      expect(staffRes.status).toBe(201);
      testStaffId = staffRes.body.id;

      // 2. Registrar pago de nómina
      const paymentRes = await request(app)
        .post('/api/staff/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: testStaffId,
          paymentType: 'NOMINA',
          amount: 90000,
          deductions: 10000,
          netAmount: 80000,
          paymentMethod: 'EFECTIVO',
          calculationDetails: '2 días laborados a $45.000 menos $10.000 anticipo',
          notes: 'Pago liquidado Golden Master',
        });

      expect(paymentRes.status).toBe(201);
      expect(paymentRes.body.staffId).toBe(testStaffId);
      expect(paymentRes.body.amount).toBe(90000);
      expect(paymentRes.body.deductions).toBe(10000);
      expect(paymentRes.body.netAmount).toBe(80000);
    });
  });

  // ============================================================================
  // TEARDOWN / LIMPIEZA DE DATOS GENERADOS EN LA SUITE
  // ============================================================================
  describe('5. Limpieza Controlada (Teardown)', () => {
    it('Debe limpiar los registros de prueba generados en el esquema de test', async () => {
      if (testOrderId) {
        await prisma.orderPayment.deleteMany({ where: { orderId: testOrderId } });
        await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
        await prisma.order.delete({ where: { id: testOrderId } });
      }
      if (testBatchId) {
        await prisma.batchDischarge.deleteMany({ where: { batchId: testBatchId } });
        await prisma.productionBatch.delete({ where: { id: testBatchId } });
      }
      if (testStaffId) {
        await prisma.staffPayment.deleteMany({ where: { staffId: testStaffId } });
        await prisma.staffMember.delete({ where: { id: testStaffId } });
      }
      if (testCashMovementId) {
        await prisma.cashMovement.delete({ where: { id: testCashMovementId } });
      }
      expect(true).toBe(true);
    });
  });
});
