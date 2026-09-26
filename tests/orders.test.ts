import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Orders Endpoints and Atomic Operations', () => {
  const adminToken = getAdminAuthToken();
  let createdOrderId: number;
  let testPaymentId: number;

  it('GET /api/orders sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('GET /api/orders con autenticación debe retornar lista de pedidos', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/orders con parámetros de paginación debe retornar items y metadata de paginación', async () => {
    const res = await request(app)
      .get('/api/orders?page=1&limit=2&paginate=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('currentPage', 1);
    expect(res.body.pagination).toHaveProperty('limit', 2);
    expect(res.body.pagination).toHaveProperty('totalItems');
    expect(res.headers).toHaveProperty('x-total-count');
    expect(res.headers).toHaveProperty('x-total-pages');
    expect(res.headers).toHaveProperty('x-current-page', '1');
  });

  it('POST /api/orders con payload inválido debe responder 400', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/orders debe crear un pedido con ítems múltiples y abono inicial', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Test Pedidos',
        customerPhone: '3118887766',
        customerAddress: 'Carrera 15 # 10-20',
        items: [
          { bottleSize: '1L', flavor: 'Fresa', quantity: 2, unitPrice: 12000 },
          { bottleSize: '2L', flavor: 'Melocotón', quantity: 1, unitPrice: 24000 },
        ],
        deliveryFee: 3000,
        paidAmount: 20000,
        paymentMethod: 'TRANSFERENCIA_NEQUI',
        deliveryType: 'DOMICILIARIO',
        deliveryStatus: 'PENDING',
        notes: 'Pedido de prueba Vitest con abono inicial',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.orderNumber).toMatch(/^PED-\d{8}-\d{3}$/);
    expect(res.body.totalAmount).toBe(24000 + 24000 + 3000); // 51000
    expect(res.body.paidAmount).toBe(20000);
    expect(res.body.pendingAmount).toBe(31000);
    expect(res.body.paymentStatus).toBe('PARTIAL');
    expect(res.body.items.length).toBe(2);
    expect(res.body.payments.length).toBe(1);

    createdOrderId = res.body.id;
  });

  it('GET /api/orders/:id debe retornar el detalle completo del pedido', async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdOrderId);
    expect(res.body.customer.fullName).toBe('Cliente Test Pedidos');
  });

  it('PUT /api/orders/:id/delivery-status debe actualizar el estado de entrega', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryStatus: 'DELIVERED',
      });

    expect(res.status).toBe(200);
    expect(res.body.deliveryStatus).toBe('DELIVERED');
  });

  it('POST /api/orders/:id/payments debe agregar un abono transaccional y recalcular saldo', async () => {
    const res = await request(app)
      .post(`/api/orders/${createdOrderId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 15000,
        paymentMethod: 'EFECTIVO',
        notes: 'Segundo abono recibido en entrega',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('payment');
    expect(res.body.payment.amount).toBe(15000);
    expect(res.body.order.paidAmount).toBe(35000); // 20000 + 15000
    expect(res.body.order.pendingAmount).toBe(16000); // 51000 - 35000
    expect(res.body.order.paymentStatus).toBe('PARTIAL');

    testPaymentId = res.body.payment.id;
  });

  it('PUT /api/orders/:id/payments/:paymentId debe editar un abono de forma atómica', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/payments/${testPaymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 31000, // Aumentamos el pago para saldar la cuenta (20000 + 31000 = 51000)
        paymentMethod: 'TRANSFERENCIA_NEQUI',
        notes: 'Ajuste de monto a pago completo',
      });

    expect(res.status).toBe(200);
    expect(res.body.paidAmount).toBe(51000);
    expect(res.body.pendingAmount).toBe(0);
    expect(res.body.paymentStatus).toBe('PAID');
  });

  it('DELETE /api/orders/:id/payments/:paymentId debe eliminar el abono y recalcular el saldo', async () => {
    const res = await request(app)
      .delete(`/api/orders/${createdOrderId}/payments/${testPaymentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.order.paidAmount).toBe(20000);
    expect(res.body.order.pendingAmount).toBe(31000);
    expect(res.body.order.paymentStatus).toBe('PARTIAL');
  });

  it('PUT /api/orders/:id debe actualizar ítems de forma atómica en una transacción', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          { bottleSize: '1L', flavor: 'Guanábana', quantity: 1, unitPrice: 12000 },
        ],
        deliveryFee: 2000,
        totalAmount: 14000,
        paidAmount: 14000,
      });

    expect(res.status).toBe(200);
    expect(res.body.totalAmount).toBe(14000);
    expect(res.body.paidAmount).toBe(14000);
    expect(res.body.pendingAmount).toBe(0);
    expect(res.body.paymentStatus).toBe('PAID');
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].flavor).toBe('Guanábana');
  });

  it('PUT /api/orders/:id/delivery-status con pago total debe marcar PAID y registrar ingreso en caja atómicamente', async () => {
    const newOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Entrega Total',
        customerPhone: '3119991122',
        customerAddress: 'Calle 100 # 20-30',
        items: [
          { bottleSize: '1L', flavor: 'Fresa', quantity: 2, unitPrice: 12000 },
        ],
        deliveryFee: 2000,
        paidAmount: 5000,
        paymentMethod: 'EFECTIVO',
        deliveryType: 'DOMICILIARIO',
        deliveryStatus: 'IN_ROUTE',
      });

    expect(newOrderRes.status).toBe(201);
    const orderId = newOrderRes.body.id;
    expect(newOrderRes.body.totalAmount).toBe(26000);
    expect(newOrderRes.body.pendingAmount).toBe(21000);

    // Confirmamos entrega con pago total restante en EFECTIVO (Caja Menor)
    const deliverRes = await request(app)
      .put(`/api/orders/${orderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryStatus: 'DELIVERED',
        paidAmount: 26000,
        paymentMethod: 'EFECTIVO',
        notes: 'Pago completo en efectivo recibido en puerta',
      });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.deliveryStatus).toBe('DELIVERED');
    expect(deliverRes.body.paymentStatus).toBe('PAID');
    expect(deliverRes.body.paidAmount).toBe(26000);
    expect(deliverRes.body.pendingAmount).toBe(0);
    expect(deliverRes.body.payments.length).toBe(2);

    const lastPayment = deliverRes.body.payments[deliverRes.body.payments.length - 1];
    expect(lastPayment.amount).toBe(21000);
    expect(lastPayment.paymentMethod).toBe('EFECTIVO');

    // Limpieza
    await prisma.orderPayment.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.customer.deleteMany({ where: { phone: '3119991122' } });
  });

  it('PUT /api/orders/:id/delivery-status con abono parcial debe marcar PARTIAL y registrar solo el abono en caja', async () => {
    const newOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Entrega Abono',
        customerPhone: '3119993344',
        customerAddress: 'Avenida 68 # 45-12',
        items: [
          { bottleSize: '2L', flavor: 'Mora', quantity: 2, unitPrice: 20000 },
        ],
        deliveryFee: 3000,
        paidAmount: 0,
        deliveryType: 'DOMICILIARIO',
        deliveryStatus: 'IN_ROUTE',
      });

    expect(newOrderRes.status).toBe(201);
    const orderId = newOrderRes.body.id;
    expect(newOrderRes.body.totalAmount).toBe(43000);
    expect(newOrderRes.body.pendingAmount).toBe(43000);

    // Confirmamos entrega abonando $20.000 vía Nequi
    const deliverRes = await request(app)
      .put(`/api/orders/${orderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryStatus: 'DELIVERED',
        paidAmount: 20000,
        paymentMethod: 'NEQUI',
        notes: 'Abonó 20k por Nequi, saldo restante 23k pendiente',
      });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.deliveryStatus).toBe('DELIVERED');
    expect(deliverRes.body.paymentStatus).toBe('PARTIAL');
    expect(deliverRes.body.paidAmount).toBe(20000);
    expect(deliverRes.body.pendingAmount).toBe(23000);
    expect(deliverRes.body.payments.length).toBe(1);
    expect(deliverRes.body.payments[0].amount).toBe(20000);
    expect(deliverRes.body.payments[0].paymentMethod).toBe('NEQUI');

    // Limpieza
    await prisma.orderPayment.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.customer.deleteMany({ where: { phone: '3119993344' } });
  });

  it('PUT /api/orders/:id/delivery-status no pagó / a crédito debe entregar sin asentar entrada en caja', async () => {
    const newOrderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Entrega Fiado',
        customerPhone: '3119995566',
        customerAddress: 'Diagonal 45 # 12-80',
        items: [
          { bottleSize: '1L', flavor: 'Melocotón', quantity: 1, unitPrice: 12000 },
        ],
        deliveryFee: 0,
        paidAmount: 0,
        deliveryType: 'DOMICILIARIO',
        deliveryStatus: 'IN_ROUTE',
      });

    expect(newOrderRes.status).toBe(201);
    const orderId = newOrderRes.body.id;
    expect(newOrderRes.body.totalAmount).toBe(12000);
    expect(newOrderRes.body.pendingAmount).toBe(12000);

    // Confirmamos entrega sin pago (a crédito / fiado)
    const deliverRes = await request(app)
      .put(`/api/orders/${orderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryStatus: 'DELIVERED',
        paidAmount: 0,
        paymentStatus: 'PENDING',
        notes: 'Entregado a crédito para cobro quincenal',
      });

    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.deliveryStatus).toBe('DELIVERED');
    expect(deliverRes.body.paymentStatus).toBe('PENDING');
    expect(deliverRes.body.paidAmount).toBe(0);
    expect(deliverRes.body.pendingAmount).toBe(12000);
    expect(deliverRes.body.payments.length).toBe(0);

    // Limpieza
    await prisma.orderPayment.deleteMany({ where: { orderId } });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.customer.deleteMany({ where: { phone: '3119995566' } });
  });

  it('GET /api/orders con límite de 9 pedidos debe retornar paginación exacta de 9 registros', async () => {
    const res = await request(app)
      .get('/api/orders?page=1&limit=9&paginate=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(9);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('limit', 9);
    expect(res.body.pagination).toHaveProperty('page', 1);
    expect(res.body.pagination).toHaveProperty('currentPage', 1);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
    expect(res.headers).toHaveProperty('x-total-count');
    expect(res.headers).toHaveProperty('x-total-pages');
    expect(res.headers).toHaveProperty('x-current-page', '1');
  });

  it('GET /api/orders filtrado para domicilios de hoy debe soportar paginación a 9', async () => {
    const res = await request(app)
      .get('/api/orders?deliveryType=DOMICILIARIO&deliveryStatus=TO_DELIVER&page=1&limit=9&paginate=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.pagination.limit).toBe(9);
    expect(res.body.pagination.page).toBe(1);
  });

  it('PUT /api/orders/:id/delivery-status reabrir pedido entregado a IN_ROUTE debe limpiar deliveryDate', async () => {
    // 1. Marcar el pedido como entregado
    await request(app)
      .put(`/api/orders/${createdOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryStatus: 'DELIVERED' });

    // 2. Reabrir pedido pasándolo a IN_ROUTE
    const reopenRes = await request(app)
      .put(`/api/orders/${createdOrderId}/delivery-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ deliveryStatus: 'IN_ROUTE' });

    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.deliveryStatus).toBe('IN_ROUTE');
    expect(reopenRes.body.deliveryDate).toBeNull();
  });

  it('DELETE /api/orders/:id debe eliminar el pedido de prueba limpiamente', async () => {
    // Limpiar pagos e ítems asociados
    await prisma.orderPayment.deleteMany({ where: { orderId: createdOrderId } });
    await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });

    const res = await request(app)
      .delete(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Limpiar cliente de prueba
    await prisma.customer.deleteMany({
      where: { phone: '3118887766' },
    });
  });
});
