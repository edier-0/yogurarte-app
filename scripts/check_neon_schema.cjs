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
