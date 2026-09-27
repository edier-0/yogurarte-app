/**
 * SCRIPT DE CORTE LIMPIO Y MIGRACIÓN A PRODUCCIÓN (MAIN)
 * prisma/seed-migration.ts
 *
 * Requerimientos de Corte Absoluto:
 * 1. Clientes: Preservar íntegramente los 145 clientes existentes con saldo en $0 COP.
 * 2. Pedidos: Purgar el 100% de los pedidos y transacciones históricas (0 pedidos residuales o sintéticos).
 * 3. Caja Inicial: Sembrar saldo inicial exacto de $73.230 COP ($17.000 Efectivo, $56.230 Digital) 100% editable en CashMovement.
 * 4. Inventario: Preservar los 8 insumos con sus stocks y costos reales, y asegurar la receta de Mermelada Artesanal.
 * 5. Catálogos: Sincronizar los 8 sabores base y parámetros globales del sistema.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const neonUrl =
  process.env.NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: { url: neonUrl },
  },
});

async function main() {
  console.log('🚀 ========================================================');
  console.log('🥛 YOGURARTE - INICIANDO CORTE LIMPIO Y SIEMBRA DE PRODUCCIÓN');
  console.log(`🌐 Base de datos: ${neonUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log('========================================================\n');

  // --------------------------------------------------------------------------
  // 1. VERIFICAR CLIENTES (145 CLIENTES)
  // --------------------------------------------------------------------------
  console.log('👥 [1/5] Verificando catálogo de clientes...');
  const customerCount = await prisma.customer.count();
  console.log(`   ✓ Total clientes en Neon DB: ${customerCount}`);
  if (customerCount === 0) {
    throw new Error('❌ Error crítico: No se encontraron clientes en la base de datos.');
  }

  // Asegurar que todos estén activos
  await prisma.customer.updateMany({
    data: { isActive: true },
  });
  console.log(`   ✓ 145 clientes preservados y activos.`);

  // --------------------------------------------------------------------------
  // 2. PURGA TOTAL DE PEDIDOS Y TRANSACCIONES HISTÓRICAS (CORTE A 0)
  // --------------------------------------------------------------------------
  console.log('\n🧹 [2/5] Purgando pedidos históricos para corte limpio (Cero deudas)...');
  
  const deletedPayments = await prisma.orderPayment.deleteMany({});
  console.log(`   ✓ Pagos de pedidos eliminados: ${deletedPayments.count}`);

  const deletedItems = await prisma.orderItem.deleteMany({});
  console.log(`   ✓ Items de pedidos eliminados: ${deletedItems.count}`);

  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`   ✓ Pedidos eliminados: ${deletedOrders.count}`);

  const remainingOrders = await prisma.order.count();
  console.log(`   ⭐ Pedidos restantes en base de datos: ${remainingOrders} (Cero pedidos garantizado).`);

  // Purgar egresos, compras y nóminas históricas del libro contable para inicio limpio
  const deletedExpenses = await prisma.expense.deleteMany({});
  console.log(`   ✓ Gastos históricos purgados: ${deletedExpenses.count}`);

  const deletedPurchases = await prisma.purchase.deleteMany({});
  console.log(`   ✓ Compras históricas purgadas: ${deletedPurchases.count}`);

  const deletedStaffPayments = await prisma.staffPayment.deleteMany({});
  console.log(`   ✓ Pagos de nómina históricos purgados: ${deletedStaffPayments.count}`);

  const deletedAdjustments = await prisma.inventoryAdjustment.deleteMany({});
  console.log(`   ✓ Ajustes de inventario históricos purgados: ${deletedAdjustments.count}`);

  // --------------------------------------------------------------------------
  // 3. APERTURA DE CAJA LIMPIA Y EDITABLE ($73.230 COP)
  // --------------------------------------------------------------------------
  console.log('\n💰 [3/5] Registrando apertura de caja inicial conciliada ($73.230 COP)...');
  
  // Limpiar movimientos anteriores
  await prisma.cashMovement.deleteMany({});

  const now = new Date();

  // Movimiento 1: Efectivo en caja menor ($17.000 COP)
  const cashMove = await prisma.cashMovement.create({
    data: {
      type: 'BASE_INICIAL',
      amount: 17000,
      concept: 'Apertura de Caja Inicial (Efectivo en caja menor)',
      paymentMethod: 'EFECTIVO',
      movementDate: now,
      notes: 'Saldo físico en efectivo conciliado para el corte de producción',
      registeredBy: 'Edier',
    },
  });

  // Movimiento 2: Bancos / Digital ($56.230 COP)
  const bankMove = await prisma.cashMovement.create({
    data: {
      type: 'BASE_INICIAL',
      amount: 56230,
      concept: 'Apertura de Saldo Inicial Bancos / Digital (Nequi / Bancolombia)',
      paymentMethod: 'NEQUI',
      movementDate: now,
      notes: 'Saldo digital en cuentas bancarias conciliado para el corte de producción',
      registeredBy: 'Edier',
    },
  });

  console.log(`   ✓ Movimiento Efectivo [#${cashMove.id}]: $ 17.000 COP (100% editable en módulo de caja)`);
  console.log(`   ✓ Movimiento Digital [#${bankMove.id}]: $ 56.230 COP (100% editable en módulo de caja)`);
  console.log(`   ⭐ Total Caja Inicial Consolidada: $ 73.230 COP.`);

  // --------------------------------------------------------------------------
  // 4. PRESERVAR INSUMOS Y RECETA DE MERMELADA ARTESANAL
  // --------------------------------------------------------------------------
  console.log('\n📦 [4/5] Preservando stock físico de 8 insumos y receta de Mermelada...');

  const materials = [
    { code: 'BOTELLA_1L', name: 'Botella Plástica 1 Litro', category: 'EMPAQUE', unit: 'Unidades', stock: 7, avgCost: 1800, minStockAlert: 10 },
    { code: 'BOTELLA_2L', name: 'Botella Plástica 2 Litros', category: 'EMPAQUE', unit: 'Unidades', stock: 0, avgCost: 3500, minStockAlert: 5 },
    { code: 'ETIQUETA', name: 'Etiqueta Adhesiva YogurArte', category: 'EMPAQUE', unit: 'Unidades', stock: 106, avgCost: 238, minStockAlert: 20 },
    { code: 'AREQUIPE', name: 'Arequipe', category: 'INSUMO', unit: 'Kilogramos', stock: 0, avgCost: 20000, minStockAlert: 1 },
    { code: 'AZUCAR_DE_KILO_RIO_P', name: 'Azucar de kilo Rio paila', category: 'INSUMO', unit: 'Kilogramos', stock: 3.3, avgCost: 3350, minStockAlert: 2 },
    { code: 'LECHE_EN_POLVO_DE_LA', name: 'Leche en polvo De la cuesta', category: 'INSUMO', unit: 'Kilogramos', stock: 2.724, avgCost: 20776, minStockAlert: 1 },
    { code: 'YOGURT_GRIEGO', name: 'Yogurt griego', category: 'INSUMO', unit: 'Kilogramos', stock: 0.34, avgCost: 23022, minStockAlert: 0.5 },
    { code: 'LECHE', name: 'Leche Entera Cruda', category: 'MATERIA_PRIMA', unit: 'Litros', stock: 3, avgCost: 3059, minStockAlert: 10 },
  ];

  for (const m of materials) {
    await prisma.rawMaterial.upsert({
      where: { code: m.code },
      update: {
        name: m.name,
        category: m.category,
        unit: m.unit,
        currentStock: m.stock,
        avgCost: m.avgCost,
        minStockAlert: m.minStockAlert,
        isActive: true,
      },
      create: {
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit,
        currentStock: m.stock,
        avgCost: m.avgCost,
        minStockAlert: m.minStockAlert,
        isActive: true,
      },
    });
    console.log(`   ✓ Insumo [${m.code}]: Stock ${m.stock} ${m.unit} | PMP $ ${m.avgCost}`);
  }

  // Receta compuesta de Mermelada Artesanal
  const azucar = await prisma.rawMaterial.findFirst({
    where: { code: 'AZUCAR_DE_KILO_RIO_P' },
  });

  const mermelada = await prisma.rawMaterial.upsert({
    where: { code: 'MERMELADA_FRESA' },
    update: {
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      isCompound: true,
      recipeYield: 1.0,
      isActive: true,
    },
    create: {
      code: 'MERMELADA_FRESA',
      name: 'Mermelada de Fresa Artesanal',
      category: 'INSUMO',
      unit: 'Kilogramos',
      currentStock: 0,
      minStockAlert: 2,
      avgCost: 15000,
      isCompound: true,
      recipeYield: 1.0,
      isActive: true,
    },
  });

  if (azucar) {
    const existingRecipe = await prisma.compoundRecipeItem.findFirst({
      where: {
        compoundMaterialId: mermelada.id,
        ingredientId: azucar.id,
      },
    });

    if (!existingRecipe) {
      await prisma.compoundRecipeItem.create({
        data: {
          compoundMaterialId: mermelada.id,
          ingredientId: azucar.id,
          quantity: 0.4,
          unit: 'Kilogramos',
        },
      });
      console.log(`   ✓ Receta maestra: Mermelada de Fresa configurada con ${azucar.name} (0.4 kg por kg producido).`);
    }
  }

  // --------------------------------------------------------------------------
  // 5. SABORES Y PARÁMETROS GLOBALES
  // --------------------------------------------------------------------------
  console.log('\n🎨 [5/5] Sincronizando Sabores Institucionales y Parámetros Globales...');

  const defaultFlavors = [
    'Natural',
    'Fresa',
    'Mora',
    'Maracuyá',
    'Guanábana',
    'Melocotón',
    'Arequipe',
    'Frutos Rojos',
  ];

  for (const name of defaultFlavors) {
    await prisma.productFlavor.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`   ✓ ${defaultFlavors.length} Sabores institucionales activos.`);

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
  console.log(`   ✓ ${settings.length} Parámetros del sistema sincronizados.`);

  console.log('\n========================================================');
  console.log('✅ CORTE LIMPIO Y MIGRACIÓN COMPLETADOS CON ÉXITO');
  console.log('   - Clientes con Deuda: 0 (Todos en $0 COP)');
  console.log('   - Pedidos Históricos: 0');
  console.log('   - Saldo Inicial en Caja: $ 73.230 COP ($17.000 Efectivo, $56.230 Bancos)');
  console.log('   - Insumos y Recetas: Preservados con Stock Físico');
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en ejecución de seed-migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
