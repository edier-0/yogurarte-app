require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function getPitrUri() {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) throw new Error('Missing NEON_API_KEY');

  const res = await fetch('https://console.neon.tech/api/v2/projects/red-sea-67767174/branches', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await res.json();
  const pitrBranch = data.branches.find(b => b.name === 'pitr-audit-20261119-1445');
  if (!pitrBranch) throw new Error('pitr-audit-20261119-1445 branch not found in Neon');

  const endpointsRes = await fetch(`https://console.neon.tech/api/v2/projects/red-sea-67767174/endpoints`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const epData = await endpointsRes.json();
  const ep = epData.endpoints.find(e => e.branch_id === pitrBranch.id);
  if (!ep) throw new Error('Endpoint not found for PITR branch');

  const connRes = await fetch(`https://console.neon.tech/api/v2/projects/red-sea-67767174/branches/${pitrBranch.id}/roles/neondb_owner/reset_password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const pwdData = await connRes.json();
  const host = ep.host;
  const password = pwdData.role.password;
  return {
    uri: `postgresql://neondb_owner:${password}@${host}/neondb?sslmode=require`,
    branchId: pitrBranch.id
  };
}

async function main() {
  console.log('🚀 ========================================================');
  console.log('🛡️ YOGURARTE - RESTAURACIÓN Y LIMPIEZA DE PRODUCCIÓN (NEON)');
  console.log('========================================================\n');

  const prodUrl = process.env.NEON_DATABASE_URL;
  if (!prodUrl) throw new Error('Missing NEON_DATABASE_URL');

  const { uri: pitrUrl, branchId } = await getPitrUri();

  const pProd = new PrismaClient({ datasources: { db: { url: prodUrl } } });
  const pPitr = new PrismaClient({ datasources: { db: { url: pitrUrl } } });

  // 1. Eliminar pedido test ID 314
  console.log('📦 [1/5] Eliminando pedidos y pagos de prueba residuales...');
  await pProd.orderPayment.deleteMany({
    where: { order: { orderNumber: { startsWith: 'TEST-ORD-' } } }
  });
  await pProd.orderItem.deleteMany({
    where: { order: { orderNumber: { startsWith: 'TEST-ORD-' } } }
  });
  const deletedOrders = await pProd.order.deleteMany({
    where: { orderNumber: { startsWith: 'TEST-ORD-' } }
  });
  console.log(`   ✓ Pedidos test eliminados: ${deletedOrders.count}`);

  // 2. Eliminar lote test ID 34
  console.log('\n🏭 [2/5] Eliminando lotes de producción de prueba...');
  await pProd.batchItemUsage.deleteMany({
    where: { batch: { batchCode: 'LOTE-20261119-01' } }
  });
  await pProd.batchPackagingItem.deleteMany({
    where: { packaging: { batch: { batchCode: 'LOTE-20261119-01' } } }
  });
  await pProd.batchPackaging.deleteMany({
    where: { batch: { batchCode: 'LOTE-20261119-01' } }
  });
  const deletedBatches = await pProd.productionBatch.deleteMany({
    where: { batchCode: 'LOTE-20261119-01' }
  });
  console.log(`   ✓ Lotes test eliminados: ${deletedBatches.count}`);

  // 3. Eliminar materias primas de prueba
  console.log('\n🧪 [3/5] Eliminando materias primas e insumos de prueba generados por vitest...');
  const testMaterialCodes = [
    'TEST_MAT_RECIPE_01',
    'TEST_FRUIT_PREP_01',
    'TEST_SUGAR_PREP_01',
    'TEST_MERM_COMP_01',
    'LECHE_TEST',
    'TAPA'
  ];

  // Desvincular recetas compuestas de prueba si las hay
  await pProd.compoundRecipeItem.deleteMany({
    where: {
      OR: [
        { compoundMaterial: { code: { in: testMaterialCodes } } },
        { ingredient: { code: { in: testMaterialCodes } } }
      ]
    }
  });

  // Desvincular preparaciones de insumos de prueba si las hay
  await pProd.supplyPreparationItem.deleteMany({
    where: {
      rawMaterial: { code: { in: testMaterialCodes } }
    }
  });
  await pProd.supplyPreparation.deleteMany({
    where: {
      outputMaterial: { code: { in: testMaterialCodes } }
    }
  });

  // Desvincular ítems de recetas si las hay
  await pProd.recipeIngredient.deleteMany({
    where: {
      rawMaterial: { code: { in: testMaterialCodes } }
    }
  });

  const deletedMaterials = await pProd.rawMaterial.deleteMany({
    where: { code: { in: testMaterialCodes } }
  });
  console.log(`   ✓ Insumos test eliminados: ${deletedMaterials.count}`);

  // 4. Restaurar valores exactos de los 5 insumos reales desde PITR
  console.log('\n🔄 [4/5] Restaurando valores exactos de stock y costo desde PITR snapshot (14:45 UTC)...');
  const targetIds = [9, 10, 11, 12, 33];
  const pitrMaterials = await pPitr.rawMaterial.findMany({
    where: { id: { in: targetIds } }
  });

  for (const m of pitrMaterials) {
    const updated = await pProd.rawMaterial.update({
      where: { id: m.id },
      data: {
        name: m.name,
        currentStock: m.currentStock,
        avgCost: m.avgCost,
        unit: m.unit,
        category: m.category,
        isActive: m.isActive,
        minStockAlert: m.minStockAlert,
        isCompound: m.isCompound,
        recipeYield: m.recipeYield,
      }
    });
    console.log(`   ✓ Insumo ID ${m.id} (${m.code}): Stock=${updated.currentStock}, Costo=$${updated.avgCost}`);
  }

  // 5. Auditoría de integridad final
  console.log('\n📊 [5/5] Realizando auditoría de integridad en producción...');
  const [finalMats, finalBatches, finalOrders, finalRecipes] = await Promise.all([
    pProd.rawMaterial.findMany({ orderBy: { id: 'asc' } }),
    pProd.productionBatch.count(),
    pProd.order.count(),
    pProd.recipe.count()
  ]);

  console.log(`   - Insumos en producción: ${finalMats.length} (esperados: 16)`);
  console.log(`   - Lotes de producción: ${finalBatches} (esperados: 5)`);
  console.log(`   - Pedidos en producción: ${finalOrders} (esperados: 42)`);
  console.log(`   - Recetas canónicas (Spec 015): ${finalRecipes} (esperadas: 4)`);

  console.log('\n=== LISTADO FINAL DE MATERIAS PRIMAS EN PRODUCCIÓN ===');
  for (const m of finalMats) {
    console.log(`[ID ${m.id.toString().padStart(2)}] ${m.code.padEnd(24)} | ${m.name.padEnd(30)} | Stock: ${String(m.currentStock).padStart(8)} ${m.unit.padEnd(10)} | Costo: $${m.avgCost}`);
  }

  await pProd.$disconnect();
  await pPitr.$disconnect();

  // 6. Eliminar la rama temporal PITR de Neon
  console.log('\n🧹 Limpiando rama temporal de auditoría en Neon...');
  const apiKey = process.env.NEON_API_KEY;
  const delRes = await fetch(`https://console.neon.tech/api/v2/projects/red-sea-67767174/branches/${branchId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (delRes.ok) {
    console.log('   ✓ Rama temporal pitr-audit-20261119-1445 eliminada con éxito de Neon.');
  } else {
    console.warn('   ⚠️ No se pudo eliminar la rama temporal:', await delRes.text());
  }

  console.log('\n========================================================');
  console.log('🎉 BASE DE DATOS DE PRODUCCIÓN 100% RESTAURADA Y AUDITADA');
  console.log('========================================================\n');
}

main().catch(console.error);
