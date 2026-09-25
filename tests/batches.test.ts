import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
import prisma from '../src/prisma.js';

describe('Production Batches - Fase A Fermentación, Fase B Envasado, Preventas, Agotamiento y Paginación', () => {
  const adminToken = getAdminAuthToken();

  let testMilkId: number;
  let testBottle1LId: number;
  let testBottle2LId: number;
  let testCapId: number;
  let testStaffId: number;
  let testCustomerId: number;
  let testOrderId: number;
  let createdBatchId: number;

  beforeAll(async () => {
    // 1. Asegurar insumos base con stock
    const milk = await prisma.rawMaterial.upsert({
      where: { code: 'LECHE_TEST' },
      update: { currentStock: 1000, avgCost: 2800, isActive: true },
      create: {
        code: 'LECHE_TEST',
        name: 'Leche Cruda Entera Test',
        unit: 'Litros',
        currentStock: 1000,
        avgCost: 2800,
        category: 'LACTEOS',
        isActive: true,
      },
    });
    testMilkId = milk.id;

    // Asegurar insumo de leche reconocido por búsqueda
    await prisma.rawMaterial.updateMany({
      where: { code: 'LECHE' },
      data: { currentStock: 1000 },
    });

    const b1 = await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_1L' },
      update: { currentStock: 500, avgCost: 650, isActive: true },
      create: {
        code: 'BOTELLA_1L',
        name: 'Botella Pet 1 Litro',
        unit: 'Unidades',
        currentStock: 500,
        avgCost: 650,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testBottle1LId = b1.id;

    const b2 = await prisma.rawMaterial.upsert({
      where: { code: 'BOTELLA_2L' },
      update: { currentStock: 500, avgCost: 1100, isActive: true },
      create: {
        code: 'BOTELLA_2L',
        name: 'Botella Pet 2 Litros',
        unit: 'Unidades',
        currentStock: 500,
        avgCost: 1100,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testBottle2LId = b2.id;

    const cap = await prisma.rawMaterial.upsert({
      where: { code: 'TAPA' },
      update: { currentStock: 1000, avgCost: 120, isActive: true },
      create: {
        code: 'TAPA',
        name: 'Tapa de Seguridad 38mm',
        unit: 'Unidades',
        currentStock: 1000,
        avgCost: 120,
        category: 'ENVASES',
        isActive: true,
      },
    });
    testCapId = cap.id;

    // 2. Asegurar socio para retiro
    const staff = await prisma.staffMember.upsert({
      where: { id: 888 },
      update: { fullName: 'Socio Test Producción', isActive: true },
      create: {
        id: 888,
        fullName: 'Socio Test Producción',
        role: 'SOCIO',
        type: 'SOCIO',
        isActive: true,
      },
    });
    testStaffId = staff.id;

    // 3. Asegurar cliente y pedido en preventa (batchId: null)
    let customer = await prisma.customer.findFirst({ where: { phone: '3009990011' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: 'Cliente Preventa Test',
          phone: '3009990011',
          address: 'Calle 10 # 5-20',
        },
      });
    }
    testCustomerId = customer.id;

    const orderNumber = `TEST-ORD-${Date.now()}`;
    const preOrder = await prisma.order.create({
      data: {
        orderNumber,
        customerId: testCustomerId,
        batchId: null,
        bottleSize: '1L',
        quantityBottles: 2,
        totalLiters: 2.0,
        flavor: 'Mora Silvestre',
        unitPrice: 12000,
        totalAmount: 24000,
        paidAmount: 0,
        pendingAmount: 24000,
        paymentStatus: 'PENDING',
        deliveryStatus: 'PENDING',
        items: {
          create: [
            {
              batchId: null,
              bottleSize: '1L',
              flavor: 'Mora Silvestre',
              quantity: 2,
              unitPrice: 12000,
              totalPrice: 24000,
              totalLiters: 2.0,
              litersPerUnit: 1.0,
            },
          ],
        },
      },
    });
    testOrderId = preOrder.id;
  });

  it('GET /api/batches sin autenticación debe retornar 401', async () => {
    const res = await request(app).get('/api/batches');
    expect(res.status).toBe(401);
  });

  it('GET /api/batches con autenticación debe retornar estructura paginada a 5 por defecto', async () => {
    const res = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 5,
      totalPages: expect.any(Number),
    });
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('GET /api/batches?page=1&limit=5&status=ALL debe respetar los parámetros de paginación', async () => {
    const res = await request(app)
      .get('/api/batches?page=1&limit=5&status=ALL')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('POST /api/batches con leche negativa o cero debe fallar validación con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: -5,
        flavor: 'Mora',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/batches solicitando una cantidad enorme de leche sin stock debe rechazar con 400', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 999999,
        flavor: 'Arequipe',
        totalLitersProduced: 999999,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Stock insuficiente');
  });

  it('Fase A (Fermentación): POST /api/batches debe crear lote base sin requerir botellas en estado EN_FERMENTACION', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 30,
        totalLitersProduced: 29,
        flavor: 'Base Fermentada Natural',
        cultureType: 'Cultivo Probiótico Activo',
        initialSugarGrams: 0,
        useSugar: false,
        usePowderedMilk: false,
        status: 'EN_FERMENTACION',
        notes: 'Inoculación tina 1 - pH 6.6',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('EN_FERMENTACION');
    expect(res.body.packagedLiters).toBe(0);
    expect(res.body.bottles1LProduced).toBe(0);
    expect(res.body.bottles2LProduced).toBe(0);
    expect(res.body.cultureType).toBe('Cultivo Probiótico Activo');

    createdBatchId = res.body.id;
  });

  it('Fase B (Envasado y Fraccionamiento): POST /api/batches/:id/packaging fracciona lote y pasa a DISPONIBLE', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Mora Silvestre',
        bottles1L: 10,
        bottles2L: 5, // 10*1 + 5*2 = 20 Litros
        notes: 'Envasado lote fraccionario 1',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('packaging');
    expect(res.body.packaging.flavor).toBe('Mora Silvestre');
    expect(res.body.packaging.totalLiters).toBe(20);
    expect(res.body.batch.packagedLiters).toBe(20);
    expect(res.body.batch.status).toBe('DISPONIBLE');
  });

  it('Fase B con Pre-venta: POST /api/batches/:id/packaging vincula pedidos pendientes de forma atómica', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Mora Silvestre',
        bottles1L: 5,
        bottles2L: 2, // 5 + 4 = 9 Litros adicionales (total 29L envasados)
        linkOrderIds: [testOrderId],
      });

    expect(res.status).toBe(201);
    expect(res.body.batch.packagedLiters).toBe(29);

    // Verificar que el pedido quedó vinculado
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { items: true },
    });
    expect(updatedOrder?.batchId).toBe(createdBatchId);
    expect(updatedOrder?.items[0].batchId).toBe(createdBatchId);
  });

  it('Auditoría Completa: GET /api/batches/:id/summary retorna balance lácteo, botellas y pedidos vinculados', async () => {
    const res = await request(app)
      .get(`/api/batches/${createdBatchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rawMaterialsBalance');
    expect(res.body).toHaveProperty('bottlesBreakdown');
    expect(res.body).toHaveProperty('volumeBalance');
    expect(res.body).toHaveProperty('packagings');
    expect(res.body).toHaveProperty('linkedOrders');

    expect(res.body.rawMaterialsBalance.milkUsedLiters).toBe(30);
    expect(res.body.rawMaterialsBalance.totalLitersProduced).toBe(29);
    expect(res.body.rawMaterialsBalance.packagedLiters).toBe(29);
    expect(res.body.rawMaterialsBalance.unpackagedLiters).toBe(0);

    expect(res.body.linkedOrders.length).toBeGreaterThanOrEqual(1);
    expect(res.body.linkedOrders[0].id).toBe(testOrderId);
  });

  it('Retiro de Socio: POST /api/batches/:id/partner-withdrawal descuenta botellas del lote', async () => {
    const res = await request(app)
      .post(`/api/batches/${createdBatchId}/partner-withdrawal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottleSize: '1L',
        quantityBottles: 2,
        staffMemberId: testStaffId,
        notes: 'Consumo personal de socio test',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('discharge');
    expect(res.body.discharge.reasonType).toBe('CONSUMO_SOCIO');
    expect(res.body.discharge.quantityBottles).toBe(2);
  });

  it('Transición y Reactivación Bidireccional: Agotamiento al consumir saldo y reactivación al desvincular pedido', async () => {
    // 1. Obtener litros restantes y agotarlo intencionalmente con un descargo
    const summaryBefore = await request(app)
      .get(`/api/batches/${createdBatchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    const remaining = summaryBefore.body.volumeBalance.remainingAvailable;
    expect(remaining).toBeGreaterThan(0);

    // Descargar el saldo exacto restante para llevarlo a 0
    await request(app)
      .post(`/api/batches/${createdBatchId}/discharges`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottleSize: '1L',
        quantityBottles: Math.floor(remaining),
        totalLiters: remaining,
        reasonType: 'MERMA_DANO',
        notes: 'Agotamiento inducido para test de reactivación',
      });

    // Validar que el lote pasó automáticamente a AGOTADO
    const batchDepleted = await prisma.productionBatch.findUnique({
      where: { id: createdBatchId },
    });
    expect(batchDepleted?.status).toBe('AGOTADO');

    // 2. Desvincular el pedido de prueba mediante DELETE /api/batches/:id/orders/:orderId
    const unlinkRes = await request(app)
      .delete(`/api/batches/${createdBatchId}/orders/${testOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unlinkRes.status).toBe(200);
    expect(unlinkRes.body.message).toContain('desvinculado exitosamente');

    // El pedido debe haber regresado a preventa (batchId: null)
    const unlinkedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { items: true },
    });
    expect(unlinkedOrder?.batchId).toBeNull();
    expect(unlinkedOrder?.items[0].batchId).toBeNull();

    // El lote recuperó saldo (2L) y debe reactivarse automáticamente a DISPONIBLE
    const batchReactivated = await prisma.productionBatch.findUnique({
      where: { id: createdBatchId },
    });
    expect(batchReactivated?.status).toBe('DISPONIBLE');
  });

  it('Correlativos Diarios: GET /api/batches/next-code genera códigos secuenciales inteligentes', async () => {
    // 1. Correlativo lote madre
    const motherRes = await request(app)
      .get('/api/batches/next-code')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(motherRes.status).toBe(200);
    expect(motherRes.body).toHaveProperty('nextBatchCode');
    expect(motherRes.body.nextBatchCode).toMatch(/^LOTE-\d{8}-\d{2}$/);

    // 2. Correlativo fraccionamiento para un lote específico
    const pkgRes = await request(app)
      .get(`/api/batches/next-code?batchId=${createdBatchId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pkgRes.status).toBe(200);
    expect(pkgRes.body).toHaveProperty('nextPackagingCode');
    expect(pkgRes.body.nextPackagingCode).toMatch(/-F\d{2}$/);
  });

  it('Cambio Rápido de Estado: PATCH /api/batches/:id/status alterna 1-touch entre estados', async () => {
    // Pasar a EN_FERMENTACION
    const res1 = await request(app)
      .patch(`/api/batches/${createdBatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'EN_FERMENTACION' });

    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('EN_FERMENTACION');

    // Pasar de regreso a DISPONIBLE
    const res2 = await request(app)
      .patch(`/api/batches/${createdBatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISPONIBLE' });

    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('DISPONIBLE');
  });

  it('Bloqueo Estricto de Vinculación: Rechaza pedidos si el lote está en EN_FERMENTACION', async () => {
    // 1. Poner lote en fermentación
    await request(app)
      .patch(`/api/batches/${createdBatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'EN_FERMENTACION' });

    // 2. Intentar vincular pedido existente via link-orders
    const linkRes = await request(app)
      .post(`/api/batches/${createdBatchId}/link-orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderIds: [testOrderId] });

    expect(linkRes.status).toBe(400);
    expect(linkRes.body.error).toContain('FERMENTACIÓN BASE');

    // 3. Intentar crear un pedido asignándole directamente el lote en fermentación
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: testCustomerId,
        batchId: createdBatchId,
        bottleSize: '1L',
        quantityBottles: 1,
        flavor: 'Mora Silvestre',
        unitPrice: 12000,
        totalAmount: 12000,
      });

    expect(orderRes.status).toBe(400);
    expect(orderRes.body.error).toContain('FERMENTACIÓN BASE');

    // 4. Restaurar lote a DISPONIBLE para no afectar tests posteriores
    await request(app)
      .patch(`/api/batches/${createdBatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISPONIBLE' });
  });

  it('Edición con Balance Delta Fase A: PUT /api/batches/:id ajusta leche e insumos correctamente', async () => {
    // 1. Crear lote para prueba de edición
    const createRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 20,
        totalLitersProduced: 20,
        flavor: 'Base Para Edición Delta',
        cultureType: 'Cultivo Tradicional',
        fermentationHours: 8,
        status: 'EN_FERMENTACION',
      });

    expect(createRes.status).toBe(201);
    const editBatchId = createRes.body.id;

    // 2. Editar incrementando leche de 20 a 25 L (delta +5L) y cambiando horas a 10
    const editRes = await request(app)
      .put(`/api/batches/${editBatchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 25,
        totalLitersProduced: 25,
        cultureType: 'Cultivo Reforzado',
        fermentationHours: 10,
        notes: 'Ajuste de leche en tina',
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.milkUsedLiters).toBe(25);
    expect(editRes.body.fermentationHours).toBe(10);
    expect(editRes.body.cultureType).toBe('Cultivo Reforzado');
  });

  it('Edición con Balance Delta Fase B: PUT /api/batches/packagings/:packagingId ajusta botellas y stock', async () => {
    // 1. Obtener los fraccionamientos del lote de prueba
    const summaryRes = await request(app)
      .get(`/api/batches/${createdBatchId}/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    const pkg = summaryRes.body.packagings[0];
    expect(pkg).toBeDefined();

    // 2. Intentar exceder el volumen total disponible debe retornar 400
    const overLimitRes = await request(app)
      .put(`/api/batches/packagings/${pkg.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottles1L: pkg.bottles1L + 10,
        bottles2L: pkg.bottles2L,
      });
    expect(overLimitRes.status).toBe(400);
    expect(overLimitRes.body.error).toContain('Volumen insuficiente');

    // 3. Ajuste válido de botellas 1L (delta negativo: restituye insumo y reduce volumen envasado)
    const updatePkgRes = await request(app)
      .put(`/api/batches/packagings/${pkg.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bottles1L: pkg.bottles1L - 1,
        bottles2L: pkg.bottles2L,
        notes: 'Ajuste de reducción de 1 botella envasada',
      });

    expect(updatePkgRes.status).toBe(200);
    expect(updatePkgRes.body).toHaveProperty('packaging');
    expect(updatePkgRes.body.packaging.bottles1L).toBe(pkg.bottles1L - 1);
  });

  it('Dosificación en Fase A: Formulación de 108.333 g/L para 24 L de leche descuenta exactamente 2.6 kg de azúcar', async () => {
    // 1. Asegurar azúcar en inventario
    const sugar = await prisma.rawMaterial.upsert({
      where: { code: 'AZUCAR' },
      update: { currentStock: 100, avgCost: 4500, unit: 'Kilogramos', isActive: true },
      create: {
        code: 'AZUCAR',
        name: 'Azúcar Blanca Refinada',
        unit: 'Kilogramos',
        currentStock: 100,
        avgCost: 4500,
        category: 'MATERIAS_PRIMAS',
        isActive: true,
      },
    });

    const initialStock = sugar.currentStock;

    // 2. Simular cálculo de formulación del frontend:
    // Dosis: 108.333 g/L, Leche: 24 L
    const dosagePerLiter = 108.333;
    const milkUsedLiters = 24;
    const totalGrams = Math.round(dosagePerLiter * milkUsedLiters); // 2600 g
    const quantityUsedKg = Number((totalGrams / 1000).toFixed(4)); // 2.6 kg

    expect(totalGrams).toBe(2600);
    expect(quantityUsedKg).toBe(2.6);

    // 3. Crear lote en Fase A enviando la cantidad convertida a kg en dynamicItems
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters,
        totalLitersProduced: 23,
        flavor: 'Yogur Dosificación Exacta',
        cultureType: 'Cultivo Tradicional',
        fermentationHours: 8,
        status: 'EN_FERMENTACION',
        dynamicItems: [
          {
            rawMaterialId: sugar.id,
            quantityUsed: quantityUsedKg,
            dosagePerLiter,
            dosageUnit: 'g/L',
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.batchCode).toBeDefined();

    // 4. Verificar descuento exacto de 2.6 kg en inventario de azúcar
    const updatedSugar = await prisma.rawMaterial.findUnique({
      where: { id: sugar.id },
    });
    expect(updatedSugar).not.toBeNull();
    expect(updatedSugar!.currentStock).toBeCloseTo(initialStock - 2.6, 4);

    // 5. Verificar registro de BatchItemUsage con 2.6 kg exactos
    const batchInDb = await prisma.productionBatch.findUnique({
      where: { id: res.body.id },
      include: { itemsUsed: true },
    });
    const sugarUsage = batchInDb?.itemsUsed.find((u) => u.rawMaterialId === sugar.id);
    expect(sugarUsage).toBeDefined();
    expect(sugarUsage!.quantityUsed).toBe(2.6);
  });

  it('Compras con Egreso Automático: POST /api/inventory/purchases incrementa stock, recalcula PMP y genera Expense', async () => {
    // 1. Asegurar material de prueba para compra
    const testMat = await prisma.rawMaterial.upsert({
      where: { code: 'PULPA_TEST' },
      update: { currentStock: 10, avgCost: 10000, isActive: true },
      create: {
        code: 'PULPA_TEST',
        name: 'Pulpa de Fruta Test Compras',
        unit: 'Kilogramos',
        currentStock: 10,
        avgCost: 10000,
        category: 'INSUMO',
        isActive: true,
      },
    });

    // 2. Registrar compra de 10 kg a $12.000 c/u (Total: $120.000) con egreso automático
    // Stock anterior: 10 kg @ $10.000 = $100.000
    // Compra: 10 kg @ $12.000 = $120.000
    // Nuevo stock: 20 kg
    // Nuevo avgCost: (100.000 + 120.000) / 20 = $11.000
    const res = await request(app)
      .post('/api/inventory/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rawMaterialId: testMat.id,
        quantity: 10,
        unitCost: 12000,
        totalCost: 120000,
        supplier: 'Distribuidora Frutas del Valle',
        paymentMethod: 'TRANSFERENCIA',
        notes: 'Compra de prueba con egreso automático',
        registerExpense: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(10);
    expect(res.body.totalCost).toBe(120000);

    // 3. Validar actualización de stock y PMP en base de datos
    const updatedMat = await prisma.rawMaterial.findUnique({
      where: { id: testMat.id },
    });
    expect(updatedMat?.currentStock).toBe(20);
    expect(updatedMat?.avgCost).toBe(11000);

    // 4. Validar creación automática del Expense en caja
    const expense = await prisma.expense.findFirst({
      where: {
        description: { contains: 'Pulpa de Fruta Test Compras' },
        amount: 120000,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(expense).not.toBeNull();
    expect(expense?.category).toBe('INSUMOS_EXTRA');
    expect(expense?.paymentMethod).toBe('TRANSFERENCIA');
  });

  it('Fase B Dosificación y Pesaje al Gramo Entero: Envasado con pulpa en g/L descuenta kg exactos y absorbe costos', async () => {
    // 1. Crear insumo de pulpa de fresa para envasado
    const strawberryPulp = await prisma.rawMaterial.upsert({
      where: { code: 'PULPA_FRESA_TEST' },
      update: { currentStock: 50, avgCost: 8000, unit: 'Kilogramos', isActive: true },
      create: {
        code: 'PULPA_FRESA_TEST',
        name: 'Pulpa de Fresa Pasteurizada Test',
        unit: 'Kilogramos',
        currentStock: 50,
        avgCost: 8000,
        category: 'INSUMO',
        isActive: true,
      },
    });

    // 2. Crear lote base en fermentación de 30L
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 30,
        totalLitersProduced: 30,
        flavor: 'Base Para Fraccionamiento Fruta',
        cultureType: 'Cultivo Test',
        status: 'EN_FERMENTACION',
      });

    expect(batchRes.status).toBe(201);
    const fruitBatchId = batchRes.body.id;

    // 3. Fraccionar 15L (5 botellas 1L + 5 botellas 2L) con dosis de 125.5 g/L
    // Litros: 5*1 + 5*2 = 15L
    // Gramos totales = Math.round(125.5 * 15) = 1883 g
    // Kg a descontar = 1.883 kg
    const dosageGramsPerLiter = 125.5;
    const packagingRes = await request(app)
      .post(`/api/batches/${fruitBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Fresa Artesanal',
        bottles1L: 5,
        bottles2L: 5,
        fruitRawMaterialId: strawberryPulp.id,
        fruitDosageGramsPerLiter: dosageGramsPerLiter,
        useLabels: true,
        notes: 'Envasado con dosificación exacta de fresa',
      });

    expect(packagingRes.status).toBe(201);
    expect(packagingRes.body.packaging.totalLiters).toBe(15);
    expect(packagingRes.body.packaging.fruitQuantityUsed).toBe(1.883);

    // 4. Validar descuento exacto en inventario de pulpa
    const updatedPulp = await prisma.rawMaterial.findUnique({
      where: { id: strawberryPulp.id },
    });
    expect(updatedPulp?.currentStock).toBeCloseTo(50 - 1.883, 3);

    // 5. Validar impacto financiero en packagingCost
    // Costo fruta: 1.883 * 8000 = $15.064
    // Costo botellas 1L (5 * 650 = 3250)
    // Costo botellas 2L (5 * 1100 = 5500)
    // Costo tapas (10 * 120 = 1200)
    // Costo etiquetas si existen
    expect(packagingRes.body.packaging.packagingCost).toBeGreaterThanOrEqual(15064);
  });

  it('Fase B Control de Etiquetas: useLabels=false no descuenta etiquetas ni agrega su costo', async () => {
    // 1. Asegurar stock de etiquetas
    await prisma.rawMaterial.upsert({
      where: { code: 'ETIQUETA' },
      update: { currentStock: 500, avgCost: 200, isActive: true },
      create: {
        code: 'ETIQUETA',
        name: 'Etiqueta Corporativa Test',
        unit: 'Unidades',
        currentStock: 500,
        avgCost: 200,
        category: 'ENVASES',
        isActive: true,
      },
    });

    const labelsBefore = await prisma.rawMaterial.findFirst({ where: { code: 'ETIQUETA' } });
    const stockBefore = labelsBefore?.currentStock || 0;

    // 2. Crear lote base
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        milkUsedLiters: 10,
        totalLitersProduced: 10,
        flavor: 'Base Sin Etiquetas',
        status: 'EN_FERMENTACION',
      });

    const noLabelBatchId = batchRes.body.id;

    // 3. Envasar 4 botellas de 1L con useLabels: false
    const pkgRes = await request(app)
      .post(`/api/batches/${noLabelBatchId}/packaging`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flavor: 'Natural Sin Marca',
        bottles1L: 4,
        bottles2L: 0,
        useLabels: false,
      });

    expect(pkgRes.status).toBe(201);

    // 4. Verificar que el stock de etiquetas no cambió
    const labelsAfter = await prisma.rawMaterial.findFirst({ where: { code: 'ETIQUETA' } });
    expect(labelsAfter?.currentStock).toBe(stockBefore);
  });
});
