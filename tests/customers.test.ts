import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Customers Endpoints and Payment Cascade', () => {
  const adminToken = getAdminAuthToken();
  let testCustomerId: number;
  let testOrderId: number;

  it('GET /api/customers sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('GET /api/customers con token debe retornar listado con estadísticas de ranking', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const c = res.body[0];
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('fullName');
      expect(c).toHaveProperty('deliveredPendingDebt');
      expect(c).toHaveProperty('inProcessPendingAmount');
    }
  });

  it('GET /api/customers con parámetros de paginación debe retornar items y metadata de paginación', async () => {
    const res = await request(app)
      .get('/api/customers?page=1&limit=2&paginate=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('currentPage', 1);
    expect(res.headers).toHaveProperty('x-total-count');
    expect(res.headers).toHaveProperty('x-total-pages');
    expect(res.headers).toHaveProperty('x-current-page', '1');
  });

  it('POST /api/customers con datos inválidos debe responder 400 por validación Zod', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: '', // Nombre vacío
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/customers debe crear un cliente nuevo con éxito', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Cliente Prueba Vitest',
        phone: '3009998877',
        address: 'Calle 12 # 4-56',
        neighborhood: 'El Carmen',
        notes: 'Cliente creado automáticamente para pruebas de integración',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.fullName).toBe('Cliente Prueba Vitest');
    expect(res.body.phone).toBe('3009998877');
    testCustomerId = res.body.id;
  });

  it('GET /api/customers/:id debe retornar el detalle del cliente recién creado', async () => {
    const res = await request(app)
      .get(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', testCustomerId);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  it('GET /api/customers/:id con ID inexistente debe responder 404', async () => {
    const res = await request(app)
      .get('/api/customers/99999999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/customers/:id/payment en cliente sin pedidos debe responder 400', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomerId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 20000,
        paymentMethod: 'TRANSFERENCIA_NEQUI',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('no tiene ningún pedido');
  });

  it('Debe crear un pedido de prueba y luego aplicar un abono en cascada atómico', async () => {
    // 1. Crear un pedido para este cliente
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomerId,
        items: [
          {
            bottleSize: '1L',
            flavor: 'Mora',
            quantity: 2,
            unitPrice: 12000,
          },
        ],
        totalAmount: 24000,
        paidAmount: 0,
        deliveryType: 'PROPIO',
        deliveryStatus: 'DELIVERED',
        notes: 'Pedido para probar abono en cascada',
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body).toHaveProperty('id');
    testOrderId = orderRes.body.id;
    expect(orderRes.body.pendingAmount).toBe(24000);
    expect(orderRes.body.paymentStatus).toBe('PENDING');

    // 2. Aplicar un abono parcial de 10.000 COP
    const payRes = await request(app)
      .post(`/api/customers/${testCustomerId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 10000,
        paymentMethod: 'NEQUI',
        notes: 'Primer abono de prueba',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body).toHaveProperty('applied', 10000);
    expect(payRes.body.updatedOrders.length).toBeGreaterThan(0);

    const updated = payRes.body.updatedOrders.find((o: any) => o.id === testOrderId);
    expect(updated).toBeDefined();
    expect(updated.paidAmount).toBe(10000);
    expect(updated.pendingAmount).toBe(14000);
    expect(updated.paymentStatus).toBe('PARTIAL');

    // 3. Aplicar el pago final restante de 14.000 COP
    const payFinalRes = await request(app)
      .post(`/api/customers/${testCustomerId}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 14000,
        orderId: testOrderId,
        paymentMethod: 'EFECTIVO',
      });

    expect(payFinalRes.status).toBe(200);
    const finalOrder = payFinalRes.body.updatedOrders.find((o: any) => o.id === testOrderId);
    expect(finalOrder.paidAmount).toBe(24000);
    expect(finalOrder.pendingAmount).toBe(0);
    expect(finalOrder.paymentStatus).toBe('PAID');
  });

  it('DELETE /api/customers/:id debe desactivar el cliente (soft-delete)', async () => {
    const res = await request(app)
      .delete(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Limpieza posterior de datos de prueba
    if (testOrderId) {
      await prisma.orderPayment.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    }
    if (testCustomerId) {
      await prisma.customer.delete({ where: { id: testCustomerId } });
    }
  });
});
