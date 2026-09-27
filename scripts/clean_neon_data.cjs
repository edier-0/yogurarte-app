const { PrismaClient } = require('@prisma/client');
const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_MdRA0BL9FvQS@ep-delicate-haze-axco5iq8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';
const prisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });

async function runCleanup() {
  console.log('--- INICIANDO LIMPIEZA ATÓMICA EN NEON DB ---');

  // 1. Verificar y desvincular pedidos u orderItems si apuntan a batchId 26 o packagingId 1
  const ordersLinked = await prisma.order.findMany({
    where: { batchId: 26 }
  });
  console.log(`Pedidos vinculados encontrados: ${ordersLinked.length}`);
  if (ordersLinked.length > 0) {
    await prisma.order.updateMany({
      where: { batchId: 26 },
      data: { batchId: null }
    });
    console.log('Pedidos desvinculados correctamente.');
  }

  const orderItemsLinked = await prisma.orderItem.findMany({
    where: { OR: [{ batchId: 26 }, { packagingId: 1 }] }
  });
  console.log(`Items de pedidos vinculados encontrados: ${orderItemsLinked.length}`);
  if (orderItemsLinked.length > 0) {
    await prisma.orderItem.updateMany({
      where: { OR: [{ batchId: 26 }, { packagingId: 1 }] },
      data: { batchId: null, packagingId: null }
    });
    console.log('Items de pedidos desvinculados correctamente.');
  }

  // 2. Eliminar Retiro de Socio / Despacho asociado (id: 7 o para batch 26 / packaging 1)
  const deletedDischarges = await prisma.batchDischarge.deleteMany({
    where: { OR: [{ id: 7 }, { batchId: 26 }, { packagingId: 1 }] }
  });
  console.log(`Retiros de socio / descargues eliminados: ${deletedDischarges.count}`);

  // 3. Eliminar Lote de Fase B (BatchPackaging id: 1)
  const deletedPackagings = await prisma.batchPackaging.deleteMany({
    where: { OR: [{ id: 1 }, { batchId: 26 }] }
  });
  console.log(`Lotes Fase B (packaging) eliminados: ${deletedPackagings.count}`);

  // 4. Eliminar consumos de insumos del lote madre Fase A (BatchItemUsage)
  const deletedItemUsages = await prisma.batchItemUsage.deleteMany({
    where: { batchId: 26 }
  });
  console.log(`Consumos de insumos eliminados: ${deletedItemUsages.count}`);

  // 5. Eliminar Lote de Fase A (ProductionBatch id: 26)
  const deletedBatches = await prisma.productionBatch.deleteMany({
    where: { id: 26 }
  });
  console.log(`Lotes Fase A eliminados: ${deletedBatches.count}`);

  // 6. Restaurar stocks de insumos a sus valores antes del cambio
  // Valores originales confirmados en auditoría previa:
  // LECHE: 0.00 L
  // BOTELLA_1L: 0.00 Und
  // BOTELLA_2L: 0.00 Und
  // ETIQUETA: 0.00 Und
  // AZUCAR_DE_KILO_RIO_P: 0.00 Kg
  // LECHE_EN_POLVO_DE_LA: 2.724 Kg
  // AREQUIPE: 0.00 Kg
  // YOGURT_GRIEGO: 0.00 Kg
  // MERMELADA_FRESA: 0.00 Kg
  const stockResets = [
    { code: 'LECHE', stock: 0 },
    { code: 'BOTELLA_1L', stock: 0 },
    { code: 'BOTELLA_2L', stock: 0 },
    { code: 'ETIQUETA', stock: 0 },
    { code: 'AZUCAR_DE_KILO_RIO_P', stock: 0 },
    { code: 'LECHE_EN_POLVO_DE_LA', stock: 2.724 },
    { code: 'AREQUIPE', stock: 0 },
    { code: 'YOGURT_GRIEGO', stock: 0 },
    { code: 'MERMELADA_FRESA', stock: 0 }
  ];

  for (const item of stockResets) {
    await prisma.rawMaterial.updateMany({
      where: { code: item.code },
      data: { currentStock: item.stock }
    });
  }
  console.log('Stocks restaurados a los valores previos exactos.');

  // 7. Verificación final de estado en Neon DB
  const remainingBatches = await prisma.productionBatch.findMany();
  const remainingPackagings = await prisma.batchPackaging.findMany();
  const remainingDischarges = await prisma.batchDischarge.findMany();
  const rawMaterials = await prisma.rawMaterial.findMany({
    select: { id: true, code: true, name: true, currentStock: true, unit: true, isActive: true },
    orderBy: { id: 'asc' }
  });

  console.log('\n=== ESTADO FINAL EN NEON DB ===');
  console.log(`Lotes Fase A activos en Neon: ${remainingBatches.length}`);
  console.log(`Lotes Fase B activos en Neon: ${remainingPackagings.length}`);
  console.log(`Retiros de socio / descargues en Neon: ${remainingDischarges.length}`);
  console.log('Insumos y stocks vigentes:');
  console.table(rawMaterials.map(rm => ({
    ID: rm.id,
    Código: rm.code,
    Nombre: rm.name,
    Stock: rm.currentStock,
    Unidad: rm.unit,
    Activo: rm.isActive
  })));

  await prisma.$disconnect();
  console.log('\n--- LIMPIEZA FINALIZADA CON ÉXITO ---');
}

runCleanup().catch(async (e) => {
  console.error('Error durante la limpieza en Neon:', e);
  await prisma.$disconnect();
  process.exit(1);
});
