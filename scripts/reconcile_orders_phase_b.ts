import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { syncBatchStatusBidirectional } from '../src/modules/batches/batches.service.js';

// Si se pasa flag --remote o --neon, usar NEON_DATABASE_URL o la URL de producción de Neon
const neonDefault = 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const isRemote = process.argv.includes('--remote') || process.argv.includes('--neon');
const dbUrl = isRemote
  ? (process.env.NEON_DATABASE_URL || neonDefault)
  : (process.env.DATABASE_URL || neonDefault);

console.log(`\n======================================================`);
console.log(`   RECONCILIACIÓN DE PEDIDOS Y LOTES FASE B`);
console.log(`   Modo: ${isRemote ? 'REMOTA / NEON' : 'LOCAL'}`);
console.log(`   Target DB: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);
console.log(`======================================================\n`);

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  // 1. Obtener todas las fracciones envasadas de Fase B
  const packagings = await prisma.batchPackaging.findMany({
    include: {
      batch: true,
    },
    orderBy: { packagedAt: 'desc' },
  });

  console.log(`Fracciones envasadas registradas en el sistema: ${packagings.length}`);
  for (const p of packagings) {
    console.log(`  - Fracción #${p.id} (${p.packagingCode || 'Sin código'}) · Sabor: "${p.flavor}" · Lote Madre #${p.batchId} (${p.batch?.batchCode || 'N/A'}) · Total: ${p.totalLiters}L`);
  }

  // 2. Buscar pedidos activos (no cancelados) con items
  const activeOrders = await prisma.order.findMany({
    where: {
      deliveryStatus: { not: 'CANCELLED' },
    },
    include: {
      items: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`\nPedidos activos a examinar: ${activeOrders.length}`);

  let itemsReconciledCount = 0;
  let ordersReconciledHeaderCount = 0;
  const affectedBatchIds = new Set<number>();

  for (const order of activeOrders) {
    let orderChanged = false;

    for (const item of order.items) {
      // Si el ítem ya tiene packagingId, verificar consistencia de batchId
      if (item.packagingId) {
        const pkg = packagings.find((p) => p.id === item.packagingId);
        if (pkg && item.batchId !== pkg.batchId) {
          console.log(`[CORRECCIÓN] Item #${item.id} (Pedido #${order.orderNumber}): Corrigiendo batchId ${item.batchId} -> ${pkg.batchId} según fracción #${pkg.id}`);
          if (!isDryRun) {
            await prisma.orderItem.update({
              where: { id: item.id },
              data: { batchId: pkg.batchId },
            });
          }
          affectedBatchIds.add(pkg.batchId);
          itemsReconciledCount++;
        }
        continue;
      }

      // Si packagingId es null, buscar fracción que coincida por sabor
      const itemFlavorClean = (item.flavor || '').trim().toLowerCase();
      if (!itemFlavorClean) continue;

      let matchedPkg = null;

      // Prioridad 1: si el ítem ya tiene batchId, buscar fracción de ese mismo lote y sabor
      if (item.batchId) {
        matchedPkg = packagings.find(
          (p) => p.batchId === item.batchId && p.flavor.trim().toLowerCase() === itemFlavorClean
        );
      }

      // Prioridad 2: buscar fracción activa por sabor
      if (!matchedPkg) {
        matchedPkg = packagings.find(
          (p) => p.flavor.trim().toLowerCase() === itemFlavorClean
        );
      }

      if (matchedPkg) {
        console.log(`[VINCULACIÓN] Item #${item.id} (Pedido #${order.orderNumber}): Sabor "${item.flavor}" (${item.quantity}x ${item.bottleSize}) -> Asignando a Fracción #${matchedPkg.id} (${matchedPkg.packagingCode || matchedPkg.flavor}) de Lote #${matchedPkg.batchId}`);
        if (!isDryRun) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              packagingId: matchedPkg.id,
              batchId: matchedPkg.batchId,
            },
          });
        }
        affectedBatchIds.add(matchedPkg.batchId);
        itemsReconciledCount++;
        orderChanged = true;
      }
    }

    // 3. Verificar si el pedido puede sincronizar su batchId de cabecera
    const currentItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
    });
    const itemBatches = Array.from(new Set(currentItems.map((i) => i.batchId).filter(Boolean))) as number[];
    if (itemBatches.length === 1 && order.batchId !== itemBatches[0]) {
      console.log(`[CABECERA] Pedido #${order.orderNumber}: Sincronizando order.batchId -> ${itemBatches[0]}`);
      if (!isDryRun) {
        await prisma.order.update({
          where: { id: order.id },
          data: { batchId: itemBatches[0] },
        });
      }
      affectedBatchIds.add(itemBatches[0]);
      ordersReconciledHeaderCount++;
    }
  }

  // 4. Sincronizar estado de los lotes afectados
  if (!isDryRun && affectedBatchIds.size > 0) {
    console.log(`\nSincronizando balances y estados de ${affectedBatchIds.size} lote(s) afectado(s)...`);
    for (const bId of affectedBatchIds) {
      await syncBatchStatusBidirectional(prisma, bId);
    }
  }

  console.log(`\n======================================================`);
  console.log(`   RESUMEN DE RECONCILIACIÓN`);
  console.log(`======================================================`);
  console.log(`- Modo simulación (Dry Run): ${isDryRun ? 'SÍ (Sin cambios en BD)' : 'NO (Cambios aplicados)'}`);
  console.log(`- Ítems de comanda reconciliados / vinculados: ${itemsReconciledCount}`);
  console.log(`- Cabeceras de comanda sincronizadas: ${ordersReconciledHeaderCount}`);
  console.log(`- Lotes actualizados y re-balanceados: ${affectedBatchIds.size}`);
  console.log(`======================================================\n`);
}

main()
  .catch((err) => {
    console.error('Error durante la reconciliación:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
