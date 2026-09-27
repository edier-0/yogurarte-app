const { PrismaClient } = require('@prisma/client');
const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
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
