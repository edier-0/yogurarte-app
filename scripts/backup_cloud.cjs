/**
 * Script de Respaldo de Base de Datos en la Nube (Neon.tech / PostgreSQL)
 * Guarda una copia completa con todos los datos en la carpeta backups/
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const neonUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: neonUrl,
    },
  },
});

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

async function runBackup() {
  console.log('📡 Conectando a la base de datos para generar copia de seguridad...');
  
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = getTimestamp();
  const filename = `backup_cloud_yogurarte_${timestamp}.sql`;
  const filepath = path.join(backupDir, filename);

  const [
    users,
    customers,
    rawMaterials,
    preparations,
    prepItems,
    purchases,
    batches,
    batchUsages,
    adjustments,
    orders,
    orderItems,
    orderPayments,
    expenses,
    creditObligations,
    creditPayments,
    cashMovements,
    staff,
    staffPayments,
    settings,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.rawMaterial.findMany(),
    prisma.supplyPreparation.findMany(),
    prisma.supplyPreparationItem.findMany(),
    prisma.purchase.findMany(),
    prisma.productionBatch.findMany(),
    prisma.batchItemUsage.findMany(),
    prisma.inventoryAdjustment.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.orderPayment.findMany(),
    prisma.expense.findMany(),
    prisma.creditObligation.findMany(),
    prisma.creditPayment.findMany(),
    prisma.cashMovement.findMany(),
    prisma.staffMember.findMany(),
    prisma.staffPayment.findMany(),
    prisma.systemSetting.findMany(),
  ]);

  const escapeSql = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (val instanceof Date) return `'${val.toISOString()}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  let sql = `-- ========================================================\n`;
  sql += `-- COPIA DE SEGURIDAD YOGURARTE (CLOUD NEON.TECH / POSTGRESQL)\n`;
  sql += `-- FECHA: ${new Date().toLocaleString('es-CO')}\n`;
  sql += `-- ========================================================\n\n`;

  const tablesData = [
    { name: 'User', rows: users, pk: 'id' },
    { name: 'Customer', rows: customers, pk: 'id' },
    { name: 'RawMaterial', rows: rawMaterials, pk: 'id' },
    { name: 'SupplyPreparation', rows: preparations, pk: 'id' },
    { name: 'SupplyPreparationItem', rows: prepItems, pk: 'id' },
    { name: 'Purchase', rows: purchases, pk: 'id' },
    { name: 'ProductionBatch', rows: batches, pk: 'id' },
    { name: 'BatchItemUsage', rows: batchUsages, pk: 'id' },
    { name: 'InventoryAdjustment', rows: adjustments, pk: 'id' },
    { name: 'Order', rows: orders, pk: 'id' },
    { name: 'OrderItem', rows: orderItems, pk: 'id' },
    { name: 'OrderPayment', rows: orderPayments, pk: 'id' },
    { name: 'Expense', rows: expenses, pk: 'id' },
    { name: 'CreditObligation', rows: creditObligations, pk: 'id' },
    { name: 'CreditPayment', rows: creditPayments, pk: 'id' },
    { name: 'CashMovement', rows: cashMovements, pk: 'id' },
    { name: 'StaffMember', rows: staff, pk: 'id' },
    { name: 'StaffPayment', rows: staffPayments, pk: 'id' },
    { name: 'SystemSetting', rows: settings, pk: 'key' },
  ];

  for (const { name, rows, pk } of tablesData) {
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    sql += `-- Tabla: ${name} (${rows.length} registros)\n`;
    for (const row of rows) {
      const values = cols.map((c) => escapeSql(row[c])).join(', ');
      sql += `INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${values}) ON CONFLICT ("${pk}") DO UPDATE SET ${cols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
    }
    if (pk === 'id') {
      sql += `SELECT setval(pg_get_serial_sequence('"${name}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${name}";\n\n`;
    } else {
      sql += `\n`;
    }
  }

  fs.writeFileSync(filepath, sql, 'utf8');

  console.log(`\n✅ ¡Copia de seguridad guardada exitosamente!`);
  console.log(`📁 Archivo: ${filepath}`);
  console.log(`📊 Resumen respaldado:`);
  console.log(`   - 👥 Clientes: ${customers.length}`);
  console.log(`   - 📋 Pedidos: ${orders.length}`);
  console.log(`   - 🍶 Lotes: ${batches.length}`);
  console.log(`   - 🛒 Compras: ${purchases.length}`);
  console.log(`   - 🏗️ Gastos / Infraestructura: ${expenses.length}`);
  console.log(`   - 💰 Movimientos de Caja: ${cashMovements.length}`);
  console.log(`   - 🤝 Pagos de Nómina/Retiros: ${staffPayments.length}`);
}

runBackup()
  .catch((err) => {
    console.error('❌ Error al generar la copia de seguridad:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
