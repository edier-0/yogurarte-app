const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: { db: { url: neonUrl } },
});

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position
  `;
  
  const tablesMap = {};
  for (const row of tables) {
    if (!tablesMap[row.table_name]) tablesMap[row.table_name] = [];
    tablesMap[row.table_name].push(row.column_name);
  }

  console.log('Tablas y Columnas en Neon DB:');
  for (const [tbl, cols] of Object.entries(tablesMap)) {
    console.log(`\n• ${tbl} (${cols.length} columnas):`);
    console.log(`  ${cols.join(', ')}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
