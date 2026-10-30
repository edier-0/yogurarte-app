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

  describe('Spec 006 — Unificación Canónica Insumos, Sincronización y Blindaje de Caja', () => {
    let testRawMaterialId: number;
    let testPurchaseId: number;
    let testExpenseId: number;

    it('POST y PUT /api/expenses deben normalizar forzosamente "🥛 Compra Insumo" o "COMPRA_INSUMO" a "INSUMOS_EXTRA" (RF-1, RF-2)', async () => {
      // 1. Probar que POST normaliza la categoría visual
      const postRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 25000,
          category: '🥛 Compra Insumo',
          description: 'Compra de tapas plásticas',
          paymentMethod: 'EFECTIVO',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.category).toBe('INSUMOS_EXTRA');
      const createdId = postRes.body.id;
      createdExpenseIds.push(createdId);

      const dbPostCheck = await prisma.expense.findUnique({ where: { id: createdId } });
      expect(dbPostCheck?.category).toBe('INSUMOS_EXTRA');

      // 2. Probar que PUT normaliza si se envía 'COMPRA_INSUMO'
      const putRes = await request(app)
        .put(`/api/expenses/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'COMPRA_INSUMO',
          amount: 26000,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.category).toBe('INSUMOS_EXTRA');

      const dbPutCheck = await prisma.expense.findUnique({ where: { id: createdId } });
      expect(dbPutCheck?.category).toBe('INSUMOS_EXTRA');
      expect(dbPutCheck?.amount).toBe(26000);
    });

    it('PUT /api/expenses/:id debe sincronizar paymentMethod, monto y proveedor hacia Purchase atómicamente (RF-5)', async () => {
      // 1. Crear insumo de prueba y compra en Purchase
      const material = await prisma.rawMaterial.create({
        data: {
          code: `TEST-BOT-${Date.now()}`,
          name: 'Botella Test 1L',
          category: 'EMPAQUE',
          unit: 'Unidades',
          currentStock: 10,
        },
      });
      testRawMaterialId = material.id;

      const purchase = await prisma.purchase.create({
        data: {
          rawMaterialId: material.id,
          quantity: 10,
          unitCost: 1500,
          totalCost: 15000,
          supplier: 'Plásticos Test SAS',
          paymentMethod: 'EFECTIVO',
          purchaseDate: new Date(),
        },
      });
      testPurchaseId = purchase.id;

      // 2. Crear gasto asociado de insumos
      const expense = await prisma.expense.create({
        data: {
          category: 'INSUMOS_EXTRA',
          description: 'Compra de Botella Test 1L (10 Unidades)',
          amount: 15000,
          expenseDate: purchase.purchaseDate,
          paymentMethod: 'EFECTIVO',
          supplier: 'Plásticos Test SAS',
        },
      });
      testExpenseId = expense.id;
      createdExpenseIds.push(expense.id);

      // 3. Modificar el gasto cambiando canal de pago a NEQUI y proveedor
      const updateRes = await request(app)
        .put(`/api/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentMethod: 'NEQUI',
          supplier: 'Plásticos Test Actualizado',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.paymentMethod).toBe('NEQUI');

      // 4. Verificar que en BD la Purchase se actualizó en sincronía a NEQUI
      const syncedPurchase = await prisma.purchase.findUnique({
        where: { id: purchase.id },
      });
      expect(syncedPurchase?.paymentMethod).toBe('NEQUI');
      expect(syncedPurchase?.supplier).toBe('Plásticos Test Actualizado');
    });

    it('GET /api/dashboard/summary debe retornar category "INSUMOS_EXTRA" y no duplicar compras en cashFlow.outflows (RF-3, RF-6)', async () => {
      expect(testExpenseId).toBeDefined();

      const summaryRes = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      const outflows = summaryRes.body.detailedBreakdowns?.cashFlow?.outflows || [];

      // Buscar las salidas relacionadas con nuestra compra de prueba
      const matchingOutflows = outflows.filter(
        (o: any) =>
          Number(o.amount) === 15000 &&
          (o.rawId === testExpenseId || o.rawId === testPurchaseId)
      );

      // NO debe duplicarse: debe haber exactamente 1 salida en el flujo de caja
      expect(matchingOutflows.length).toBe(1);

      const item = matchingOutflows[0];
      // La propiedad category debe ser la técnica 'INSUMOS_EXTRA', no el alias 'COMPRA_INSUMO'
      expect(item.category).toBe('INSUMOS_EXTRA');
      expect(item.categoryLabel).toContain('Insumo');

      // Limpieza de datos de prueba
      await prisma.purchase.delete({ where: { id: testPurchaseId } }).catch(() => {});
      await prisma.rawMaterial.delete({ where: { id: testRawMaterialId } }).catch(() => {});
    });
  });
});
