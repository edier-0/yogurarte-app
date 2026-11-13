import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const projectRoot = 'c:/Users/edier/Documents/YOGURES';
const req = createRequire(path.join(projectRoot, 'package.json'));
const { PrismaClient } = req('@prisma/client');

// Read connection URLs
let targetUrl = '';
let sourceUrl = process.env.PITR_DATABASE_URL || '';

const pitrFile = path.join(projectRoot, '.pitr_connection.txt');
if (fs.existsSync(pitrFile)) {
  sourceUrl = fs.readFileSync(pitrFile, 'utf8').trim();
}

const envContent = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8');
for (const line of envContent.split('\n')) {
  if (line.startsWith('NEON_DATABASE_URL=')) {
    targetUrl = line.substring('NEON_DATABASE_URL='.length).trim();
    if (targetUrl.startsWith('"') && targetUrl.endsWith('"')) {
      targetUrl = targetUrl.slice(1, -1);
    }
  }
}

if (!sourceUrl || !targetUrl) {
  console.error('❌ ERROR: Se requieren sourceUrl (PITR) y targetUrl (Neon Prod).');
  process.exit(1);
}

const pSource = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const pTarget = new PrismaClient({ datasources: { db: { url: targetUrl } } });

async function main() {
  console.log('🚀 ========================================================');
  console.log('🔄 YOGURARTE - RESTAURACIÓN COMPLETA DESDE NEON PITR (18:00 UTC)');
  console.log('========================================================\n');

  // 1. Limpieza de datos demo residuales en producción
  console.log('🧹 [1/5] Limpiando datos demo erróneos en la base activa de producción...');
  
  await pTarget.orderPayment.deleteMany({
    where: { order: { orderNumber: { startsWith: 'PED-DEMO-' } } }
  });
  await pTarget.orderItem.deleteMany({
    where: { order: { orderNumber: { startsWith: 'PED-DEMO-' } } }
  });
  await pTarget.order.deleteMany({
    where: { orderNumber: { startsWith: 'PED-DEMO-' } }
  });

  await pTarget.chatMessage.deleteMany({
    where: { messageId: { in: ['DEMO-MSG-01', 'DEMO-MSG-02'] } }
  });
  await pTarget.chatConversation.deleteMany({
    where: { remoteJid: '573001234567@s.whatsapp.net' }
  });

  await pTarget.cashMovement.deleteMany({
    where: {
      concept: {
        in: [
          'Apertura de Caja Menor (Efectivo físico)',
          'Saldo Inicial en Banco / Nequi'
        ]
      }
    }
  });

  await pTarget.expense.deleteMany({
    where: {
      description: {
        in: [
          'Bolsas biodegradables y cinta para empaque',
          'Cuota Inicial: Congelador Panorámico 200L (Refrigeración La Guajira)'
        ]
      }
    }
  });

  await pTarget.creditPayment.deleteMany({
    where: { credit: { title: 'Congelador Panorámico 200L' } }
  });
  await pTarget.creditObligation.deleteMany({
    where: { title: 'Congelador Panorámico 200L' }
  });

  await pTarget.batchPackaging.deleteMany({
    where: { packagingCode: { in: ['FRAC-DEMO-FRESA', 'FRAC-DEMO-NATURAL'] } }
  });
  await pTarget.productionBatch.deleteMany({
    where: { batchCode: { in: ['LOTE-DEMO-INCUBATING', 'LOTE-DEMO-COMPLETED'] } }
  });

  await pTarget.customer.deleteMany({
    where: { id: { in: [165, 166] } }
  });

  console.log('   ✓ Registros demo eliminados exitosamente.');

  // 2. Extraer datos históricos de la rama PITR
  console.log('\n📥 [2/5] Extrayendo todos los registros históricos de la rama restaurada...');
  const [
    customers,
    materials,
    batches,
    packagings,
    orders,
    orderItems,
    orderPayments,
    cashMovements,
    expenses,
    credits,
    creditPayments
  ] = await Promise.all([
    pSource.customer.findMany(),
    pSource.rawMaterial.findMany(),
    pSource.productionBatch.findMany(),
    pSource.batchPackaging.findMany(),
    pSource.order.findMany(),
    pSource.orderItem.findMany(),
    pSource.orderPayment.findMany(),
    pSource.cashMovement.findMany(),
    pSource.expense.findMany(),
    pSource.creditObligation.findMany(),
    pSource.creditPayment.findMany()
  ]);

  console.log(`   - Clientes: ${customers.length}`);
  console.log(`   - Insumos: ${materials.length}`);
  console.log(`   - Lotes de producción: ${batches.length}`);
  console.log(`   - Fracciones de envasado: ${packagings.length}`);
  console.log(`   - Pedidos: ${orders.length}`);
  console.log(`   - Ítems de pedidos: ${orderItems.length}`);
  console.log(`   - Pagos de pedidos: ${orderPayments.length}`);
  console.log(`   - Movimientos de caja: ${cashMovements.length}`);
  console.log(`   - Gastos: ${expenses.length}`);
  console.log(`   - Créditos: ${credits.length}`);

  // 3. Restauración de entidades maestras (Clientes, Insumos, Lotes)
  console.log('\n📤 [3/5] Restaurando clientes, materias primas y lotes de producción...');
  
  for (const c of customers) {
    await pTarget.customer.upsert({
      where: { id: c.id },
      update: c,
      create: c
    });
  }

  for (const m of materials) {
    await pTarget.rawMaterial.upsert({
      where: { code: m.code },
      update: m,
      create: m
    });
  }

  for (const b of batches) {
    await pTarget.productionBatch.upsert({
      where: { id: b.id },
      update: b,
      create: b
    });
  }

  for (const p of packagings) {
    await pTarget.batchPackaging.upsert({
      where: { id: p.id },
      update: p,
      create: p
    });
  }

  // 4. Restauración de transacciones operacionales (Pedidos, Pagos, Caja, Gastos)
  console.log('\n🛒 [4/5] Restaurando pedidos, pagos, movimientos de caja y créditos...');

  for (const o of orders) {
    await pTarget.order.upsert({
      where: { id: o.id },
      update: o,
      create: o
    });
  }

  for (const item of orderItems) {
    await pTarget.orderItem.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  for (const pay of orderPayments) {
    await pTarget.orderPayment.upsert({
      where: { id: pay.id },
      update: pay,
      create: pay
    });
  }

  for (const cm of cashMovements) {
    await pTarget.cashMovement.upsert({
      where: { id: cm.id },
      update: cm,
      create: cm
    });
  }

  for (const exp of expenses) {
    await pTarget.expense.upsert({
      where: { id: exp.id },
      update: exp,
      create: exp
    });
  }

  for (const cred of credits) {
    await pTarget.creditObligation.upsert({
      where: { id: cred.id },
      update: cred,
      create: cred
    });
  }

  for (const cp of creditPayments) {
    await pTarget.creditPayment.upsert({
      where: { id: cp.id },
      update: cp,
      create: cp
    });
  }

  // 5. Verificación final y auditoría
  console.log('\n📊 [5/5] Realizando auditoría de integridad...');
  const [
    finalOrders,
    finalPayments,
    finalItems,
    finalCash,
    finalExpenses,
    finalCustomers,
    finalTemplates
  ] = await Promise.all([
    pTarget.order.count(),
    pTarget.orderPayment.count(),
    pTarget.orderItem.count(),
    pTarget.cashMovement.count(),
    pTarget.expense.count(),
    pTarget.customer.count(),
    pTarget.systemWhatsAppTemplate.count()
  ]);

  console.log('\n========================================================');
  console.log('🎉 RESTAURACIÓN COMPLETADA CON ÉXITO');
  console.log(`   - Pedidos en producción: ${finalOrders} / ${orders.length} esperados`);
  console.log(`   - Pagos de pedidos: ${finalPayments} / ${orderPayments.length} esperados`);
  console.log(`   - Ítems de pedidos: ${finalItems} / ${orderItems.length} esperados`);
  console.log(`   - Movimientos de caja: ${finalCash} / ${cashMovements.length} esperados`);
  console.log(`   - Gastos operativos: ${finalExpenses} / ${expenses.length} esperados`);
  console.log(`   - Clientes registrados: ${finalCustomers} / ${customers.length} esperados`);
  console.log(`   - Plantillas de WhatsApp (Spec 014): ${finalTemplates} (intactas)`);
  console.log('========================================================\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await pSource.$disconnect();
    await pTarget.$disconnect();
  });
