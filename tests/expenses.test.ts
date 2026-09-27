import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Expenses Management & Full Edit', () => {
  const adminToken = getAdminAuthToken();
  const createdExpenseIds: number[] = [];

  afterAll(async () => {
    if (createdExpenseIds.length > 0) {
      await prisma.expense.deleteMany({
        where: { id: { in: createdExpenseIds } },
      });
    }
  });

  it('POST /api/expenses debe crear un gasto incluyendo proveedor opcional', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 45000,
        category: 'MATERIA_PRIMA',
        description: 'Compra de fruta para mermelada',
        supplier: 'Frutas del Valle SAS',
        paymentMethod: 'EFECTIVO',
        notes: 'Factura 1024',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.amount).toBe(45000);
    expect(res.body.category).toBe('MATERIA_PRIMA');
    expect(res.body.supplier).toBe('Frutas del Valle SAS');
    createdExpenseIds.push(res.body.id);
  });

  it('PUT /api/expenses/:id debe permitir la edición completa del gasto', async () => {
    const expenseId = createdExpenseIds[0];
    expect(expenseId).toBeDefined();

    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 55000,
        category: 'LOGISTICA_Y_TRANSPORTE',
        description: 'Flete transporte de fruta corregido',
        supplier: 'Transportes Rápidos',
        paymentMethod: 'NEQUI',
        notes: 'Actualización por valor de flete adicional',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(expenseId);
    expect(res.body.amount).toBe(55000);
    expect(res.body.category).toBe('LOGISTICA_Y_TRANSPORTE');
    expect(res.body.description).toBe('Flete transporte de fruta corregido');
    expect(res.body.supplier).toBe('Transportes Rápidos');
    expect(res.body.paymentMethod).toBe('NEQUI');

    // Comprobar persistencia directa en BD
    const dbItem = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    expect(dbItem?.amount).toBe(55000);
    expect(dbItem?.category).toBe('LOGISTICA_Y_TRANSPORTE');
    expect(dbItem?.supplier).toBe('Transportes Rápidos');
  });

  it('PUT /api/expenses/:id con monto no positivo debe retornar 400', async () => {
    const expenseId = createdExpenseIds[0];
    const res = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('DELETE /api/expenses/:id debe eliminar el gasto creado', async () => {
    const expenseId = createdExpenseIds.pop();
    expect(expenseId).toBeDefined();

    const res = await request(app)
      .delete(`/api/expenses/${expenseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    const dbCheck = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    expect(dbCheck).toBeNull();
  });
});
