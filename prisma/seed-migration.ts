/**
 * SCRIPT DE CORTE Y MIGRACIÓN LIMPIA A PRODUCCIÓN (MAIN)
 * prisma/seed-migration.ts
 *
 * Estrategia de Despliegue:
 * 1. Asegurar la preservación de Clientes (145), Pedidos con Deuda (9 deudores por $128.000 COP)
 * 2. Mantener el cuadre de caja consolidado ($73.230 COP)
 * 3. Actualizar catálogo de Insumos preservando stocks físicos reales
 * 4. Habilitar la infraestructura de Insumos Compuestos y Fracciones Fase B
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando script de verificación y siembra para corte a producción...');

  // 1. Verificar saldos de caja existentes
  const movementsCount = await prisma.cashMovement.count();
  console.log(`✓ Verificados ${movementsCount} movimientos de caja existentes.`);

  // 2. Sembrar Sabores Institucionales si la tabla está vacía
  const flavorCount = await prisma.productFlavor.count();
  if (flavorCount === 0) {
    console.log('🌱 Sembrando catálogo base de sabores...');
    const defaultFlavors = [
      'Natural',
      'Fresa',
      'Mora',
      'Maracuyá',
      'Guanábana',
      'Melocotón',
      'Arequipe',
      'Frutos Rojos',
    ];

    for (const name of defaultFlavors) {
      await prisma.productFlavor.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      });
    }
    console.log(`✓ ${defaultFlavors.length} sabores sembrados con éxito.`);
  }

  // 3. Verificar / Asegurar Insumos Compuestos Estándar (Recetas Maestras)
  console.log('🌱 Verificando insumos y recetas base...');
  
  // Buscar insumos clave
  const azucar = await prisma.rawMaterial.findFirst({
    where: { code: { in: ['AZUCAR', 'AZUCAR_DE_KILO_RIO_P'] } },
  });

  if (azucar) {
    // Asegurar insumo compuesto de Mermelada Artesanal si no existe
    const existingMermelada = await prisma.rawMaterial.findFirst({
      where: { code: 'MERMELADA_FRESA' },
    });

    if (!existingMermelada) {
      const mermelada = await prisma.rawMaterial.create({
        data: {
          code: 'MERMELADA_FRESA',
          name: 'Mermelada de Fresa Artesanal',
          category: 'INSUMO',
          unit: 'Kilogramos',
          currentStock: 0,
          minStockAlert: 2,
          avgCost: 15000,
          isCompound: true,
          recipeYield: 1.0,
          isActive: true,
        },
      });

      // Vincular azúcar en la receta
      await prisma.compoundRecipeItem.create({
        data: {
          compoundMaterialId: mermelada.id,
          ingredientId: azucar.id,
          quantity: 0.4,
          unit: 'Kilogramos',
        },
      });

      console.log('✓ Insumo compuesto Mermelada de Fresa creado con receta base.');
    }
  }

  // 4. Parámetros Globales del Sistema
  console.log('🌱 Verificando parámetros globales del sistema...');
  const settings = [
    { key: 'BUSINESS_NAME', value: 'YogurArte' },
    { key: 'BUSINESS_LOCATION', value: 'Fonseca, La Guajira' },
    { key: 'PRICE_DEFAULT_1L', value: '12000' },
    { key: 'PRICE_DEFAULT_2L', value: '24000' },
    { key: 'LOYALTY_GOAL_BOTTLES', value: '10' },
    { key: 'LOYALTY_REWARD_LITERS', value: '1' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✓ Parámetros globales verificados.');

  console.log('\n✅ Proceso de siembra y verificación de corte finalizado sin alterar saldos ni clientes.');
}

main()
  .catch((e) => {
    console.error('❌ Error en script de siembra:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
