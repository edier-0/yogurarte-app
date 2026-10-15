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

  it('PUT /api/expenses/:id debe permitir editar un pago de nómina (StaffPayment) sin lanzar "Gasto no encontrado"', async () => {
    // 1. Crear integrante y pago de nómina de prueba
    const staff = await prisma.staffMember.create({
      data: {
        fullName: 'Operario Nómina Test',
        role: 'PRODUCCION',
        type: 'EMPLEADO',
        paymentScheme: 'JORNAL',
        defaultRate: 50000,
      },
    });

    const payment = await prisma.staffPayment.create({
      data: {
        staffId: staff.id,
        paymentType: 'JORNAL',
        amount: 50000,
        deductions: 0,
        netAmount: 50000,
        paymentMethod: 'EFECTIVO',
        notes: 'Jornal inicial prueba',
      },
    });

    // 2. Intentar editar a través del endpoint de gastos (como lo hace el modal de egresos de caja)
    const res = await request(app)
      .put(`/api/expenses/${payment.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 60000,
        category: 'NOMINA',
        paymentMethod: 'NEQUI',
        notes: 'Jornal actualizado con bono',
        description: 'Jornal corregido lote 1',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', payment.id);
    expect(res.body.amount).toBe(60000);
    expect(res.body.paymentMethod).toBe('NEQUI');

    // Comprobar que en BD se actualizó el StaffPayment
    const dbPayment = await prisma.staffPayment.findUnique({
      where: { id: payment.id },
    });
    expect(dbPayment?.netAmount).toBe(60000);
    expect(dbPayment?.amount).toBe(60000);
    expect(dbPayment?.paymentMethod).toBe('NEQUI');
    expect(dbPayment?.notes).toBe('Jornal actualizado con bono');

    // 3. Probar actualización directa mediante PUT /api/staff/payments/:id
    const resStaff = await request(app)
      .put(`/api/staff/payments/${payment.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 65000,
        deductions: 5000,
        netAmount: 60000,
        paymentMethod: 'EFECTIVO',
        notes: 'Actualizado desde apartado nómina',
      });

    expect(resStaff.status).toBe(200);
    expect(resStaff.body.amount).toBe(65000);
    expect(resStaff.body.deductions).toBe(5000);
    expect(resStaff.body.netAmount).toBe(60000);

    // 4. Probar eliminación mediante DELETE /api/staff/payments/:id
    const resDel = await request(app)
      .delete(`/api/staff/payments/${payment.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resDel.status).toBe(200);
    expect(resDel.body.message).toContain('eliminado correctamente');

    const checkDeleted = await prisma.staffPayment.findUnique({
      where: { id: payment.id },
    });
    expect(checkDeleted).toBeNull();

    // Limpieza
    await prisma.staffMember.delete({ where: { id: staff.id } });
  });
});
