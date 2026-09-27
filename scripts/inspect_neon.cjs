const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require' }
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
