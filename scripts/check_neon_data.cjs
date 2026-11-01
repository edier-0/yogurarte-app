// ==============================================================================
// 🚨 ADVERTENCIA DE SEGURIDAD (DIRECTIVA ESTRICTA YOGURARTE):
// QUEDA TERMINANTEMENTE PROHIBIDO COLOCAR CREDENCIALES O STRINGS DE CONEXIÓN
// HARDCODEADOS EN ESTE ARCHIVO (INCLUYENDO VALORES POR DEFECTO O FALLBACKS '||').
// Todas las conexiones deben suministrarse ÚNICAMENTE mediante variables de
// entorno (.env / NEON_DATABASE_URL) que NUNCA deben subirse a Git.
// ==============================================================================
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const neonUrl = process.env.NEON_DATABASE_URL;
if (!neonUrl) {
  console.error('\n❌ ERROR DE SEGURIDAD: La variable NEON_DATABASE_URL no está configurada en .env.');
  console.error('   Está terminantemente prohibido hardcodear credenciales en el código fuente.\n');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });

async function check() {
  const batches = await prisma.productionBatch.findMany({
    include: {
      packagings: true,
      discharges: true,
      itemsUsed: true,
    },
  });
  console.log('=== BATCHES IN NEON ===');
  console.log(JSON.stringify(batches, null, 2));

  const packagings = await prisma.batchPackaging.findMany({
    include: {
      itemsUsed: true,
    },
  });
  console.log('=== PACKAGINGS IN NEON ===');
  console.log(JSON.stringify(packagings, null, 2));

  const discharges = await prisma.batchDischarge.findMany();
  console.log('=== DISCHARGES IN NEON ===');
  console.log(JSON.stringify(discharges, null, 2));

  const rawMaterials = await prisma.rawMaterial.findMany({
    select: { id: true, code: true, name: true, currentStock: true, unit: true, isActive: true },
    orderBy: { id: 'asc' },
  });
  console.log('=== RAW MATERIALS IN NEON ===');
  console.log(JSON.stringify(rawMaterials, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
