/**
 * SCRIPT DE SEMILLA DEMO PARA ENTORNO LOCAL Y ONBOARDING
 * prisma/seed.ts
 *
 * Pobla la base de datos con un ecosistema completo, realista e interactivo:
 * - 4 Usuarios y roles RBAC (Admin, Planta, Domiciliario) con hash Bcrypt.
 * - 8 Sabores institucionales y parámetros de negocio.
 * - 8 Insumos base y receta maestra de Mermelada Artesanal (Insumo compuesto).
 * - Lotes en 2 Fases: Fase A (Fermentación) y Fase B (Fracciones Fresa y Natural).
 * - 6 Clientes: con deudas entregadas, abonos parciales, compras al día y fidelización 8/10.
 * - 8 Pedidos en diversos estados (PREPARING, IN_ROUTE, DELIVERED).
 * - Movimientos de caja bimonetarios (Efectivo y Nequi).
 * - Obligación crediticia con frecuencia FLEXIBLE (abonos libres) y cuota inicial.
 * - Conversaciones y plantillas CRM WhatsApp.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 ========================================================');
  console.log('🌱 YOGURARTE - SEMILLERO DE DEMOSTRACIÓN (ONBOARDING LOCAL)');
  console.log('========================================================\n');

  // --------------------------------------------------------------------------
  // 1. USUARIOS Y CREDENCIALES RBAC
  // --------------------------------------------------------------------------
  console.log('👥 [1/9] Configurando usuarios y credenciales demo...');
  const salt = 10;
  const passAdmin = await bcrypt.hash('Admin123*', salt);
  const passPlanta = await bcrypt.hash('Planta123*', salt);
  const passReparto = await bcrypt.hash('Reparto123*', salt);
  const passEdier = await bcrypt.hash('edier123', salt);

  const users = [
    {
      name: 'Administrador General',
      username: 'admin',
      password: passAdmin,
      pin: '1234',
      role: 'ADMIN',
      phone: '3000000001',
      email: 'admin@yogurarte.com',
      bankInfo: '3000000001',
      isActive: true,
    },
    {
      name: 'Operario de Planta',
      username: 'planta',
      password: passPlanta,
      pin: '1234',
      role: 'PRODUCCION',
      phone: '3000000002',
      email: 'planta@yogurarte.com',
      bankInfo: '3000000002',
      isActive: true,
    },
    {
      name: 'Repartidor de Rutas',
      username: 'reparto',
      password: passReparto,
      pin: '1234',
      role: 'DOMICILIARIO',
      phone: '3000000003',
      email: 'reparto@yogurarte.com',
      bankInfo: '3000000003',
      isActive: true,
    },
    {
      name: 'Edier Robles',
      username: 'edier',
      password: passEdier,
      pin: '1234',
      role: 'ADMIN',
      phone: '3024581882',
      email: 'edierrobles6@gmail.com',
      bankInfo: '3024581882',
      isActive: true,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        password: u.password,
        pin: u.pin,
        role: u.role,
        phone: u.phone,
        email: u.email,
        bankInfo: u.bankInfo,
        isActive: true,
      },
      create: u,
    });
  }
  console.log('   ✓ 4 Usuarios creados (admin, planta, reparto, edier).');

  // --------------------------------------------------------------------------
  // 2. PARÁMETROS GLOBALES Y SABORES INSTITUCIONALES
  // --------------------------------------------------------------------------
  console.log('\n🎨 [2/9] Sembrando catálogo de sabores y parámetros...');
  const flavors = [
    'Natural',
    'Fresa',
    'Mora',
    'Maracuyá',
    'Guanábana',
    'Melocotón',
    'Arequipe',
    'Frutos Rojos',
  ];
  for (const name of flavors) {
    await prisma.productFlavor.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  const settings = [
    { key: 'BUSINESS_NAME', value: 'YogurArte' },
    { key: 'BUSINESS_LOCATION', value: 'Fonseca, La Guajira' },
    { key: 'PRICE_DEFAULT_1L', value: '12000' },
    { key: 'PRICE_DEFAULT_2L', value: '24000' },
    { key: 'LOYALTY_GOAL_BOTTLES', value: '10' },
    { key: 'LOYALTY_REWARD_LITERS', value: '1' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('   ✓ 8 Sabores institucionales y 6 parámetros de sistema activos.');

  // --------------------------------------------------------------------------
  // 3. COLABORADORES (STAFF)
  // --------------------------------------------------------------------------
  console.log('\n🤝 [3/9] Registrando equipo de trabajo (Staff)...');
  const staffMembers = [
    { fullName: 'Edier Robles', role: 'Maestro Yogurtero', type: 'SOCIO', phone: '3024581882' },
    { fullName: 'Yeilin Gómez', role: 'Administración y Finanzas', type: 'SOCIO', phone: '3147464663' },
    { fullName: 'Juan Repartidor', role: 'Domiciliario de Rutas', type: 'COLABORADOR', phone: '3000000003' },
  ];
  const staffMap: Record<string, any> = {};
  for (const sm of staffMembers) {
    const existing = await prisma.staffMember.findFirst({ where: { fullName: sm.fullName } });
    if (!existing) {
      staffMap[sm.fullName] = await prisma.staffMember.create({ data: sm });
    } else {
      staffMap[sm.fullName] = existing;
    }
  }
  console.log('   ✓ 3 Miembros del equipo activos.');

  // --------------------------------------------------------------------------
  // 4. INSUMOS Y RECETA MAESTRA DE MERMELADA (COMPUESTO)
  // --------------------------------------------------------------------------
  console.log('\n📦 [4/9] Sembrando insumos base y receta maestra compuesta...');
  const rawMaterialsData = [
    { code: 'LECHE', name: 'Leche Entera Cruda', category: 'MATERIA_PRIMA', unit: 'Litros', currentStock: 120, minStockAlert: 20, avgCost: 3200 },
    { code: 'AZUCAR', name: 'Azúcar Blanca Refinada', category: 'INSUMO', unit: 'Kilogramos', currentStock: 25, minStockAlert: 5, avgCost: 3800 },
    { code: 'CULTIVO', name: 'Cultivo Láctico Termófilo', category: 'INSUMO', unit: 'Gramos', currentStock: 500, minStockAlert: 50, avgCost: 120 },
    { code: 'BOTELLA_1L', name: 'Botella Pet 1 Litro', category: 'EMPAQUE', unit: 'Unidades', currentStock: 80, minStockAlert: 20, avgCost: 1200 },
    { code: 'TAPA_1L', name: 'Tapa de Seguridad 1L', category: 'EMPAQUE', unit: 'Unidades', currentStock: 100, minStockAlert: 20, avgCost: 250 },
    { code: 'ETIQUETA_1L', name: 'Etiqueta Adhesiva YogurArte 1L', category: 'EMPAQUE', unit: 'Unidades', currentStock: 150, minStockAlert: 30, avgCost: 300 },
    { code: 'FRESA_FRUTA', name: 'Fresa Fresca de Huerta', category: 'INSUMO', unit: 'Kilogramos', currentStock: 15, minStockAlert: 3, avgCost: 8000 },
  ];

  const materialMap: Record<string, any> = {};
  for (const m of rawMaterialsData) {
    materialMap[m.code] = await prisma.rawMaterial.upsert({
      where: { code: m.code },
      update: { currentStock: m.currentStock, avgCost: m.avgCost, minStockAlert: m.minStockAlert },
      create: m,
    });
  }

  // Insumo Compuesto: Mermelada Artesanal
  const mermelada = await prisma.rawMaterial.upsert({
    where: { code: 'MERMELADA_FRESA' },
    update: {
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      isCompound: true,
      recipeYield: 1.0,
      currentStock: 5.0,
      avgCost: 12000,
      minStockAlert: 2,
    },
    create: {
      code: 'MERMELADA_FRESA',
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      isCompound: true,
      recipeYield: 1.0,
      currentStock: 5.0,
      avgCost: 12000,
      minStockAlert: 2,
    },
  });

  // Vincular ingredientes en CompoundRecipeItem
  await prisma.compoundRecipeItem.deleteMany({ where: { compoundMaterialId: mermelada.id } });
  await prisma.compoundRecipeItem.create({
    data: {
      compoundMaterialId: mermelada.id,
      ingredientId: materialMap['AZUCAR'].id,
      quantity: 0.4,
      unit: 'Kilogramos',
    },
  });
  await prisma.compoundRecipeItem.create({
    data: {
      compoundMaterialId: mermelada.id,
      ingredientId: materialMap['FRESA_FRUTA'].id,
      quantity: 0.8,
      unit: 'Kilogramos',
    },
  });
  console.log('   ✓ Insumos simples e insumo compuesto Mermelada de Fresa con receta.');

  // --------------------------------------------------------------------------
  // 5. PRODUCCIÓN EN 2 FASES (LOTES Y FRACCIONAMIENTO)
  // --------------------------------------------------------------------------
  console.log('\n🍶 [5/9] Creando lotes de producción en dos fases...');

  // Lote 1: En Incubación / Fermentación (Fase A en proceso)
  const batchIncubating = await prisma.productionBatch.upsert({
    where: { batchCode: 'LOTE-DEMO-INCUBATING' },
    update: {},
    create: {
      batchCode: 'LOTE-DEMO-INCUBATING',
      milkUsedLiters: 24,
      bottles1LProduced: 0,
      bottles2LProduced: 0,
      totalLitersProduced: 26,
      yieldPercentage: 108.33,
      flavor: 'Natural',
      status: 'EN_FERMENTACION',
      cultureType: 'Cultivo Termófilo Tradicional',
      fermentationHours: 6.5,
      totalCost: 96000,
      costPerLiter: 3692,
      registeredBy: 'Operario de Planta',
    },
  });

  // Lote 2: Completado con Fraccionamiento Fase B
  const batchCompleted = await prisma.productionBatch.upsert({
    where: { batchCode: 'LOTE-DEMO-COMPLETED' },
    update: {},
    create: {
      batchCode: 'LOTE-DEMO-COMPLETED',
      milkUsedLiters: 24,
      bottles1LProduced: 25,
      bottles2LProduced: 0,
      totalLitersProduced: 26,
      yieldPercentage: 108.33,
      flavor: 'Base Natural',
      status: 'COMPLETADO',
      packagedLiters: 25,
      cultureType: 'Cultivo Termófilo Tradicional',
      fermentationHours: 8,
      totalCost: 110000,
      costPerLiter: 4230,
      registeredBy: 'Edier Robles',
    },
  });

  // Fracciones Fase B vinculadas al Lote 2
  await prisma.batchPackaging.deleteMany({ where: { batchId: batchCompleted.id } });
  const fracFresa = await prisma.batchPackaging.create({
    data: {
      packagingCode: 'FRAC-DEMO-FRESA',
      batchId: batchCompleted.id,
      flavor: 'Fresa',
      bottles1L: 15,
      bottles2L: 0,
      totalLiters: 15,
      price1L: 12000,
      packagingCost: 45000,
      packagedBy: 'Edier Robles',
      notes: 'Envasado con mermelada artesanal fresca',
    },
  });

  const fracNatural = await prisma.batchPackaging.create({
    data: {
      packagingCode: 'FRAC-DEMO-NATURAL',
      batchId: batchCompleted.id,
      flavor: 'Natural',
      bottles1L: 10,
      bottles2L: 0,
      totalLiters: 10,
      price1L: 12000,
      packagingCost: 15000,
      packagedBy: 'Edier Robles',
      notes: 'Envasado sin azúcar añadido',
    },
  });
  console.log('   ✓ Lote en fermentación y Lote completado con 2 fracciones (Fresa 15L, Natural 10L).');

  // --------------------------------------------------------------------------
  // 6. CLIENTES (AL DÍA, DEUDORES Y CON FIDELIZACIÓN)
  // --------------------------------------------------------------------------
  console.log('\n👤 [6/9] Sembrando cartera de clientes representativa...');
  const customersData = [
    {
      fullName: 'Laura Gómez',
      phone: '3001234567',
      address: 'Calle 12 # 14-20',
      neighborhood: 'Centro',
      notes: 'Cliente fiel, le encanta sabor Fresa. Acumula para premio.',
      loyaltyRedeemedCount: 0,
    },
    {
      fullName: 'Carlos Mendoza',
      phone: '3109876543',
      address: 'Carrera 8 # 5-30',
      neighborhood: 'El Bosque',
      notes: 'Paga puntual por transferencia Nequi.',
      loyaltyRedeemedCount: 1,
    },
    {
      fullName: 'Harold Lara',
      phone: '3023151169',
      address: 'Calle 18 # 7-45',
      neighborhood: 'La Guajira',
      notes: 'Pendiente de cobro en efectivo.',
      loyaltyRedeemedCount: 0,
    },
    {
      fullName: 'Arieth Robles',
      phone: '3108036284',
      address: 'Calle 4 # 11-15',
      neighborhood: 'Las Delicias',
      notes: 'Hizo abono parcial, saldo pendiente.',
      loyaltyRedeemedCount: 0,
    },
    {
      fullName: 'Ibeth Pérez',
      phone: '3028626954',
      address: 'Carrera 20 # 10-05',
      neighborhood: 'San Agustín',
      notes: 'Pedido en camino para entrega en gimnasio.',
      loyaltyRedeemedCount: 0,
    },
    {
      fullName: 'Andrés Camargo',
      phone: '3015556677',
      address: 'Manzana B Casa 4',
      neighborhood: 'Los Pinos',
      notes: 'Pedido nuevo en preparación.',
      loyaltyRedeemedCount: 0,
    },
  ];

  const customerMap: Record<string, any> = {};
  for (const c of customersData) {
    customerMap[c.fullName] = await prisma.customer.upsert({
      where: { id: (await prisma.customer.findFirst({ where: { phone: c.phone } }))?.id || 0 },
      update: c,
      create: c,
    });
  }
  console.log('   ✓ 6 Clientes registrados (al día, con deudas y en proceso).');

  // --------------------------------------------------------------------------
  // 7. PEDIDOS EN DIVERSOS ESTADOS Y FLUJO DE CARTERA
  // --------------------------------------------------------------------------
  console.log('\n🛒 [7/9] Registrando pedidos interactivos en el ciclo de vida...');

  // Limpiar pedidos anteriores del seed para evitar duplicados en local
  await prisma.orderPayment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  const now = new Date();

  // Pedido 1: Laura Gómez - 8 botellas acumuladas (Fidelización 8/10, Pagado)
  const orderLaura = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-LAURA-01',
      customerId: customerMap['Laura Gómez'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 8,
      totalLiters: 8,
      flavor: 'Fresa',
      unitPrice: 12000,
      totalAmount: 96000,
      paidAmount: 96000,
      pendingAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'NEQUI',
      deliveryStatus: 'DELIVERED',
      deliveryType: 'DOMICILIARIO',
      deliveryDate: now,
      deliveryAddress: customerMap['Laura Gómez'].address,
      registeredBy: 'Admin',
      items: {
        create: [
          {
            packagingId: fracFresa.id,
            bottleSize: '1L',
            flavor: 'Fresa',
            quantity: 8,
            litersPerUnit: 1.0,
            totalLiters: 8.0,
            unitPrice: 12000,
            totalPrice: 96000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 96000,
            paymentMethod: 'NEQUI',
            paymentDate: now,
            notes: 'Transferencia Nequi completa',
            registeredBy: 'Admin',
          },
        ],
      },
    },
  });

  // Pedido 2: Carlos Mendoza - 1L Natural Pagado
  const orderCarlos = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-CARLOS-01',
      customerId: customerMap['Carlos Mendoza'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 1,
      totalLiters: 1,
      flavor: 'Natural',
      unitPrice: 12000,
      totalAmount: 12000,
      paidAmount: 12000,
      pendingAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'EFECTIVO',
      deliveryStatus: 'DELIVERED',
      deliveryType: 'PROPIO',
      deliveryDate: now,
      deliveryAddress: customerMap['Carlos Mendoza'].address,
      registeredBy: 'Admin',
      items: {
        create: [
          {
            packagingId: fracNatural.id,
            bottleSize: '1L',
            flavor: 'Natural',
            quantity: 1,
            litersPerUnit: 1.0,
            totalLiters: 1.0,
            unitPrice: 12000,
            totalPrice: 12000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 12000,
            paymentMethod: 'EFECTIVO',
            paymentDate: now,
            notes: 'Pago en efectivo recibido',
            registeredBy: 'Admin',
          },
        ],
      },
    },
  });

  // Pedido 3: Harold Lara - Deuda Completa Pendiente ($24.000 COP)
  const orderHarold = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-HAROLD-DEBT',
      customerId: customerMap['Harold Lara'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 2,
      totalLiters: 2,
      flavor: 'Fresa',
      unitPrice: 12000,
      totalAmount: 24000,
      paidAmount: 0,
      pendingAmount: 24000,
      paymentStatus: 'PENDING',
      paymentMethod: 'EFECTIVO',
      deliveryStatus: 'DELIVERED',
      deliveryType: 'DOMICILIARIO',
      deliveryDate: now,
      deliveryAddress: customerMap['Harold Lara'].address,
      registeredBy: 'Admin',
      notes: 'Entregado a crédito por cobrar en quincena',
      items: {
        create: [
          {
            packagingId: fracFresa.id,
            bottleSize: '1L',
            flavor: 'Fresa',
            quantity: 2,
            litersPerUnit: 1.0,
            totalLiters: 2.0,
            unitPrice: 12000,
            totalPrice: 24000,
          },
        ],
      },
    },
  });

  // Pedido 4: Arieth Robles - Deuda con Abono Parcial (Total $24.000, Abonó $12.000, Debe $12.000)
  const orderArieth = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-ARIETH-PARTIAL',
      customerId: customerMap['Arieth Robles'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 2,
      totalLiters: 2,
      flavor: 'Natural',
      unitPrice: 12000,
      totalAmount: 24000,
      paidAmount: 12000,
      pendingAmount: 12000,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'EFECTIVO',
      deliveryStatus: 'DELIVERED',
      deliveryType: 'DOMICILIARIO',
      deliveryDate: now,
      deliveryAddress: customerMap['Arieth Robles'].address,
      registeredBy: 'Admin',
      notes: 'Abonó $12.000 en entrega, saldo de $12.000 pendiente',
      items: {
        create: [
          {
            packagingId: fracNatural.id,
            bottleSize: '1L',
            flavor: 'Natural',
            quantity: 2,
            litersPerUnit: 1.0,
            totalLiters: 2.0,
            unitPrice: 12000,
            totalPrice: 24000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 12000,
            paymentMethod: 'EFECTIVO',
            paymentDate: now,
            notes: 'Abono 50% al recibir',
            registeredBy: 'Repartidor de Rutas',
          },
        ],
      },
    },
  });

  // Pedido 5: Ibeth Pérez - En Ruta de Despacho (IN_ROUTE)
  const orderIbeth = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-IBETH-ROUTE',
      customerId: customerMap['Ibeth Pérez'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 1,
      totalLiters: 1,
      flavor: 'Fresa',
      unitPrice: 12000,
      totalAmount: 12000,
      paidAmount: 0,
      pendingAmount: 12000,
      paymentStatus: 'PENDING',
      paymentMethod: 'EFECTIVO',
      deliveryStatus: 'IN_ROUTE',
      deliveryType: 'DOMICILIARIO',
      deliveryAddress: customerMap['Ibeth Pérez'].address,
      registeredBy: 'Admin',
      notes: 'Llevar vuelto de $20.000',
      items: {
        create: [
          {
            packagingId: fracFresa.id,
            bottleSize: '1L',
            flavor: 'Fresa',
            quantity: 1,
            litersPerUnit: 1.0,
            totalLiters: 1.0,
            unitPrice: 12000,
            totalPrice: 12000,
          },
        ],
      },
    },
  });

  // Pedido 6: Andrés Camargo - En Preparación (PREPARING, Pagado por Nequi)
  const orderAndres = await prisma.order.create({
    data: {
      orderNumber: 'PED-DEMO-ANDRES-PREP',
      customerId: customerMap['Andrés Camargo'].id,
      batchId: batchCompleted.id,
      bottleSize: '1L',
      quantityBottles: 1,
      totalLiters: 1,
      flavor: 'Natural',
      unitPrice: 12000,
      totalAmount: 12000,
      paidAmount: 12000,
      pendingAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'NEQUI',
      deliveryStatus: 'PREPARING',
      deliveryType: 'DOMICILIARIO',
      deliveryAddress: customerMap['Andrés Camargo'].address,
      registeredBy: 'Admin',
      items: {
        create: [
          {
            packagingId: fracNatural.id,
            bottleSize: '1L',
            flavor: 'Natural',
            quantity: 1,
            litersPerUnit: 1.0,
            totalLiters: 1.0,
            unitPrice: 12000,
            totalPrice: 12000,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 12000,
            paymentMethod: 'NEQUI',
            paymentDate: now,
            notes: 'Anticipo comprobado por Nequi',
            registeredBy: 'Admin',
          },
        ],
      },
    },
  });

  console.log('   ✓ 6 Pedidos demo sembrados (2 pagados, 2 con deuda entregada, 1 en ruta, 1 en preparación).');

  // --------------------------------------------------------------------------
  // 8. FINANZAS, CAJA Y CRÉDITO FLEXIBLE
  // --------------------------------------------------------------------------
  console.log('\n💰 [8/9] Configurando balances de caja y compras a crédito...');

  // Movimientos de Caja
  await prisma.cashMovement.deleteMany({});
  await prisma.cashMovement.create({
    data: {
      type: 'BASE_INICIAL',
      amount: 50000,
      paymentMethod: 'EFECTIVO',
      concept: 'Apertura de Caja Menor (Efectivo físico)',
      notes: 'Base inicial para dar vuelto y compras menores',
      registeredBy: 'Edier Robles',
      movementDate: now,
    },
  });
  await prisma.cashMovement.create({
    data: {
      type: 'BASE_INICIAL',
      amount: 120000,
      paymentMethod: 'NEQUI',
      concept: 'Saldo Inicial en Banco / Nequi',
      notes: 'Capital de trabajo disponible en cuenta',
      registeredBy: 'Yeilin Gómez',
      movementDate: now,
    },
  });

  // Gasto Operativo
  await prisma.expense.deleteMany({});
  await prisma.expense.create({
    data: {
      category: 'INSUMOS_EXTRA',
      description: 'Bolsas biodegradables y cinta para empaque',
      amount: 15000,
      paymentMethod: 'EFECTIVO',
      supplier: 'Papelería El Éxito',
      notes: 'Compra de mostrador',
      registeredBy: 'Edier Robles',
      expenseDate: now,
    },
  });

  // Compra a Crédito con Frecuencia FLEXIBLE (Abonos libres)
  await prisma.creditPayment.deleteMany({});
  await prisma.creditObligation.deleteMany({});
  const creditMachine = await prisma.creditObligation.create({
    data: {
      title: 'Congelador Panorámico 200L',
      category: 'EQUIPO_MAQUINARIA',
      creditor: 'Refrigeración La Guajira',
      principalAmount: 1200000,
      interestRate: 0,
      totalAmount: 1200000,
      initialPayment: 200000,
      remainingBalance: 1000000,
      paymentType: 'ABONOS_LIBRES',
      frequency: 'FLEXIBLE',
      installmentAmount: 0,
      totalInstallments: null,
      paidInstallments: 1,
      startDate: now,
      status: 'ACTIVO',
      notes: 'Factura F-84920 con garantía de 12 meses. Abonos libres según flujo de caja.',
      registeredBy: 'Edier Robles',
    },
  });

  await prisma.creditPayment.create({
    data: {
      creditId: creditMachine.id,
      actionType: 'CUOTA_INICIAL',
      amount: 200000,
      paymentMethod: 'NEQUI',
      paymentDate: now,
      installmentNumber: 0,
      justification: 'Desembolso de cuota inicial por Nequi',
      registeredBy: 'Edier Robles',
    },
  });

  await prisma.expense.create({
    data: {
      category: 'INFRAESTRUCTURA',
      description: 'Cuota Inicial: Congelador Panorámico 200L (Refrigeración La Guajira)',
      amount: 200000,
      paymentMethod: 'NEQUI',
      notes: `Compra a crédito #${creditMachine.id}`,
      registeredBy: 'Edier Robles',
      expenseDate: now,
    },
  });
  console.log('   ✓ Caja bimonetaria, gasto operativo y crédito de maquinaria FLEXIBLE registrados.');

  // --------------------------------------------------------------------------
  // 9. CRM, WHATSAPP Y RESPUESTAS RÁPIDAS
  // --------------------------------------------------------------------------
  console.log('\n💬 [9/9] Inicializando módulo CRM y plantillas de chat...');

  // Plantillas de Respuestas Rápidas
  const quickReplies = [
    { shortcut: '/sabores', title: 'Sabores Disponibles', content: '¡Hola! 🥛 Hoy tenemos disponibles: Natural, Fresa con trozos, Mora silvestre y Maracuyá artesanal. ¿Cuál te gustaría pedir hoy?', category: 'VENTAS' },
    { shortcut: '/precios', title: 'Lista de Precios', content: 'Nuestros precios oficiales:\n• 1 Litro: $ 12.000 COP\n• 2 Litros: $ 24.000 COP\n¡Recuerda que con tu compra acumulas para tu botella gratis (10+1)! 🎉', category: 'INFO' },
    { shortcut: '/pago', title: 'Medios de Pago', content: 'Aceptamos Efectivo al recibir y transferencias digitales a Nequi o Bancolombia al número: 302 458 1882.', category: 'PAGOS' },
    { shortcut: '/domicilio', title: 'Horarios de Ruta', content: 'Nuestras rutas de reparto salen a las 11:30 AM y a las 4:30 PM todos los días en Fonseca. 🛵💨', category: 'GENERAL' },
  ];

  for (const qr of quickReplies) {
    await prisma.crmQuickReply.upsert({
      where: { shortcut: qr.shortcut },
      update: qr,
      create: qr,
    });
  }

  // Conversación WhatsApp Demo
  const lauraJid = '573001234567@s.whatsapp.net';
  const chatLaura = await prisma.chatConversation.upsert({
    where: { remoteJid: lauraJid },
    update: {
      unreadCount: 0,
      lastMessageText: '¡Muchas gracias! Ya llegó el pedido de fresa, está delicioso.',
      lastMessageTimestamp: now,
    },
    create: {
      remoteJid: lauraJid,
      phoneNumber: '573001234567',
      contactName: 'Laura Gómez',
      tag: 'CLIENTE_FRECUENTE',
      customerId: customerMap['Laura Gómez'].id,
      lastMessageText: '¡Muchas gracias! Ya llegó el pedido de fresa, está delicioso.',
      lastMessageTimestamp: now,
    },
  });

  await prisma.chatMessage.deleteMany({ where: { conversationId: chatLaura.id } });
  await prisma.chatMessage.create({
    data: {
      conversationId: chatLaura.id,
      messageId: 'DEMO-MSG-01',
      fromMe: true,
      senderName: 'YogurArte',
      text: '¡Hola Laura! Tu pedido PED-DEMO-LAURA-01 va en camino con nuestro domiciliario.',
      timestamp: new Date(now.getTime() - 3600000),
      status: 'READ',
    },
  });
  await prisma.chatMessage.create({
    data: {
      conversationId: chatLaura.id,
      messageId: 'DEMO-MSG-02',
      fromMe: false,
      senderName: 'Laura Gómez',
      text: '¡Muchas gracias! Ya llegó el pedido de fresa, está delicioso.',
      timestamp: now,
      status: 'DELIVERED',
    },
  });

  // Programa de compra recurrente para Laura
  await prisma.recurringSchedule.deleteMany({ where: { customerId: customerMap['Laura Gómez'].id } });
  await prisma.recurringSchedule.create({
    data: {
      customerId: customerMap['Laura Gómez'].id,
      frequencyDays: 15,
      preferredFlavor: 'Fresa',
      bottleSize: '1L',
      quantity: 2,
      nextDate: new Date(now.getTime() + 15 * 86400000),
      lastOrderDate: now,
      notes: 'Envío automático quincenal',
    },
  });

  console.log('   ✓ Conversaciones, mensajes y respuestas rápidas de CRM listos.');

  console.log('\n========================================================');
  console.log('🎉 BASE DE DATOS LOCAL POBLADA CON ÉXITO');
  console.log('   - 4 Usuarios con roles (admin, planta, reparto, edier)');
  console.log('   - 8 Sabores institucionales y 8 insumos con stock real');
  console.log('   - Receta Maestra de Mermelada Artesanal');
  console.log('   - 2 Lotes (1 en fermentación, 1 completado con fracciones)');
  console.log('   - 6 Clientes (Harold con deuda $24.000, Arieth abono $12.000, Laura 8/10)');
  console.log('   - 6 Pedidos en todo el ciclo de entrega y cobro');
  console.log('   - Caja en efectivo y digital + Crédito con frecuencia FLEXIBLE');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed de onboarding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
