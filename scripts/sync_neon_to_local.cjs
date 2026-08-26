/**
 * Script para sincronizar y descargar los datos más recientes de Neon.tech a la base de datos local
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const neonUrl = 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const localUrl = 'postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=public';

const neonPrisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });
const localPrisma = new PrismaClient({ datasources: { db: { url: localUrl } } });

async function syncNeonToLocal() {
  console.log('🔄 Conectando a Neon.tech y a la Base de Datos Local...\n');

  // 1. Users
  const users = await neonPrisma.user.findMany();
  console.log(`👤 Sincronizando ${users.length} Usuarios...`);
  for (const u of users) {
    await localPrisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }

  // 2. Customers
  const customers = await neonPrisma.customer.findMany();
  console.log(`👥 Sincronizando ${customers.length} Clientes...`);
  for (const c of customers) {
    await localPrisma.customer.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // 3. RawMaterials
  const rawMaterials = await neonPrisma.rawMaterial.findMany();
  console.log(`📦 Sincronizando ${rawMaterials.length} Materias Primas / Insumos...`);
  for (const rm of rawMaterials) {
    await localPrisma.rawMaterial.upsert({ where: { id: rm.id }, update: rm, create: rm });
  }

  // 4. SupplyPreparations
  const preps = await neonPrisma.supplyPreparation.findMany();
  console.log(`🍯 Sincronizando ${preps.length} Preparaciones de Insumos...`);
  for (const p of preps) {
    await localPrisma.supplyPreparation.upsert({ where: { id: p.id }, update: p, create: p });
  }

  // 5. SupplyPreparationItems
  const prepItems = await neonPrisma.supplyPreparationItem.findMany();
  console.log(`🥄 Sincronizando ${prepItems.length} Ítems Usados en Preparaciones...`);
  for (const pi of prepItems) {
    await localPrisma.supplyPreparationItem.upsert({ where: { id: pi.id }, update: pi, create: pi });
  }

  // 6. Purchases
  const purchases = await neonPrisma.purchase.findMany();
  console.log(`🛒 Sincronizando ${purchases.length} Compras de Materia Prima...`);
  for (const pur of purchases) {
    await localPrisma.purchase.upsert({ where: { id: pur.id }, update: pur, create: pur });
  }

  // 7. ProductionBatches
  const batches = await neonPrisma.productionBatch.findMany();
  console.log(`🍶 Sincronizando ${batches.length} Lotes de Producción...`);
  for (const b of batches) {
    await localPrisma.productionBatch.upsert({ where: { id: b.id }, update: b, create: b });
  }

  // 8. BatchItemUsages
  const batchUsages = await neonPrisma.batchItemUsage.findMany();
  console.log(`🥛 Sincronizando ${batchUsages.length} Insumos Usados en Lotes...`);
  for (const bu of batchUsages) {
    await localPrisma.batchItemUsage.upsert({ where: { id: bu.id }, update: bu, create: bu });
  }

  // 9. InventoryAdjustments
  const adjustments = await neonPrisma.inventoryAdjustment.findMany();
  console.log(`⚖️ Sincronizando ${adjustments.length} Ajustes de Inventario...`);
  for (const adj of adjustments) {
    await localPrisma.inventoryAdjustment.upsert({ where: { id: adj.id }, update: adj, create: adj });
  }

  // 10. Orders
  const orders = await neonPrisma.order.findMany();
  console.log(`📋 Sincronizando ${orders.length} Pedidos...`);
  for (const o of orders) {
    await localPrisma.order.upsert({ where: { id: o.id }, update: o, create: o });
  }

  // 11. OrderItems
  const orderItems = await neonPrisma.orderItem.findMany();
  console.log(`🏷️ Sincronizando ${orderItems.length} Ítems de Pedidos...`);
  for (const oi of orderItems) {
    await localPrisma.orderItem.upsert({ where: { id: oi.id }, update: oi, create: oi });
  }

  // 12. OrderPayments
  const orderPayments = await neonPrisma.orderPayment.findMany();
  console.log(`💵 Sincronizando ${orderPayments.length} Pagos/Abonos de Pedidos...`);
  for (const op of orderPayments) {
    await localPrisma.orderPayment.upsert({ where: { id: op.id }, update: op, create: op });
  }

  // 13. Expenses
  const expenses = await neonPrisma.expense.findMany();
  console.log(`🏗️ Sincronizando ${expenses.length} Gastos (Infraestructura, etc.)...`);
  for (const ex of expenses) {
    await localPrisma.expense.upsert({ where: { id: ex.id }, update: ex, create: ex });
  }

  // 14. CreditObligations
  const creditObligations = await neonPrisma.creditObligation.findMany();
  console.log(`📑 Sincronizando ${creditObligations.length} Créditos / Obligaciones...`);
  for (const co of creditObligations) {
    await localPrisma.creditObligation.upsert({ where: { id: co.id }, update: co, create: co });
  }

  // 15. CreditPayments
  const creditPayments = await neonPrisma.creditPayment.findMany();
  console.log(`💳 Sincronizando ${creditPayments.length} Pagos de Cuotas de Crédito...`);
  for (const cp of creditPayments) {
    await localPrisma.creditPayment.upsert({ where: { id: cp.id }, update: cp, create: cp });
  }

  // 16. CashMovements
  const cashMovements = await neonPrisma.cashMovement.findMany();
  console.log(`💰 Sincronizando ${cashMovements.length} Movimientos de Caja...`);
  for (const cm of cashMovements) {
    await localPrisma.cashMovement.upsert({ where: { id: cm.id }, update: cm, create: cm });
  }

  // 17. StaffMembers
  const staff = await neonPrisma.staffMember.findMany();
  console.log(`🤝 Sincronizando ${staff.length} Integrantes / Socios...`);
  for (const s of staff) {
    await localPrisma.staffMember.upsert({ where: { id: s.id }, update: s, create: s });
  }

  // 18. StaffPayments
  const staffPayments = await neonPrisma.staffPayment.findMany();
  console.log(`💳 Sincronizando ${staffPayments.length} Pagos de Nómina / Retiros...`);
  for (const sp of staffPayments) {
    await localPrisma.staffPayment.upsert({ where: { id: sp.id }, update: sp, create: sp });
  }

  // 19. SystemSettings
  const settings = await neonPrisma.systemSetting.findMany();
  console.log(`⚙️ Sincronizando ${settings.length} Configuraciones del Sistema...`);
  for (const set of settings) {
    await localPrisma.systemSetting.upsert({ where: { key: set.key }, update: set, create: set });
  }

  // 20. Actualizar secuencias locales
  console.log('\n🔢 Sincronizando secuencias de IDs en la base de datos local...');
  const tables = [
    'User',
    'Customer',
    'RawMaterial',
    'SupplyPreparation',
    'SupplyPreparationItem',
    'Purchase',
    'ProductionBatch',
    'BatchItemUsage',
    'InventoryAdjustment',
    'Order',
    'OrderItem',
    'OrderPayment',
    'Expense',
    'CreditObligation',
    'CreditPayment',
    'CashMovement',
    'StaffMember',
    'StaffPayment',
  ];

  for (const table of tables) {
    try {
      await localPrisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${table}";`
      );
    } catch (e) {
      console.warn(`Aviso en secuencia local ${table}:`, e.message);
    }
  }

  console.log('\n🎉 ¡SINCRONIZACIÓN EXITOSA! La base de datos local tiene todos los datos más recientes de Neon.tech.');
}

syncNeonToLocal()
  .catch((err) => {
    console.error('❌ Error al sincronizar datos a local:', err);
    process.exit(1);
  })
  .finally(async () => {
    await neonPrisma.$disconnect();
    await localPrisma.$disconnect();
  });
