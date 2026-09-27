const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const batches = await prisma.productionBatch.findMany({
    include: {
      packagings: true,
      orders: { select: { id: true, orderNumber: true, totalLiters: true } },
      orderItems: { select: { id: true, orderId: true, totalLiters: true, packagingId: true } },
      discharges: { select: { id: true, totalLiters: true, packagingId: true } },
    }
  });
  console.log('=== BATCHES ===');
  for (const b of batches) {
    console.log({
      id: b.id,
      batchCode: b.batchCode,
      flavor: b.flavor,
      status: b.status,
      totalLitersProduced: b.totalLitersProduced,
      packagedLiters: b.packagedLiters,
      packagings: b.packagings.map(p => ({ id: p.id, code: p.packagingCode, liters: p.totalLiters })),
      orders: b.orders,
      orderItemsCount: b.orderItems.length,
      discharges: b.discharges
    });
  }

  const orders = await prisma.order.findMany({
    include: {
      items: true
    }
  });
  console.log('=== ORDERS ===');
  for (const o of orders) {
    console.log({
      id: o.id,
      orderNumber: o.orderNumber,
      deliveryStatus: o.deliveryStatus,
      batchId: o.batchId,
      items: o.items.map(i => ({ id: i.id, batchId: i.batchId, packagingId: i.packagingId, liters: i.totalLiters }))
    });
  }

  await prisma.$disconnect();
}

inspect().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
