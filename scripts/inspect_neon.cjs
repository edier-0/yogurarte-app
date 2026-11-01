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
const prisma = new PrismaClient({
  datasources: {
    db: { url: neonUrl }
  }
});

async function inspect() {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      batch: true
    }
  });
  console.log('=== NEON ORDERS ===');
  for (const o of orders) {
    console.log({
      id: o.id,
      orderNumber: o.orderNumber,
      deliveryStatus: o.deliveryStatus,
      batchId: o.batchId,
      batchCode: o.batch?.batchCode,
      flavor: o.flavor,
      totalLiters: o.totalLiters,
      items: o.items.map(i => ({
        id: i.id,
        batchId: i.batchId,
        packagingId: i.packagingId,
        flavor: i.flavor,
        liters: i.totalLiters
      }))
    });
  }

  const batches = await prisma.productionBatch.findMany({
    include: { packagings: true }
  });
  console.log('=== NEON BATCHES ===');
  console.log(batches);

  await prisma.$disconnect();
}

inspect().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
