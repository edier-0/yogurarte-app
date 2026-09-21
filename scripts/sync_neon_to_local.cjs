/**
 * Script para sincronizar y clonar los datos más recientes de Neon.tech a la base de datos local
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const localUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/yogurarte_db?schema=public';

const neonPrisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });
const localPrisma = new PrismaClient({ datasources: { db: { url: localUrl } } });

async function batchInsert(modelClient, items, chunkSize = 500) {
  if (!items || items.length === 0) return 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await modelClient.createMany({ data: chunk });
  }
  return items.length;
}

async function syncNeonToLocal() {
  console.log('🔄 Conectando a Neon.tech y a la Base de Datos Local...\n');

  // 1. Limpiar tablas locales para garantizar una réplica 100% fiel sin inconsistencias de llaves foráneas
  console.log('🧹 Limpiando tablas locales antes de la sincronización...');
  await localPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "ChatMessage",
      "ChatConversation",
      "WhatsAppAuthSession",
      "RecurringSchedule",
      "CrmQuickReply",
      "OrderPayment",
      "OrderItem",
      "Order",
      "BatchDischarge",
      "BatchItemUsage",
      "ProductionBatch",
      "InventoryAdjustment",
      "Purchase",
      "SupplyPreparationItem",
      "SupplyPreparation",
      "RawMaterial",
      "CreditPayment",
      "CreditObligation",
      "CashMovement",
      "StaffPayment",
      "StaffMember",
      "Expense",
      "Customer",
      "User",
      "SystemSetting"
    CASCADE;
  `);

  console.log('📥 Descargando e insertando datos desde Neon.tech en orden de dependencias...\n');

  // 1. Users
  const users = await neonPrisma.user.findMany();
  await batchInsert(localPrisma.user, users);
  console.log(`👤 Sincronizados ${users.length} Usuarios`);

  // 2. Customers
  const customers = await neonPrisma.customer.findMany();
  await batchInsert(localPrisma.customer, customers);
  console.log(`👥 Sincronizados ${customers.length} Clientes`);

  // 3. RawMaterials
  const rawMaterials = await neonPrisma.rawMaterial.findMany();
  await batchInsert(localPrisma.rawMaterial, rawMaterials);
  console.log(`📦 Sincronizados ${rawMaterials.length} Materias Primas / Insumos`);

  // 4. SupplyPreparations
  const preps = await neonPrisma.supplyPreparation.findMany();
  await batchInsert(localPrisma.supplyPreparation, preps);
  console.log(`🍯 Sincronizadas ${preps.length} Preparaciones de Insumos`);

  // 5. SupplyPreparationItems
  const prepItems = await neonPrisma.supplyPreparationItem.findMany();
  await batchInsert(localPrisma.supplyPreparationItem, prepItems);
  console.log(`🥄 Sincronizados ${prepItems.length} Ítems de Preparación`);

  // 6. Purchases
  const purchases = await neonPrisma.purchase.findMany();
  await batchInsert(localPrisma.purchase, purchases);
  console.log(`🛒 Sincronizadas ${purchases.length} Compras`);

  // 7. InventoryAdjustments
  const adjustments = await neonPrisma.inventoryAdjustment.findMany();
  await batchInsert(localPrisma.inventoryAdjustment, adjustments);
  console.log(`⚖️ Sincronizados ${adjustments.length} Ajustes de Inventario`);

  // 8. ProductionBatches
  const batches = await neonPrisma.productionBatch.findMany();
  await batchInsert(localPrisma.productionBatch, batches);
  console.log(`🍶 Sincronizados ${batches.length} Lotes de Producción`);

  // 9. StaffMembers
  const staff = await neonPrisma.staffMember.findMany();
  await batchInsert(localPrisma.staffMember, staff);
  console.log(`🤝 Sincronizados ${staff.length} Integrantes / Socios`);

  // 10. StaffPayments
  const staffPayments = await neonPrisma.staffPayment.findMany();
  await batchInsert(localPrisma.staffPayment, staffPayments);
  console.log(`💳 Sincronizados ${staffPayments.length} Pagos de Personal / Retiros`);

  // 11. BatchDischarges
  const discharges = await neonPrisma.batchDischarge.findMany();
  await batchInsert(localPrisma.batchDischarge, discharges);
  console.log(`📦 Sincronizadas ${discharges.length} Salidas / Bajas de Lotes`);

  // 12. BatchItemUsages
  const batchUsages = await neonPrisma.batchItemUsage.findMany();
  await batchInsert(localPrisma.batchItemUsage, batchUsages);
  console.log(`🥛 Sincronizados ${batchUsages.length} Insumos Usados en Lotes`);

  // 13. Orders
  const orders = await neonPrisma.order.findMany();
  await batchInsert(localPrisma.order, orders);
  console.log(`📋 Sincronizados ${orders.length} Pedidos`);

  // 14. OrderItems
  const orderItems = await neonPrisma.orderItem.findMany();
  await batchInsert(localPrisma.orderItem, orderItems);
  console.log(`🏷️ Sincronizados ${orderItems.length} Ítems de Pedidos`);

  // 15. OrderPayments
  const orderPayments = await neonPrisma.orderPayment.findMany();
  await batchInsert(localPrisma.orderPayment, orderPayments);
  console.log(`💵 Sincronizados ${orderPayments.length} Pagos de Pedidos`);

  // 16. Expenses
  const expenses = await neonPrisma.expense.findMany();
  await batchInsert(localPrisma.expense, expenses);
  console.log(`🏗️ Sincronizados ${expenses.length} Gastos Generales`);

  // 17. CashMovements
  const cashMovements = await neonPrisma.cashMovement.findMany();
  await batchInsert(localPrisma.cashMovement, cashMovements);
  console.log(`💰 Sincronizados ${cashMovements.length} Movimientos de Caja`);

  // 18. CreditObligations
  const creditObligations = await neonPrisma.creditObligation.findMany();
  await batchInsert(localPrisma.creditObligation, creditObligations);
  console.log(`📑 Sincronizadas ${creditObligations.length} Obligaciones de Crédito`);

  // 19. CreditPayments
  const creditPayments = await neonPrisma.creditPayment.findMany();
  await batchInsert(localPrisma.creditPayment, creditPayments);
  console.log(`💳 Sincronizados ${creditPayments.length} Pagos de Créditos`);

  // 20. SystemSettings
  const settings = await neonPrisma.systemSetting.findMany();
  await batchInsert(localPrisma.systemSetting, settings);
  console.log(`⚙️ Sincronizadas ${settings.length} Configuraciones del Sistema`);

  // 21. ChatConversations
  const conversations = await neonPrisma.chatConversation.findMany();
  await batchInsert(localPrisma.chatConversation, conversations);
  console.log(`💬 Sincronizadas ${conversations.length} Conversaciones CRM`);

  // 22. ChatMessages
  const messages = await neonPrisma.chatMessage.findMany();
  await batchInsert(localPrisma.chatMessage, messages);
  console.log(`📨 Sincronizados ${messages.length} Mensajes de WhatsApp`);

  // 23. WhatsAppAuthSession
  const authSessions = await neonPrisma.whatsAppAuthSession.findMany();
  await batchInsert(localPrisma.whatsAppAuthSession, authSessions);
  console.log(`🔑 Sincronizadas ${authSessions.length} Claves de Sesión WhatsApp`);

  // 24. RecurringSchedules
  const recurringSchedules = await neonPrisma.recurringSchedule.findMany();
  await batchInsert(localPrisma.recurringSchedule, recurringSchedules);
  console.log(`🔁 Sincronizados ${recurringSchedules.length} Pedidos Recurrentes`);

  // 25. CrmQuickReplies
  const quickReplies = await neonPrisma.crmQuickReply.findMany();
  await batchInsert(localPrisma.crmQuickReply, quickReplies);
  console.log(`⚡ Sincronizadas ${quickReplies.length} Respuestas Rápidas`);

  // 26. Actualizar secuencias locales
  console.log('\n🔢 Sincronizando secuencias de IDs en la base de datos local...');
  const autoincrementTables = [
    'User',
    'Customer',
    'RawMaterial',
    'SupplyPreparation',
    'SupplyPreparationItem',
    'Purchase',
    'InventoryAdjustment',
    'ProductionBatch',
    'StaffMember',
    'StaffPayment',
    'BatchDischarge',
    'BatchItemUsage',
    'Order',
    'OrderItem',
    'OrderPayment',
    'Expense',
    'CashMovement',
    'CreditObligation',
    'CreditPayment',
    'ChatConversation',
    'ChatMessage',
    'RecurringSchedule',
    'CrmQuickReply',
  ];

  for (const table of autoincrementTables) {
    try {
      await localPrisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${table}";`
      );
    } catch (e) {
      console.warn(`Aviso en secuencia local ${table}:`, e.message);
    }
  }

  console.log('\n🎉 ¡CLONACIÓN Y SINCRONIZACIÓN EXITOSA!');
  console.log('La base de datos local es ahora un clon exacto de Neon.tech con todos los modelos y secuencias actualizados.');
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
