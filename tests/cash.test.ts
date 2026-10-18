import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Cash Movements Management & Pagination', () => {
  const adminToken = getAdminAuthToken();
  const createdIds: number[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.cashMovement.deleteMany({
        where: { id: { in: createdIds } },
      });
    }
  });

  it('GET /api/cash/movements debe soportar paginación estricta a 10 registros', async () => {
    const res = await request(app)
      .get('/api/cash/movements?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.pagination.page).toBe(1);
    expect(typeof res.body.pagination.total).toBe('number');
    expect(typeof res.body.pagination.totalPages).toBe('number');
    expect(res.headers).toHaveProperty('x-total-count');
    expect(res.headers).toHaveProperty('x-total-pages');
    expect(res.headers['x-current-page']).toBe('1');
  });

  it('POST /api/cash/movements debe permitir crear movimientos de tipo INGRESO y EGRESO', async () => {
    // 1. INGRESO
    const resIngreso = await request(app)
      .post('/api/cash/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INGRESO',
        amount: 80000,
        concept: 'Ingreso extraordinario test',
        paymentMethod: 'EFECTIVO',
        notes: 'Nota prueba ingreso',
      });

    expect(resIngreso.status).toBe(201);
    expect(resIngreso.body.type).toBe('INGRESO');
    expect(resIngreso.body.amount).toBe(80000);
    expect(resIngreso.body.paymentMethod).toBe('EFECTIVO');
    createdIds.push(resIngreso.body.id);

    // 2. EGRESO
    const resEgreso = await request(app)
      .post('/api/cash/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'EGRESO',
        amount: 30000,
        description: 'Egreso caja menor test',
        paymentMethod: 'NEQUI',
        notes: 'Nota prueba egreso',
      });

    expect(resEgreso.status).toBe(201);
    expect(resEgreso.body.type).toBe('EGRESO');
    expect(resEgreso.body.amount).toBe(30000);
    expect(resEgreso.body.paymentMethod).toBe('NEQUI');
    createdIds.push(resEgreso.body.id);
  });

  it('PUT /api/cash/movements/:id debe permitir la edición completa del movimiento de caja', async () => {
    const idToEdit = createdIds[0];
    expect(idToEdit).toBeDefined();

    const resUpdate = await request(app)
      .put(`/api/cash/movements/${idToEdit}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INGRESO',
        amount: 110000,
        concept: 'Ingreso corregido por digitación',
        paymentMethod: 'BANCOLOMBIA',
        notes: 'Monto y banco corregidos',
      });

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.id).toBe(idToEdit);
    expect(resUpdate.body.amount).toBe(110000);
    expect(resUpdate.body.concept).toBe('Ingreso corregido por digitación');
    expect(resUpdate.body.paymentMethod).toBe('BANCOLOMBIA');
    expect(resUpdate.body.notes).toBe('Monto y banco corregidos');

    // Verificar en BD
    const dbItem = await prisma.cashMovement.findUnique({
      where: { id: idToEdit },
    });
    expect(dbItem?.amount).toBe(110000);
    expect(dbItem?.paymentMethod).toBe('BANCOLOMBIA');
  });

  it('PUT /api/cash/movements/:id debe rechazar montos inválidos o negativos con 400', async () => {
    const idToEdit = createdIds[0];
    const res = await request(app)
      .put(`/api/cash/movements/${idToEdit}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -25000,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('DELETE /api/cash/movements/:id debe eliminar el movimiento de prueba', async () => {
    const idToDelete = createdIds.pop();
    expect(idToDelete).toBeDefined();

    const res = await request(app)
      .delete(`/api/cash/movements/${idToDelete}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const dbCheck = await prisma.cashMovement.findUnique({
      where: { id: idToDelete },
    });
    expect(dbCheck).toBeNull();
  });

  it('PUT /api/cash/movements/:id debe permitir actualizar medio de pago a DAVIPLATA', async () => {
    const idToEdit = createdIds[0];
    const resUpdate = await request(app)
      .put(`/api/cash/movements/${idToEdit}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentMethod: 'DAVIPLATA',
        notes: 'Actualizado a canal DaviPlata',
      });

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.paymentMethod).toBe('DAVIPLATA');
  });

  it('GET /api/batches/metrics debe responder con métricas agregadas nativas globales', async () => {
    const res = await request(app)
      .get('/api/batches/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('fermentingLiters');
    expect(res.body).toHaveProperty('finishedYogurtLiters');
    expect(res.body).toHaveProperty('averageYield');
    expect(res.body).toHaveProperty('totalBatchesCount');
  });

  it('GET /api/orders/metrics debe responder con métricas agregadas nativas globales', async () => {
    const res = await request(app)
      .get('/api/orders/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalOrdersCount');
    expect(res.body).toHaveProperty('totalSalesAmount');
    expect(res.body).toHaveProperty('totalPendingDebt');
    expect(res.body).toHaveProperty('countEncargos');
    expect(res.body).toHaveProperty('countWithDebt');
    expect(res.body).toHaveProperty('countAlDia');
  });

  it('GET /api/dashboard/summary debe enriquecer cobros de venta con concepto y datos del pedido', async () => {
    // 1. Crear un pedido con abono para la prueba
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Prueba Caja',
        customerPhone: '3001239999',
        customerAddress: 'Calle Central #10',
        bottleSize: '1L',
        quantityBottles: 2,
        flavor: 'Mora',
        totalAmount: 24000,
        paidAmount: 10000,
        paymentMethod: 'EFECTIVO',
        deliveryStatus: 'PENDING',
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    const paymentId = orderRes.body.payments?.[0]?.id || 0;

    try {
      // 2. Consultar dashboard summary
      const summaryRes = await request(app)
        .get('/api/dashboard/summary?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      const inflows = summaryRes.body.detailedBreakdowns?.cashFlow?.inflows || [];
      const orderInflow = inflows.find((i: any) => i.rawId === orderId || i.orderId === orderId);

      expect(orderInflow).toBeDefined();
      expect(orderInflow.concept).toContain('Pedido');
      expect(orderInflow.concept).toContain('Cliente Prueba Caja');
      expect(orderInflow.customerName).toBe('Cliente Prueba Caja');
      expect(orderInflow.isOrderPayment).toBe(true);

      // 3. Editar monto y método de pago del abono
      const updatePaymentRes = await request(app)
        .put(`/api/orders/${orderId}/payments/${paymentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 15000,
          paymentMethod: 'DAVIPLATA',
          notes: 'Monto corregido desde caja',
        });

      expect(updatePaymentRes.status).toBe(200);
      expect(updatePaymentRes.body.paidAmount).toBe(15000);
      expect(updatePaymentRes.body.pendingAmount).toBe(9000);
      expect(updatePaymentRes.body.paymentMethod).toBe('DAVIPLATA');

      // 4. Verificar que se actualizó en el resumen de caja
      const afterSummary = await request(app)
        .get('/api/dashboard/summary?period=all')
        .set('Authorization', `Bearer ${adminToken}`);

      const updatedInflows = afterSummary.body.detailedBreakdowns?.cashFlow?.inflows || [];
      const updatedInflow = updatedInflows.find((i: any) => i.rawId === orderId || i.orderId === orderId);
      expect(updatedInflow).toBeDefined();
      expect(updatedInflow.amount).toBe(15000);
      expect(updatedInflow.paymentMethod).toBe('DAVIPLATA');
    } finally {
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    }
  });

  it('GET /api/cash-movements/capital-balances y validación de tope en devolución de aporte y retiro de base', async () => {
    // 1. Crear un socio temporal para la prueba
    const partner = await prisma.staffMember.create({
      data: {
        fullName: 'Socio Test Aportes',
        phone: '3109998877',
        role: 'SOCIO',
        type: 'SOCIO',
        paymentScheme: 'PORCENTAJE',
      },
    });

    try {
      // 2. Consultar balances iniciales
      const balancesRes = await request(app)
        .get('/api/cash-movements/capital-balances')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(balancesRes.status).toBe(200);
      expect(balancesRes.body).toHaveProperty('base');
      expect(balancesRes.body).toHaveProperty('partners');
      expect(Array.isArray(balancesRes.body.partners)).toBe(true);

      const socioInitial = balancesRes.body.partners.find((p: any) => p.partnerId === partner.id);
      expect(socioInitial).toBeDefined();
      expect(socioInitial.available).toBe(0);

      // 3. Intentar devolver un aporte a un socio sin aportes previos -> debe responder 400
      const invalidReturnRes = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEVOLUCION_APORTE',
          amount: 50000,
          concept: 'Devolución indebida sin aportes',
          staffMemberId: partner.id,
          paymentMethod: 'EFECTIVO',
        });

      expect(invalidReturnRes.status).toBe(400);
      expect(invalidReturnRes.body.message).toMatch(/no puede ser mayor al aporte disponible/i);

      // 4. Registrar aporte de socio de $100.000
      const aporteRes = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'APORTE_SOCIO',
          amount: 100000,
          concept: 'Aporte extraordinario de prueba',
          staffMemberId: partner.id,
          paymentMethod: 'EFECTIVO',
        });

      expect(aporteRes.status).toBe(201);
      createdIds.push(aporteRes.body.id);

      // 5. Intentar devolver $150.000 (mayor a los $100.000 aportados) -> debe responder 400
      const overReturnRes = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEVOLUCION_APORTE',
          amount: 150000,
          concept: 'Devolución que excede aporte',
          staffMemberId: partner.id,
          paymentMethod: 'EFECTIVO',
        });

      expect(overReturnRes.status).toBe(400);
      expect(overReturnRes.body.message).toMatch(/no puede ser mayor al aporte disponible/i);

      // 6. Devolver monto válido de $40.000 -> debe responder 201
      const validReturnRes = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEVOLUCION_APORTE',
          amount: 40000,
          concept: 'Devolución parcial válida de aporte',
          staffMemberId: partner.id,
          paymentMethod: 'EFECTIVO',
        });

      expect(validReturnRes.status).toBe(201);
      createdIds.push(validReturnRes.body.id);

      // 7. Verificar que el disponible del socio ahora sea exactamente $60.000
      const afterBalances = await request(app)
        .get('/api/cash-movements/capital-balances')
        .set('Authorization', `Bearer ${adminToken}`);

      const socioAfter = afterBalances.body.partners.find((p: any) => p.partnerId === partner.id);
      expect(socioAfter.totalContributed).toBe(100000);
      expect(socioAfter.totalReturned).toBe(40000);
      expect(socioAfter.available).toBe(60000);

      // 8. Intentar retirar más base de la disponible en caja -> debe responder 400
      const currentBaseAvailable = afterBalances.body.base.available;
      const overBaseRes = await request(app)
        .post('/api/cash-movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'RETIRO_BASE',
          amount: currentBaseAvailable + 50000000, // Monto absurdo que excede la base
          concept: 'Retiro de base excesivo',
          paymentMethod: 'EFECTIVO',
        });

      expect(overBaseRes.status).toBe(400);
      expect(overBaseRes.body.message).toMatch(/no puede ser mayor a la base disponible/i);
    } finally {
      await prisma.staffMember.delete({ where: { id: partner.id } }).catch(() => {});
    }
  });

  it('Debe registrar y consultar movimientos nocturnos en Colombia (después de 7:00 PM) sin desfasar el día de calendario', async () => {
    // 20:30 hora Colombia = 01:30 UTC del día siguiente
    const testDate = '2026-11-20';
    const nightTimestamp = `${testDate}T20:30:00-05:00`;

    const createRes = await request(app)
      .post('/api/cash/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'INGRESO',
        amount: 25000,
        concept: 'Ingreso nocturno 8:30 PM Colombia',
        paymentMethod: 'EFECTIVO',
        movementDate: nightTimestamp,
      });

    expect(createRes.status).toBe(201);
    createdIds.push(createRes.body.id);

    // Consultar con filtro de fecha exacto de ese día
    const filterRes = await request(app)
      .get(`/api/cash/movements?startDate=${testDate}&endDate=${testDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(filterRes.status).toBe(200);
    const found = filterRes.body.data.find((m: any) => m.id === createRes.body.id);
    expect(found).toBeDefined();
    expect(found.amount).toBe(25000);

    // Verificar en getDashboardSummary para esa fecha
    const summaryRes = await request(app)
      .get(`/api/dashboard/summary?startDate=${testDate}&endDate=${testDate}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(summaryRes.status).toBe(200);
    const inflows = summaryRes.body.detailedBreakdowns?.cashFlow?.inflows || [];
    const foundInSummary = inflows.find((i: any) => i.id === createRes.body.id || i.rawId === createRes.body.id);
    expect(foundInSummary).toBeDefined();
  });
});
