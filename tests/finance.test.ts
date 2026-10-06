import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Finance and Dashboard Endpoints', () => {
  const adminToken = getAdminAuthToken();
  let createdMovementId: number;

  it('GET /api/dashboard/summary sin autenticación debe responder 401', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/summary con autenticación debe retornar KPIs consolidados', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body.kpis).toHaveProperty('totalOrdersCount');
    expect(res.body.kpis).toHaveProperty('totalSalesAmount');
    expect(res.body.kpis).toHaveProperty('deliveredPendingToCollect');
    expect(res.body).toHaveProperty('recentOrders');
  });

  it('GET /api/cash-movements sin autenticación debe responder 401', async () => {
    const res = await request(app).get('/api/cash-movements');
    expect(res.status).toBe(401);
  });

  it('GET /api/cash-movements debe retornar balance y listado de movimientos de caja', async () => {
    const res = await request(app)
      .get('/api/cash-movements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
    expect(res.body).toHaveProperty('totalInjections');
    expect(res.body).toHaveProperty('totalWithdrawals');
    expect(res.body).toHaveProperty('netCashMovement');
    expect(Array.isArray(res.body.movements)).toBe(true);
  });

  it('POST /api/cash-movements con datos inválidos debe fallar la validación Zod con 400', async () => {
    const res = await request(app)
      .post('/api/cash-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: -5000,
        concept: '',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/cash-movements debe registrar un movimiento de caja correctamente', async () => {
    const res = await request(app)
      .post('/api/cash-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'BASE_INICIAL',
        amount: 50000,
        concept: 'Base de caja prueba Vitest',
        paymentMethod: 'EFECTIVO',
        notes: 'Movimiento automático creado para test de integración',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.amount).toBe(50000);
    expect(res.body.concept).toBe('Base de caja prueba Vitest');

    createdMovementId = res.body.id;
  });

  it('DELETE /api/cash-movements/:id debe eliminar el movimiento de prueba', async () => {
    const res = await request(app)
      .delete(`/api/cash-movements/${createdMovementId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Confirmar eliminación en base de datos
    const check = await prisma.cashMovement.findUnique({
      where: { id: createdMovementId },
    });
    expect(check).toBeNull();
  });

  it('POST /api/credits debe crear un crédito con frecuencia FLEXIBLE y cuota inicial por NEQUI', async () => {
    const res = await request(app)
      .post('/api/credits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Equipo de Enfriamiento Vitest',
        category: 'EQUIPO_MAQUINARIA',
        creditor: 'Refrigeración del Caribe',
        principalAmount: 1000000,
        initialPayment: 200000,
        initialPaymentMethod: 'NEQUI',
        paymentType: 'ABONOS_LIBRES',
        frequency: 'FLEXIBLE',
        installmentAmount: 0,
        notes: 'Crédito flexible de prueba',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.frequency).toBe('FLEXIBLE');
    expect(res.body.paymentType).toBe('ABONOS_LIBRES');
    expect(res.body.remainingBalance).toBe(800000);
    expect(res.body.initialPayment).toBe(200000);

    const testCreditId = res.body.id;

    // Abonar al crédito mediante el endpoint /api/credits/:id/pay
    const payRes = await request(app)
      .post(`/api/credits/${testCreditId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 300000,
        paymentMethod: 'NEQUI',
        receiptNumber: 'COMP-NEQUI-9988',
        justification: 'Abono libre flexible',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.credit.remainingBalance).toBe(500000);
    expect(payRes.body.credit.paidInstallments).toBe(2); // Cuota inicial + abono

    // Limpiar el crédito creado
    await request(app)
      .delete(`/api/credits/${testCreditId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  it('GET /api/dashboard/summary debe mantener cashInHand real acumulado aún con filtro period=today y reflejar traslados', async () => {
    // 1. Obtener balance actual con period=all y period=today
    const resAll = await request(app)
      .get('/api/dashboard/summary?period=all')
      .set('Authorization', `Bearer ${adminToken}`);

    const resToday = await request(app)
      .get('/api/dashboard/summary?period=today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAll.status).toBe(200);
    expect(resToday.status).toBe(200);
    // El saldo físico en caja acumulado debe coincidir sin ser reseteado a 0 por el filtro diario
    expect(resToday.body.kpis.cashInHand).toBe(resAll.body.kpis.cashInHand);
    expect(resToday.body.kpis.digitalBank).toBe(resAll.body.kpis.digitalBank);
    expect(resToday.body.kpis.cashBalance).toBe(resAll.body.kpis.cashBalance);

    // 2. Registrar un traslado temporal y verificar ajuste en caja y bancos
    const transferRes = await request(app)
      .post('/api/cash-movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'TRASLADO_EFECTIVO_A_BANCO',
        amount: 5000,
        concept: 'Prueba de consignación de efectivo',
        paymentMethod: 'NEQUI',
        notes: 'Test vitest traslado',
      });

    expect(transferRes.status).toBe(201);
    const createdTransferId = transferRes.body.id;

    const resAfterTransfer = await request(app)
      .get('/api/dashboard/summary?period=today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAfterTransfer.status).toBe(200);
    expect(resAfterTransfer.body.kpis.cashInHand).toBe(resToday.body.kpis.cashInHand - 5000);
    expect(resAfterTransfer.body.kpis.digitalBank).toBe(resToday.body.kpis.digitalBank + 5000);

    // Limpiar movimiento de prueba
    await request(app)
      .delete(`/api/cash-movements/${createdTransferId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });
});
