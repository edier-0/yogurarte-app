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
});
