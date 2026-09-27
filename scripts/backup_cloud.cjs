/**
 * Script de Respaldo de Base de Datos en la Nube (Neon.tech / PostgreSQL)
 * Guarda una copia completa con todos los datos en la carpeta backups/
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

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
  console.log('📡 Conectando a Neon.tech para generar copia de seguridad completa...');
  
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = getTimestamp();
  const filename = `backup_cloud_yogurarte_${timestamp}.sql`;
  const filepath = path.join(backupDir, filename);

  const tableDefs = [
    { name: 'User', pk: 'id' },
    { name: 'Customer', pk: 'id' },
    { name: 'ProductFlavor', pk: 'id' },
    { name: 'RawMaterial', pk: 'id' },
    { name: 'CompoundRecipeItem', pk: 'id' },
    { name: 'SupplyPreparation', pk: 'id' },
    { name: 'SupplyPreparationItem', pk: 'id' },
    { name: 'Purchase', pk: 'id' },
    { name: 'InventoryAdjustment', pk: 'id' },
    { name: 'ProductionBatch', pk: 'id' },
    { name: 'BatchPackaging', pk: 'id' },
    { name: 'BatchPackagingItem', pk: 'id' },
    { name: 'StaffMember', pk: 'id' },
    { name: 'StaffPayment', pk: 'id' },
    { name: 'BatchDischarge', pk: 'id' },
    { name: 'BatchItemUsage', pk: 'id' },
    { name: 'Order', pk: 'id' },
    { name: 'OrderItem', pk: 'id' },
    { name: 'OrderPayment', pk: 'id' },
    { name: 'Expense', pk: 'id' },
    { name: 'CashMovement', pk: 'id' },
    { name: 'CreditObligation', pk: 'id' },
    { name: 'CreditPayment', pk: 'id' },
    { name: 'SystemSetting', pk: 'key' },
    { name: 'ChatConversation', pk: 'id' },
    { name: 'ChatMessage', pk: 'id' },
    { name: 'WhatsAppAuthSession', pk: 'id' },
    { name: 'RecurringSchedule', pk: 'id' },
    { name: 'CrmQuickReply', pk: 'id' },
  ];

  const tablesData = [];
  for (const { name, pk } of tableDefs) {
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${name}"`);
      tablesData.push({ name, rows, pk });
    } catch (err) {
      console.warn(`⚠️ Tabla "${name}" omitida o no encontrada: ${err.message}`);
    }
  }

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

  for (const { name, rows, pk } of tablesData) {
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    sql += `-- Tabla: ${name} (${rows.length} registros)\n`;
    for (const row of rows) {
      const values = cols.map((c) => escapeSql(row[c])).join(', ');
      sql += `INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${values}) ON CONFLICT ("${pk}") DO UPDATE SET ${cols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')};\n`;
    }
    if (pk === 'id' && typeof rows[0].id === 'number') {
      sql += `SELECT setval(pg_get_serial_sequence('"${name}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${name}";\n\n`;
    } else {
      sql += `\n`;
    }
  }

  fs.writeFileSync(filepath, sql, 'utf8');

  console.log(`\n✅ ¡Copia de seguridad guardada exitosamente!`);
  console.log(`📁 Archivo: ${filepath}`);
  console.log(`📊 Resumen respaldado:`);
  for (const { name, rows } of tablesData) {
    console.log(`   - ${name}: ${rows.length} registros`);
  }
}

runBackup()
  .catch((err) => {
    console.error('❌ Error al generar la copia de seguridad:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
