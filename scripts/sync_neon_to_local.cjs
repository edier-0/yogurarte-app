/**
 * Script para sincronizar y clonar los datos más recientes de Neon.tech a la base de datos local
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// ==============================================================================
// 🚨 ADVERTENCIA DE SEGURIDAD (DIRECTIVA ESTRICTA YOGURARTE):
// QUEDA TERMINANTEMENTE PROHIBIDO COLOCAR CREDENCIALES O STRINGS DE CONEXIÓN
// HARDCODEADOS EN ESTE ARCHIVO (INCLUYENDO VALORES POR DEFECTO O FALLBACKS '||').
// Todas las conexiones deben suministrarse ÚNICAMENTE mediante variables de
// entorno (.env / NEON_DATABASE_URL) que NUNCA deben subirse a Git.
// ==============================================================================
const neonUrl = process.env.NEON_DATABASE_URL;
if (!neonUrl) {
  console.error('\n❌ ERROR DE SEGURIDAD: La variable NEON_DATABASE_URL no está configurada en .env.');
  console.error('   Está terminantemente prohibido hardcodear credenciales en el código fuente.\n');
  process.exit(1);
}
const localUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
if (!localUrl) {
  console.error('\n❌ ERROR: Ni LOCAL_DATABASE_URL ni DATABASE_URL están configuradas en .env.\n');
  process.exit(1);
}

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
      "SystemWhatsAppTemplate",
      "OrderPayment",
      "OrderItem",
      "Order",
      "BatchDischarge",
      "BatchPackagingItem",
      "BatchPackaging",
      "BatchItemUsage",
      "ProductionBatch",
      "RecipeStep",
      "RecipeIngredient",
      "Recipe",
      "ProductPresentation",
      "ProductFlavor",
      "InventoryAdjustment",
      "Purchase",
      "SupplyPreparationItem",
      "SupplyPreparation",
      "CompoundRecipeItem",
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

  // 2. StaffMembers
  const staff = await neonPrisma.staffMember.findMany();
  await batchInsert(localPrisma.staffMember, staff);
  console.log(`🤝 Sincronizados ${staff.length} Integrantes / Socios`);

  // 3. StaffPayments
  const staffPayments = await neonPrisma.staffPayment.findMany();
  await batchInsert(localPrisma.staffPayment, staffPayments);
  console.log(`💳 Sincronizados ${staffPayments.length} Pagos de Personal / Retiros`);

  // 4. Customers
  const customers = await neonPrisma.customer.findMany();
  await batchInsert(localPrisma.customer, customers);
  console.log(`👥 Sincronizados ${customers.length} Clientes`);

  // 5. RawMaterials
  const rawMaterials = await neonPrisma.rawMaterial.findMany();
  await batchInsert(localPrisma.rawMaterial, rawMaterials);
  console.log(`📦 Sincronizados ${rawMaterials.length} Materias Primas / Insumos`);

  // 6. CompoundRecipeItem
  const compoundItems = await neonPrisma.compoundRecipeItem.findMany();
  await batchInsert(localPrisma.compoundRecipeItem, compoundItems);
  console.log(`🧩 Sincronizados ${compoundItems.length} Ítems de Recetas Compuestas`);

  // 7. SupplyPreparations
  const preps = await neonPrisma.supplyPreparation.findMany();
  await batchInsert(localPrisma.supplyPreparation, preps);
  console.log(`🍯 Sincronizadas ${preps.length} Preparaciones de Insumos`);

  // 8. SupplyPreparationItems
  const prepItems = await neonPrisma.supplyPreparationItem.findMany();
  await batchInsert(localPrisma.supplyPreparationItem, prepItems);
  console.log(`🥄 Sincronizados ${prepItems.length} Ítems de Preparación`);

  // 9. Purchases
  const purchases = await neonPrisma.purchase.findMany();
  await batchInsert(localPrisma.purchase, purchases);
  console.log(`🛒 Sincronizadas ${purchases.length} Compras`);

  // 10. InventoryAdjustments
  const adjustments = await neonPrisma.inventoryAdjustment.findMany();
  await batchInsert(localPrisma.inventoryAdjustment, adjustments);
  console.log(`⚖️ Sincronizados ${adjustments.length} Ajustes de Inventario`);

  // 11. ProductFlavors
  const flavors = await neonPrisma.productFlavor.findMany();
  await batchInsert(localPrisma.productFlavor, flavors);
  console.log(`🍓 Sincronizados ${flavors.length} Sabores`);

  // 12. ProductPresentations
  const presentations = await neonPrisma.productPresentation.findMany();
  await batchInsert(localPrisma.productPresentation, presentations);
  console.log(`🍾 Sincronizadas ${presentations.length} Presentaciones`);

  // 13. Recipes
  const recipes = await neonPrisma.recipe.findMany();
  await batchInsert(localPrisma.recipe, recipes);
  console.log(`📖 Sincronizadas ${recipes.length} Recetas`);

  // 14. RecipeIngredients
  const ingredients = await neonPrisma.recipeIngredient.findMany();
  await batchInsert(localPrisma.recipeIngredient, ingredients);
  console.log(`🧂 Sincronizados ${ingredients.length} Ingredientes de Recetas`);

  // 15. RecipeSteps
  const steps = await neonPrisma.recipeStep.findMany();
  await batchInsert(localPrisma.recipeStep, steps);
  console.log(`📋 Sincronizados ${steps.length} Pasos de Recetas`);

  // 16. ProductionBatches (Fase A)
  const batches = await neonPrisma.productionBatch.findMany();
  await batchInsert(localPrisma.productionBatch, batches);
  console.log(`🍶 Sincronizados ${batches.length} Lotes de Producción (Fase A)`);

  // 17. BatchPackagings (Fase B)
  const packagings = await neonPrisma.batchPackaging.findMany();
  await batchInsert(localPrisma.batchPackaging, packagings);
  console.log(`📦 Sincronizadas ${packagings.length} Fracciones Envasadas (Fase B)`);

  // 18. BatchPackagingItems
  const packagingItems = await neonPrisma.batchPackagingItem.findMany();
  await batchInsert(localPrisma.batchPackagingItem, packagingItems);
  console.log(`🏷️ Sincronizados ${packagingItems.length} Insumos de Envasado`);

  // 19. BatchDischarges
  const discharges = await neonPrisma.batchDischarge.findMany();
  await batchInsert(localPrisma.batchDischarge, discharges);
  console.log(`📤 Sincronizadas ${discharges.length} Salidas / Bajas de Lotes`);

  // 20. BatchItemUsages
  const batchUsages = await neonPrisma.batchItemUsage.findMany();
  await batchInsert(localPrisma.batchItemUsage, batchUsages);
  console.log(`🥛 Sincronizados ${batchUsages.length} Insumos Usados en Lotes`);

  // 21. Orders
  const orders = await neonPrisma.order.findMany();
  await batchInsert(localPrisma.order, orders);
  console.log(`📋 Sincronizados ${orders.length} Pedidos`);

  // 22. OrderItems
  const orderItems = await neonPrisma.orderItem.findMany();
  await batchInsert(localPrisma.orderItem, orderItems);
  console.log(`🏷️ Sincronizados ${orderItems.length} Ítems de Pedidos`);

  // 23. OrderPayments
  const orderPayments = await neonPrisma.orderPayment.findMany();
  await batchInsert(localPrisma.orderPayment, orderPayments);
  console.log(`💵 Sincronizados ${orderPayments.length} Pagos de Pedidos`);

  // 24. Expenses
  const expenses = await neonPrisma.expense.findMany();
  await batchInsert(localPrisma.expense, expenses);
  console.log(`🏗️ Sincronizados ${expenses.length} Gastos Generales`);

  // 25. CashMovements
  const cashMovements = await neonPrisma.cashMovement.findMany();
  await batchInsert(localPrisma.cashMovement, cashMovements);
  console.log(`💰 Sincronizados ${cashMovements.length} Movimientos de Caja`);

  // 26. CreditObligations
  const creditObligations = await neonPrisma.creditObligation.findMany();
  await batchInsert(localPrisma.creditObligation, creditObligations);
  console.log(`📑 Sincronizadas ${creditObligations.length} Obligaciones de Crédito`);

  // 27. CreditPayments
  const creditPayments = await neonPrisma.creditPayment.findMany();
  await batchInsert(localPrisma.creditPayment, creditPayments);
  console.log(`💳 Sincronizados ${creditPayments.length} Pagos de Créditos`);

  // 28. SystemSettings
  const settings = await neonPrisma.systemSetting.findMany();
  await batchInsert(localPrisma.systemSetting, settings);
  console.log(`⚙️ Sincronizadas ${settings.length} Configuraciones del Sistema`);

  // 29. ChatConversations
  const conversations = await neonPrisma.chatConversation.findMany();
  await batchInsert(localPrisma.chatConversation, conversations);
  console.log(`💬 Sincronizadas ${conversations.length} Conversaciones CRM`);

  // 30. ChatMessages
  const messages = await neonPrisma.chatMessage.findMany();
  await batchInsert(localPrisma.chatMessage, messages);
  console.log(`📨 Sincronizados ${messages.length} Mensajes de WhatsApp`);

  // 31. WhatsAppAuthSession
  const authSessions = await neonPrisma.whatsAppAuthSession.findMany();
  await batchInsert(localPrisma.whatsAppAuthSession, authSessions);
  console.log(`🔑 Sincronizadas ${authSessions.length} Claves de Sesión WhatsApp`);

  // 32. RecurringSchedules
  const recurringSchedules = await neonPrisma.recurringSchedule.findMany();
  await batchInsert(localPrisma.recurringSchedule, recurringSchedules);
  console.log(`🔁 Sincronizados ${recurringSchedules.length} Pedidos Recurrentes`);

  // 33. CrmQuickReplies
  const quickReplies = await neonPrisma.crmQuickReply.findMany();
  await batchInsert(localPrisma.crmQuickReply, quickReplies);
  console.log(`⚡ Sincronizadas ${quickReplies.length} Respuestas Rápidas`);

  // 34. SystemWhatsAppTemplates
  const templates = await neonPrisma.systemWhatsAppTemplate.findMany();
  await batchInsert(localPrisma.systemWhatsAppTemplate, templates);
  console.log(`📄 Sincronizadas ${templates.length} Plantillas de WhatsApp`);

  // 35. Actualizar secuencias locales
  console.log('\n🔢 Sincronizando secuencias de IDs en la base de datos local...');
  const autoincrementTables = [
    'User',
    'Customer',
    'RawMaterial',
    'CompoundRecipeItem',
    'SupplyPreparation',
    'SupplyPreparationItem',
    'Purchase',
    'InventoryAdjustment',
    'ProductFlavor',
    'ProductPresentation',
    'Recipe',
    'RecipeIngredient',
    'RecipeStep',
    'ProductionBatch',
    'BatchPackaging',
    'BatchPackagingItem',
    'BatchDischarge',
    'BatchItemUsage',
    'StaffMember',
    'StaffPayment',
    'Order',
    'OrderItem',
    'OrderPayment',
    'Expense',
    'CashMovement',
    'CreditObligation',
    'CreditPayment',
    'SystemSetting',
    'ChatMessage',
    'WhatsAppAuthSession',
    'CrmQuickReply',
    'SystemWhatsAppTemplate',
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
